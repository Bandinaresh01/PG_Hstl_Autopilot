"""
Booking Domain Service & Data Access Layer
Provides persistent reservation management, move-in tracking,
and booking pipeline statistics for UrbanNest Hostel CRM.
"""

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone, date

logger = logging.getLogger("booking_service")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
BOOKINGS_FILE = os.path.join(DATA_DIR, "bookings.json")
_lock = threading.Lock()

DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"

DEFAULT_BOOKINGS = [
    {
        "id": "BK-1081",
        "hostel_id": DEMO_HOSTEL_ID,
        "enquiry_id": None,
        "tenant_id": None,
        "room_id": "RM-204",
        "bed_id": None,
        "booking_code": "BK-1081",
        "booking_date": "2026-09-22",
        "expected_move_in_date": "2026-10-01",
        "booking_status": "CONFIRMED",
        "payment_status": "PARTIAL",
        "monthly_rent": 8500.0,
        "security_deposit": 8500.0,
        "booking_amount": 2000.0,
        "notes": "Working professional at Hitec City. Requested 2nd floor bed near window.",
        "created_at": "2026-09-22T10:00:00+00:00",
        "updated_at": "2026-09-22T10:00:00+00:00"
    },
    {
        "id": "BK-1082",
        "hostel_id": DEMO_HOSTEL_ID,
        "enquiry_id": None,
        "tenant_id": None,
        "room_id": "RM-201",
        "bed_id": None,
        "booking_code": "BK-1082",
        "booking_date": "2026-09-23",
        "expected_move_in_date": "2026-09-28",
        "booking_status": "CONFIRMED",
        "payment_status": "PAID",
        "monthly_rent": 14000.0,
        "security_deposit": 14000.0,
        "booking_amount": 3000.0,
        "notes": "Senior UI Engineer at Deloitte. Requested quiet wing on 2nd floor with study desk.",
        "created_at": "2026-09-23T11:30:00+00:00",
        "updated_at": "2026-09-23T11:30:00+00:00"
    },
    {
        "id": "BK-1083",
        "hostel_id": DEMO_HOSTEL_ID,
        "enquiry_id": None,
        "tenant_id": None,
        "room_id": "RM-101",
        "bed_id": None,
        "booking_code": "BK-1083",
        "booking_date": "2026-09-24",
        "expected_move_in_date": "2026-10-05",
        "booking_status": "PENDING",
        "payment_status": "UNPAID",
        "monthly_rent": 6500.0,
        "security_deposit": 6500.0,
        "booking_amount": 1500.0,
        "notes": "Awaiting parent confirmation call. Scheduled hostel walkthrough this weekend.",
        "created_at": "2026-09-24T14:15:00+00:00",
        "updated_at": "2026-09-24T14:15:00+00:00"
    }
]


class BookingService:
    def __init__(self, db_client=None):
        self.db = db_client
        os.makedirs(DATA_DIR, exist_ok=True)
        self._init_storage()

    def _init_storage(self):
        with _lock:
            if not os.path.exists(BOOKINGS_FILE):
                with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_BOOKINGS, f, indent=2)

    def _read_local(self) -> list:
        try:
            with open(BOOKINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_BOOKINGS.copy()

    def _write_local(self, data: list):
        with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_bookings(self, hostel_id: str, status: str = None) -> list:
        bookings = []
        if self.db:
            try:
                query = self.db.table("bookings").select("*").eq("hostel_id", hostel_id)
                if status and status.upper() != "ALL":
                    query = query.eq("booking_status", status.upper())
                res = query.order("created_at", desc=True).execute()
                bookings = res.data or []
            except Exception as e:
                if "PGRST205" not in str(e):
                    logger.warning(f"Supabase bookings fetch error: {e}")

        if not bookings:
            all_b = self._read_local()
            bookings = [b for b in all_b if b.get("hostel_id") == hostel_id]
            if status and status.upper() != "ALL":
                bookings = [b for b in bookings if b.get("booking_status") == status.upper()]

        return bookings

    def get_booking_by_id(self, booking_id: str, hostel_id: str) -> dict:
        bookings = self.get_bookings(hostel_id)
        for b in bookings:
            if str(b.get("id")) == str(booking_id) or str(b.get("booking_code")) == str(booking_id):
                return b
        return None

    def create_booking(self, hostel_id: str, data: dict) -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        booking_code = f"BK-{uuid.uuid4().hex[:4].upper()}"

        new_b = {
            "id": booking_code,
            "hostel_id": hostel_id,
            "enquiry_id": data.get("enquiry_id"),
            "tenant_id": data.get("tenant_id"),
            "room_id": data.get("room_id"),
            "bed_id": data.get("bed_id"),
            "booking_code": booking_code,
            "booking_date": data.get("booking_date") or date.today().isoformat(),
            "expected_move_in_date": data.get("expected_move_in_date"),
            "booking_status": data.get("booking_status", "PENDING"),
            "payment_status": data.get("payment_status", "UNPAID"),
            "monthly_rent": float(data.get("monthly_rent") or 8500.0),
            "security_deposit": float(data.get("security_deposit") or 8500.0),
            "booking_amount": float(data.get("booking_amount") or 2000.0),
            "notes": data.get("notes", ""),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        with _lock:
            bookings = self._read_local()
            bookings.append(new_b)
            self._write_local(bookings)

        if self.db:
            try:
                self.db.table("bookings").insert(new_b).execute()
            except Exception as e:
                logger.warning(f"Supabase booking insertion sync warning: {e}")

        return new_b

    def update_booking_status(self, hostel_id: str, booking_id: str, booking_status: str, payment_status: str = None) -> dict:
        valid_statuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED", "COMPLETED"]
        b_status = booking_status.upper()
        if b_status not in valid_statuses:
            raise ValueError(f"Invalid booking status {booking_status}. Allowed: {valid_statuses}")

        now_iso = datetime.now(timezone.utc).isoformat()
        updated = None

        with _lock:
            bookings = self._read_local()
            for b in bookings:
                if (str(b.get("id")) == str(booking_id) or str(b.get("booking_code")) == str(booking_id)) and b.get("hostel_id") == hostel_id:
                    b["booking_status"] = b_status
                    if payment_status:
                        b["payment_status"] = payment_status.upper()
                    b["updated_at"] = now_iso
                    updated = b
                    break
            if updated:
                self._write_local(bookings)

        if self.db and updated:
            try:
                update_fields = {"booking_status": b_status, "updated_at": now_iso}
                if payment_status:
                    update_fields["payment_status"] = payment_status.upper()
                self.db.table("bookings").update(update_fields).eq("id", updated["id"]).execute()
            except Exception as e:
                logger.warning(f"Supabase booking update sync warning: {e}")

        return updated

    def get_stats(self, hostel_id: str) -> dict:
        bookings = self.get_bookings(hostel_id)
        total = len(bookings)
        confirmed = sum(1 for b in bookings if b.get("booking_status") == "CONFIRMED")
        pending = sum(1 for b in bookings if b.get("booking_status") == "PENDING")

        today_str = date.today().isoformat()
        upcoming = [
            b for b in bookings
            if b.get("booking_status") in ["CONFIRMED", "PENDING"]
            and b.get("expected_move_in_date")
            and str(b.get("expected_move_in_date")) >= today_str
        ]

        return {
            "total_bookings": total,
            "confirmed_bookings": confirmed,
            "pending_bookings": pending,
            "upcoming_bookings_count": len(upcoming),
            "upcoming_bookings": upcoming
        }


_booking_service_instance = None


def get_booking_service(db_client=None) -> BookingService:
    global _booking_service_instance
    if _booking_service_instance is None:
        _booking_service_instance = BookingService(db_client)
    elif db_client and not _booking_service_instance.db:
        _booking_service_instance.db = db_client
    return _booking_service_instance
