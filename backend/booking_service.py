"""
Booking Domain Service & Supabase Data Access Layer
Provides persistent booking reservation management, status transitions,
and occupancy conversion for UrbanNest Hostel CRM.
"""

import logging
import uuid
from datetime import datetime, timezone, date

from room_service import get_room_service

logger = logging.getLogger("booking_service")


class BookingService:
    def __init__(self, db_client=None):
        self.db = db_client

    def get_bookings(self, hostel_id: str, status: str = None) -> list:
        """
        List all bookings for a hostel from Supabase public.bookings.
        Enriches with room_number, bed_code, and tenant_name.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("bookings").select("*").eq("hostel_id", hostel_id)
            if status and status.upper() != "ALL":
                query = query.eq("booking_status", status.upper())

            res = query.order("created_at", desc=True).execute()
            bookings = res.data or []

            # Enrich with room, bed, and tenant details
            room_service = get_room_service(self.db)
            rooms = room_service.get_rooms(hostel_id)
            room_map = {str(r.get("id")): r for r in rooms}
            bed_map = {}
            for r in rooms:
                for b in r.get("beds", []):
                    bed_map[str(b.get("id"))] = (r, b)

            enriched = []
            for b in bookings:
                b_copy = dict(b)
                r_id = str(b_copy.get("room_id")) if b_copy.get("room_id") else None
                bed_id = str(b_copy.get("bed_id")) if b_copy.get("bed_id") else None

                if bed_id and bed_id in bed_map:
                    r_obj, bed_obj = bed_map[bed_id]
                    b_copy["room_number"] = r_obj.get("room_number")
                    b_copy["bed_code"] = bed_obj.get("bed_code")
                elif r_id and r_id in room_map:
                    r_obj = room_map[r_id]
                    b_copy["room_number"] = r_obj.get("room_number")
                    b_copy["bed_code"] = "-"
                else:
                    b_copy["room_number"] = b_copy.get("room_number") or "-"
                    b_copy["bed_code"] = b_copy.get("bed_code") or "-"

                enriched.append(b_copy)

            return enriched

        except Exception as e:
            logger.error(f"Error fetching bookings from Supabase: {e}")
            return []

    def get_booking_by_id(self, booking_id: str, hostel_id: str) -> dict:
        """
        Get a single booking by UUID or booking_code.
        """
        bookings = self.get_bookings(hostel_id)
        for b in bookings:
            if str(b.get("id")) == str(booking_id) or str(b.get("booking_code")) == str(booking_id):
                return b
        return None

    def create_booking(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new booking reservation in Supabase public.bookings.
        Optionally reserves the selected bed.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        booking_code = f"BK-{uuid.uuid4().hex[:6].upper()}"
        booking_date = data.get("booking_date") or date.today().isoformat()
        expected_move_in_date = data.get("expected_move_in_date") or booking_date
        booking_status = str(data.get("booking_status", "CONFIRMED")).upper()
        payment_status = str(data.get("payment_status", "PAID")).upper()

        room_id = data.get("room_id")
        bed_id = data.get("bed_id")

        # Reserve bed if bed_id provided
        if bed_id:
            room_service = get_room_service(self.db)
            room_service.update_bed_status(hostel_id, bed_id, "RESERVED")

        booking_payload = {
            "hostel_id": hostel_id,
            "enquiry_id": data.get("enquiry_id") or None,
            "tenant_id": data.get("tenant_id") or None,
            "room_id": room_id or None,
            "bed_id": bed_id or None,
            "booking_code": booking_code,
            "booking_date": booking_date,
            "expected_move_in_date": expected_move_in_date,
            "booking_status": booking_status,
            "payment_status": payment_status,
            "monthly_rent": float(data.get("monthly_rent") or 8500.0),
            "security_deposit": float(data.get("security_deposit") or 8500.0),
            "booking_amount": float(data.get("booking_amount") or 5000.0),
            "notes": data.get("notes") or None,
        }

        res = self.db.table("bookings").insert(booking_payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError(f"Failed to create booking reservation: {booking_code}")

        logger.info(f"Successfully created booking {booking_code} in Supabase")
        return res.data[0]

    def update_booking_status(self, hostel_id: str, booking_id: str, new_status: str) -> dict:
        """
        Update booking status (CONFIRMED, CHECKED_IN, CANCELLED, etc.).
        If CANCELLED: releases reserved bed to AVAILABLE.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        booking = self.get_booking_by_id(booking_id, hostel_id)
        if not booking:
            raise ValueError(f"Booking {booking_id} not found.")

        valid_statuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED", "COMPLETED"]
        new_status = new_status.upper()
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid booking status {new_status}. Allowed: {valid_statuses}")

        now_iso = datetime.now(timezone.utc).isoformat()

        # If cancelled, release bed
        if new_status == "CANCELLED" and booking.get("bed_id"):
            room_service = get_room_service(self.db)
            room_service.update_bed_status(hostel_id, booking["bed_id"], "AVAILABLE")

        res = (
            self.db.table("bookings")
            .update({"booking_status": new_status, "updated_at": now_iso})
            .eq("id", booking["id"])
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else booking

    def get_stats(self, hostel_id: str) -> dict:
        """
        Return booking reservation metrics for owner dashboard.
        Upcoming move-ins: CONFIRMED bookings with expected_move_in_date >= today.
        """
        bookings = self.get_bookings(hostel_id)
        total_bookings = len(bookings)
        today = date.today()
        today_str = today.isoformat()

        upcoming_move_ins = []
        for b in bookings:
            st = str(b.get("booking_status", "")).upper()
            if st in ("CONFIRMED", "PENDING"):
                move_in_raw = str(b.get("expected_move_in_date") or "").split("T")[0]
                days_left = 0
                formatted_date = move_in_raw or "Upcoming"
                if move_in_raw:
                    try:
                        m_date = datetime.strptime(move_in_raw, "%Y-%m-%d").date()
                        if m_date < today:
                            continue  # Past date
                        days_left = (m_date - today).days
                        formatted_date = m_date.strftime("%b %d, %Y")
                    except Exception:
                        pass

                r_num = str(b.get("room_number") or "-")
                if not r_num.startswith("Room ") and r_num != "-":
                    r_num = f"Room {r_num}"

                upcoming_move_ins.append({
                    "id": b.get("id"),
                    "booking_code": b.get("booking_code"),
                    "guest_name": b.get("guest_name") or b.get("name") or "Resident",
                    "name": b.get("guest_name") or b.get("name") or "Resident",
                    "room": r_num,
                    "room_number": r_num,
                    "bed": b.get("bed_code") or "-",
                    "bed_code": b.get("bed_code") or "-",
                    "expected_move_in_date": move_in_raw,
                    "move_in_date": move_in_raw,
                    "formatted_date": formatted_date,
                    "days_remaining": days_left,
                    "booking_status": st,
                })

        upcoming_move_ins.sort(key=lambda x: x["days_remaining"])

        return {
            "total_bookings": total_bookings,
            "upcoming_bookings_count": len(upcoming_move_ins),
            "upcoming_bookings": upcoming_move_ins,
            "upcoming_move_ins": upcoming_move_ins,
        }


_booking_service_instance = None


def get_booking_service(db_client=None) -> BookingService:
    global _booking_service_instance
    if _booking_service_instance is None:
        _booking_service_instance = BookingService(db_client)
    elif db_client:
        _booking_service_instance.db = db_client
    return _booking_service_instance
