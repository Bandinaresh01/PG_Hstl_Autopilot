"""
Room & Bed Domain Service & Supabase Data Access Layer
Provides persistent, relational room and bed inventory management,
bed occupancy tracking, and relational integrity for UrbanNest Hostel CRM.
"""

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("room_service")


class RoomService:
    def __init__(self, db_client=None):
        self.db = db_client

    def get_rooms(self, hostel_id: str) -> list:
        """
        List all rooms for a hostel with nested beds and calculated occupancy statistics.
        Directly queries Supabase PostgreSQL tables: public.rooms and public.beds.
        """
        if not self.db:
            return []

        try:
            res_r = (
                self.db.table("rooms")
                .select("*")
                .eq("hostel_id", hostel_id)
                .order("floor")
                .order("room_number")
                .execute()
            )
            rooms = res_r.data or []

            res_b = (
                self.db.table("beds")
                .select("*")
                .eq("hostel_id", hostel_id)
                .order("bed_code")
                .execute()
            )
            beds = res_b.data or []

            # Group beds by room_id
            beds_by_room = {}
            for b in beds:
                r_id = str(b.get("room_id"))
                if r_id not in beds_by_room:
                    beds_by_room[r_id] = []
                beds_by_room[r_id].append(b)

            result = []
            for r in rooms:
                r_id = str(r.get("id"))
                room_beds = beds_by_room.get(r_id, [])
                total_beds = len(room_beds)
                occupied = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "OCCUPIED")
                available = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "AVAILABLE")
                reserved = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "RESERVED")
                maintenance = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "MAINTENANCE")

                room_copy = dict(r)
                room_copy["beds"] = room_beds
                room_copy["total_beds"] = total_beds
                room_copy["occupied_beds"] = occupied
                room_copy["available_beds"] = available
                room_copy["reserved_beds"] = reserved
                room_copy["maintenance_beds"] = maintenance
                result.append(room_copy)

            return result

        except Exception as e:
            logger.error(f"Error fetching rooms from Supabase: {e}")
            return []

    def get_room_by_id(self, room_id: str, hostel_id: str) -> dict:
        """
        Retrieve a single room by UUID or room number.
        """
        rooms = self.get_rooms(hostel_id)
        for r in rooms:
            if str(r.get("id")) == str(room_id) or str(r.get("room_number")) == str(room_id):
                return r
        return None

    def create_room(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new room in public.rooms and auto-generate its bed records in public.beds.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        room_number = str(data.get("room_number", "")).strip()
        if not room_number:
            raise ValueError("Room number is required.")

        room_type = str(data.get("room_type", "DOUBLE")).upper()
        if room_type not in ["SINGLE", "DOUBLE", "TRIPLE"]:
            room_type = "DOUBLE"

        capacity_map = {"SINGLE": 1, "DOUBLE": 2, "TRIPLE": 3}
        capacity = int(data.get("capacity") or capacity_map.get(room_type, 2))
        monthly_rent = float(data.get("monthly_rent") or 8500.0)
        security_deposit = float(data.get("security_deposit") or monthly_rent)
        floor = int(data.get("floor") or (int(room_number[0]) if room_number and room_number[0].isdigit() else 1))

        # Check unique room number in hostel
        existing = (
            self.db.table("rooms")
            .select("id")
            .eq("hostel_id", hostel_id)
            .eq("room_number", room_number)
            .limit(1)
            .execute()
        )
        if existing.data and len(existing.data) > 0:
            raise ValueError(f"Room {room_number} already exists in this hostel.")

        room_payload = {
            "hostel_id": hostel_id,
            "room_number": room_number,
            "room_type": room_type,
            "floor": floor,
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "capacity": capacity,
            "status": data.get("status", "ACTIVE"),
        }

        res_room = self.db.table("rooms").insert(room_payload).execute()
        if not res_room.data or len(res_room.data) == 0:
            raise RuntimeError(f"Failed to insert room {room_number}")

        created_room = res_room.data[0]
        room_uuid = created_room["id"]

        # Auto-generate beds for the room
        letters = ["A", "B", "C", "D", "E"]
        generated_beds = []
        for i in range(capacity):
            bed_code = f"Bed {letters[i]}"
            bed_payload = {
                "hostel_id": hostel_id,
                "room_id": room_uuid,
                "bed_code": bed_code,
                "status": "AVAILABLE",
            }
            res_bed = self.db.table("beds").insert(bed_payload).execute()
            if res_bed.data and len(res_bed.data) > 0:
                generated_beds.append(res_bed.data[0])

        created_room["beds"] = generated_beds
        created_room["total_beds"] = len(generated_beds)
        created_room["available_beds"] = len(generated_beds)
        created_room["occupied_beds"] = 0
        created_room["reserved_beds"] = 0
        created_room["maintenance_beds"] = 0

        logger.info(f"Successfully created room {room_number} (UUID: {room_uuid}) with {len(generated_beds)} beds.")
        return created_room

    def add_bed(self, hostel_id: str, room_id: str, bed_code: str) -> dict:
        """
        Add an additional bed to an existing room.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        bed_code = bed_code.strip()
        if not bed_code:
            raise ValueError("Bed code is required.")

        # Ensure room exists
        room = self.get_room_by_id(room_id, hostel_id)
        if not room:
            raise ValueError(f"Room {room_id} not found.")

        room_uuid = room["id"]
        bed_payload = {
            "hostel_id": hostel_id,
            "room_id": room_uuid,
            "bed_code": bed_code,
            "status": "AVAILABLE",
        }

        res = self.db.table("beds").insert(bed_payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError(f"Failed to add bed {bed_code} to room {room['room_number']}")

        return res.data[0]

    def update_bed_status(self, hostel_id: str, bed_id: str, new_status: str) -> dict:
        """
        Update the status of a bed (AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, UNAVAILABLE).
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        valid_statuses = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE", "UNAVAILABLE"]
        new_status = new_status.upper()
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status {new_status}. Allowed: {valid_statuses}")

        now_iso = datetime.now(timezone.utc).isoformat()

        # Update by bed UUID
        res = (
            self.db.table("beds")
            .update({"status": new_status, "updated_at": now_iso})
            .eq("id", bed_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]

        # If bed_id was bed_code, query by bed_code
        res_code = (
            self.db.table("beds")
            .update({"status": new_status, "updated_at": now_iso})
            .eq("bed_code", bed_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        if res_code.data and len(res_code.data) > 0:
            return res_code.data[0]

        return None

    def get_stats(self, hostel_id: str) -> dict:
        """
        Return room & bed statistics for owner dashboard.
        """
        rooms = self.get_rooms(hostel_id)
        total_rooms = len(rooms)
        total_beds = sum(r.get("total_beds", 0) for r in rooms)
        occupied_beds = sum(r.get("occupied_beds", 0) for r in rooms)
        available_beds = sum(r.get("available_beds", 0) for r in rooms)
        reserved_beds = sum(r.get("reserved_beds", 0) for r in rooms)
        maintenance_beds = sum(r.get("maintenance_beds", 0) for r in rooms)
        occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

        return {
            "total_rooms": total_rooms,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "reserved_beds": reserved_beds,
            "maintenance_beds": maintenance_beds,
            "occupancy_rate": occupancy_rate,
        }


_room_service_instance = None


def get_room_service(db_client=None) -> RoomService:
    global _room_service_instance
    if _room_service_instance is None:
        _room_service_instance = RoomService(db_client)
    elif db_client:
        _room_service_instance.db = db_client
    return _room_service_instance
