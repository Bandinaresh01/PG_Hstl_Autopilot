"""
Room & Bed Domain Service & Data Access Layer
Provides persistent, relational room and bed inventory management,
bed occupancy tracking, and transactional consistency for UrbanNest Hostel CRM.
"""

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("room_service")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ROOMS_FILE = os.path.join(DATA_DIR, "rooms.json")
BEDS_FILE = os.path.join(DATA_DIR, "beds.json")
_lock = threading.Lock()

DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"

DEFAULT_ROOMS = [
    {
        "id": "RM-101",
        "hostel_id": DEMO_HOSTEL_ID,
        "room_number": "101",
        "room_type": "TRIPLE",
        "floor": 1,
        "monthly_rent": 6500.0,
        "security_deposit": 6500.0,
        "capacity": 3,
        "status": "ACTIVE",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "RM-102",
        "hostel_id": DEMO_HOSTEL_ID,
        "room_number": "102",
        "room_type": "DOUBLE",
        "floor": 1,
        "monthly_rent": 8500.0,
        "security_deposit": 8500.0,
        "capacity": 2,
        "status": "ACTIVE",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "RM-201",
        "hostel_id": DEMO_HOSTEL_ID,
        "room_number": "201",
        "room_type": "SINGLE",
        "floor": 2,
        "monthly_rent": 14000.0,
        "security_deposit": 14000.0,
        "capacity": 1,
        "status": "ACTIVE",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "RM-204",
        "hostel_id": DEMO_HOSTEL_ID,
        "room_number": "204",
        "room_type": "DOUBLE",
        "floor": 2,
        "monthly_rent": 8500.0,
        "security_deposit": 8500.0,
        "capacity": 2,
        "status": "ACTIVE",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "RM-301",
        "hostel_id": DEMO_HOSTEL_ID,
        "room_number": "301",
        "room_type": "TRIPLE",
        "floor": 3,
        "monthly_rent": 7000.0,
        "security_deposit": 7000.0,
        "capacity": 3,
        "status": "ACTIVE",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    }
]

DEFAULT_BEDS = [
    # Room 101 Beds (Triple)
    {"id": "BED-101A", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-101", "bed_code": "Bed A", "status": "OCCUPIED", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-101B", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-101", "bed_code": "Bed B", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-101C", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-101", "bed_code": "Bed C", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},

    # Room 102 Beds (Double)
    {"id": "BED-102A", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-102", "bed_code": "Bed A", "status": "RESERVED", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-102B", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-102", "bed_code": "Bed B", "status": "OCCUPIED", "created_at": "2026-09-01T00:00:00+00:00"},

    # Room 201 Bed (Single)
    {"id": "BED-201A", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-201", "bed_code": "Bed A", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},

    # Room 204 Beds (Double)
    {"id": "BED-204A", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-204", "bed_code": "Bed A", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-204B", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-204", "bed_code": "Bed B", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},

    # Room 301 Beds (Triple)
    {"id": "BED-301A", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-301", "bed_code": "Bed A", "status": "MAINTENANCE", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-301B", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-301", "bed_code": "Bed B", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"},
    {"id": "BED-301C", "hostel_id": DEMO_HOSTEL_ID, "room_id": "RM-301", "bed_code": "Bed C", "status": "AVAILABLE", "created_at": "2026-09-01T00:00:00+00:00"}
]


class RoomService:
    def __init__(self, db_client=None):
        self.db = db_client
        os.makedirs(DATA_DIR, exist_ok=True)
        self._init_storage()

    def _init_storage(self):
        with _lock:
            if not os.path.exists(ROOMS_FILE):
                with open(ROOMS_FILE, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_ROOMS, f, indent=2)
            if not os.path.exists(BEDS_FILE):
                with open(BEDS_FILE, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_BEDS, f, indent=2)

    def _read_local_rooms(self) -> list:
        try:
            with open(ROOMS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_ROOMS.copy()

    def _write_local_rooms(self, data: list):
        with open(ROOMS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def _read_local_beds(self) -> list:
        try:
            with open(BEDS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_BEDS.copy()

    def _write_local_beds(self, data: list):
        with open(BEDS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_rooms(self, hostel_id: str) -> list:
        """
        List all rooms for a hostel with nested beds and calculated occupancy statistics.
        """
        rooms = []
        beds = []

        # 1. Try Supabase
        if self.db:
            try:
                res_r = self.db.table("rooms").select("*").eq("hostel_id", hostel_id).execute()
                res_b = self.db.table("beds").select("*").eq("hostel_id", hostel_id).execute()
                rooms = res_r.data or []
                beds = res_b.data or []
            except Exception as e:
                if "PGRST205" not in str(e):
                    logger.warning(f"Supabase rooms fetch error: {e}")

        # 2. Fallback to local store
        if not rooms:
            all_rooms = self._read_local_rooms()
            rooms = [r for r in all_rooms if r.get("hostel_id") == hostel_id]
            all_beds = self._read_local_beds()
            beds = [b for b in all_beds if b.get("hostel_id") == hostel_id]

        # Group beds by room_id
        beds_by_room = {}
        for b in beds:
            r_id = b.get("room_id")
            if r_id not in beds_by_room:
                beds_by_room[r_id] = []
            beds_by_room[r_id].append(b)

        result = []
        for r in rooms:
            r_id = r.get("id")
            room_beds = beds_by_room.get(r_id, [])
            total_beds = len(room_beds)
            occupied = sum(1 for b in room_beds if b.get("status") == "OCCUPIED")
            available = sum(1 for b in room_beds if b.get("status") == "AVAILABLE")
            reserved = sum(1 for b in room_beds if b.get("status") == "RESERVED")
            maintenance = sum(1 for b in room_beds if b.get("status") == "MAINTENANCE")

            room_copy = dict(r)
            room_copy["beds"] = room_beds
            room_copy["total_beds"] = total_beds
            room_copy["occupied_beds"] = occupied
            room_copy["available_beds"] = available
            room_copy["reserved_beds"] = reserved
            room_copy["maintenance_beds"] = maintenance
            result.append(room_copy)

        # Sort by room_number ascending
        result.sort(key=lambda x: str(x.get("room_number", "")))
        return result

    def get_room_by_id(self, room_id: str, hostel_id: str) -> dict:
        rooms = self.get_rooms(hostel_id)
        for r in rooms:
            if str(r.get("id")) == str(room_id):
                return r
        return None

    def create_room(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new room and automatically generate corresponding beds according to capacity.
        """
        room_number = str(data.get("room_number", "")).strip().replace("Room ", "")
        if not room_number:
            raise ValueError("Room number is required.")

        room_type = str(data.get("room_type", "DOUBLE")).upper()
        if room_type not in ["SINGLE", "DOUBLE", "TRIPLE"]:
            room_type = "DOUBLE"

        capacity_map = {"SINGLE": 1, "DOUBLE": 2, "TRIPLE": 3}
        capacity = int(data.get("capacity") or capacity_map.get(room_type, 2))
        monthly_rent = float(data.get("monthly_rent") or 8500.0)
        security_deposit = float(data.get("security_deposit") or monthly_rent)
        floor = int(data.get("floor") or (int(room_number[0]) if room_number[0].isdigit() else 1))

        now_iso = datetime.now(timezone.utc).isoformat()
        room_id = f"RM-{room_number}"

        new_room = {
            "id": room_id,
            "hostel_id": hostel_id,
            "room_number": room_number,
            "room_type": room_type,
            "floor": floor,
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "capacity": capacity,
            "status": "ACTIVE",
            "created_at": now_iso,
            "updated_at": now_iso
        }

        # Auto-generate beds
        letters = ["A", "B", "C", "D", "E"]
        generated_beds = []
        for i in range(capacity):
            code = f"Bed {letters[i]}"
            b_id = f"BED-{room_number}{letters[i]}"
            generated_beds.append({
                "id": b_id,
                "hostel_id": hostel_id,
                "room_id": room_id,
                "bed_code": code,
                "status": "AVAILABLE",
                "created_at": now_iso,
                "updated_at": now_iso
            })

        # Persist to local JSON
        with _lock:
            rooms = self._read_local_rooms()
            # Check unique room number in hostel
            if any(r.get("hostel_id") == hostel_id and str(r.get("room_number")) == room_number for r in rooms):
                raise ValueError(f"Room {room_number} already exists in this hostel.")
            rooms.append(new_room)
            self._write_local_rooms(rooms)

            beds = self._read_local_beds()
            beds.extend(generated_beds)
            self._write_local_beds(beds)

        # Sync to Supabase
        if self.db:
            try:
                self.db.table("rooms").insert(new_room).execute()
                for b in generated_beds:
                    self.db.table("beds").insert(b).execute()
            except Exception as e:
                logger.warning(f"Supabase room creation sync warning: {e}")

        new_room["beds"] = generated_beds
        new_room["total_beds"] = len(generated_beds)
        new_room["available_beds"] = len(generated_beds)
        new_room["occupied_beds"] = 0
        return new_room

    def add_bed(self, hostel_id: str, room_id: str, bed_code: str) -> dict:
        """
        Add an additional bed to a room.
        """
        bed_code = bed_code.strip()
        if not bed_code:
            raise ValueError("Bed code is required.")

        now_iso = datetime.now(timezone.utc).isoformat()
        bed_id = f"BED-{uuid.uuid4().hex[:8].upper()}"

        new_bed = {
            "id": bed_id,
            "hostel_id": hostel_id,
            "room_id": room_id,
            "bed_code": bed_code,
            "status": "AVAILABLE",
            "created_at": now_iso,
            "updated_at": now_iso
        }

        with _lock:
            beds = self._read_local_beds()
            if any(b.get("room_id") == room_id and b.get("bed_code") == bed_code for b in beds):
                raise ValueError(f"Bed {bed_code} already exists in this room.")
            beds.append(new_bed)
            self._write_local_beds(beds)

        if self.db:
            try:
                self.db.table("beds").insert(new_bed).execute()
            except Exception as e:
                logger.warning(f"Supabase bed insertion sync warning: {e}")

        return new_bed

    def update_bed_status(self, hostel_id: str, bed_id: str, new_status: str) -> dict:
        """
        Update the status of a bed (AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE, UNAVAILABLE).
        """
        valid_statuses = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE", "UNAVAILABLE"]
        new_status = new_status.upper()
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status {new_status}. Allowed: {valid_statuses}")

        now_iso = datetime.now(timezone.utc).isoformat()
        updated = None

        with _lock:
            beds = self._read_local_beds()
            for b in beds:
                if (str(b.get("id")) == str(bed_id) or str(b.get("bed_code")) == str(bed_id)) and b.get("hostel_id") == hostel_id:
                    b["status"] = new_status
                    b["updated_at"] = now_iso
                    updated = b
                    break
            if updated:
                self._write_local_beds(beds)

        if self.db and updated:
            try:
                self.db.table("beds").update({"status": new_status, "updated_at": now_iso}).eq("id", updated["id"]).execute()
            except Exception as e:
                logger.warning(f"Supabase bed status update sync warning: {e}")

        return updated

    def get_stats(self, hostel_id: str) -> dict:
        """
        Return high-performance room & bed statistics for dashboard.
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
            "occupancy_rate": occupancy_rate
        }


_room_service_instance = None


def get_room_service(db_client=None) -> RoomService:
    global _room_service_instance
    if _room_service_instance is None:
        _room_service_instance = RoomService(db_client)
    elif db_client and not _room_service_instance.db:
        _room_service_instance.db = db_client
    return _room_service_instance
