"""
Room, Floor & Bed Domain Service & Supabase Data Access Layer
Provides persistent, relational property configuration (Hostel -> Floors -> Rooms -> Beds),
capacity safety guards, bed occupancy tracking, and rent pricing management for UrbanNest Hostel CRM.
"""

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("room_service")


class RoomService:
    def __init__(self, db_client=None):
        self.db = db_client

    # =========================================================================
    # 1. FLOORS MANAGEMENT
    # =========================================================================

    def get_floors(self, hostel_id: str, rooms: list = None) -> list:
        """
        List all floors for a hostel with aggregated room & bed occupancy statistics.
        Gracefully handles environments where floors table is native in Supabase,
        as well as legacy schema cache fallback from rooms.floor.
        """
        if not self.db:
            return []

        floors = []
        try:
            res_f = (
                self.db.table("floors")
                .select("*")
                .eq("hostel_id", hostel_id)
                .order("display_order")
                .order("floor_number")
                .execute()
            )
            floors = res_f.data or []
        except Exception as e:
            logger.warning(f"Could not query floors table directly ({e}), falling back to room floor synthesis.")
            floors = []

        if rooms is None:
            rooms = self.get_rooms(hostel_id)
        rooms_by_floor_id = {}
        rooms_by_floor_num = {}

        for r in rooms:
            f_id = str(r.get("floor_id") or "").strip()
            try:
                f_num = int(r.get("floor")) if r.get("floor") is not None else 1
            except (ValueError, TypeError):
                f_num = 1

            if f_id:
                rooms_by_floor_id.setdefault(f_id, []).append(r)
            rooms_by_floor_num.setdefault(f_num, []).append(r)

        # If floors table is empty or missing, synthesize floors from rooms
        if not floors:
            distinct_floors = sorted(list(rooms_by_floor_num.keys()))
            if not distinct_floors:
                distinct_floors = [0, 1, 2]
            elif 0 not in distinct_floors and min(distinct_floors) > 0:
                # Include Ground floor in list if missing
                distinct_floors = sorted([0] + distinct_floors)

            for f_num in distinct_floors:
                f_name = self._default_floor_name(f_num)
                floors.append({
                    "id": f"floor-{f_num}",
                    "hostel_id": hostel_id,
                    "floor_number": f_num,
                    "floor_name": f_name,
                    "display_order": f_num,
                    "status": "ACTIVE",
                    "is_synthesized": True,
                })

        # Enrich each floor with its rooms & bed counts
        result = []
        for f in floors:
            f_id = str(f.get("id"))
            try:
                f_num = int(f.get("floor_number")) if f.get("floor_number") is not None else None
            except (ValueError, TypeError):
                f_num = None

            floor_rooms = rooms_by_floor_id.get(f_id)
            if not floor_rooms and f_num is not None:
                floor_rooms = rooms_by_floor_num.get(f_num)
            floor_rooms = floor_rooms or []

            total_beds = sum(r.get("total_beds", 0) for r in floor_rooms)
            occupied = sum(r.get("occupied_beds", 0) for r in floor_rooms)
            available = sum(r.get("available_beds", 0) for r in floor_rooms)
            reserved = sum(r.get("reserved_beds", 0) for r in floor_rooms)
            maintenance = sum(r.get("maintenance_beds", 0) for r in floor_rooms)

            f_copy = dict(f)
            f_copy["rooms_count"] = len(floor_rooms)
            f_copy["total_beds"] = total_beds
            f_copy["occupied_beds"] = occupied
            f_copy["available_beds"] = available
            f_copy["reserved_beds"] = reserved
            f_copy["maintenance_beds"] = maintenance
            f_copy["occupancy_rate"] = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0
            f_copy["rooms"] = floor_rooms
            result.append(f_copy)

        return result

    def get_floor_by_id(self, floor_id: str, hostel_id: str) -> dict:
        """Retrieve a single floor by UUID or floor_number."""
        floors = self.get_floors(hostel_id)
        for f in floors:
            if str(f.get("id")) == str(floor_id) or str(f.get("floor_number")) == str(floor_id):
                return f
        return None

    def create_floor(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new floor record in public.floors.
        Validates unique floor_number within the hostel.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        raw_num = data.get("floor_number")
        if raw_num is None or str(raw_num).strip() == "":
            raise ValueError("Floor number is required.")

        try:
            floor_number = int(raw_num)
        except ValueError:
            raise ValueError(f"Invalid floor number '{raw_num}'. Must be an integer (e.g. 0, 1, 2).")

        floor_name = (data.get("floor_name") or "").strip()
        if not floor_name:
            floor_name = self._default_floor_name(floor_number)

        display_order = int(data.get("display_order") if data.get("display_order") is not None else floor_number)
        status = str(data.get("status", "ACTIVE")).upper()
        if status not in ("ACTIVE", "INACTIVE", "MAINTENANCE"):
            status = "ACTIVE"

        # Check for duplicate floor_number in this hostel
        existing_floors = self.get_floors(hostel_id)
        for ef in existing_floors:
            if ef.get("floor_number") == floor_number and not ef.get("is_synthesized"):
                raise ValueError(f"Floor {floor_number} already exists in this hostel.")

        floor_payload = {
            "hostel_id": hostel_id,
            "floor_number": floor_number,
            "floor_name": floor_name,
            "display_order": display_order,
            "status": status,
        }

        try:
            res = self.db.table("floors").insert(floor_payload).execute()
            if res.data and len(res.data) > 0:
                created = res.data[0]
                created["rooms_count"] = 0
                created["total_beds"] = 0
                created["occupied_beds"] = 0
                created["available_beds"] = 0
                created["rooms"] = []
                logger.info(f"Created floor {floor_number} ({floor_name}) with ID {created.get('id')}")
                return created
        except Exception as e:
            logger.error(f"Error inserting into floors table: {e}")
            raise RuntimeError(f"Failed to create floor in database: {str(e)}")

        raise RuntimeError("Failed to create floor: empty response from database.")

    def update_floor(self, hostel_id: str, floor_id: str, data: dict) -> dict:
        """Update floor name, display_order, or status."""
        if not self.db:
            raise RuntimeError("Database client not available")

        updates = {}
        if "floor_name" in data and data["floor_name"]:
            updates["floor_name"] = str(data["floor_name"]).strip()
        if "display_order" in data and data["display_order"] is not None:
            updates["display_order"] = int(data["display_order"])
        if "status" in data and data["status"]:
            st = str(data["status"]).upper()
            if st in ("ACTIVE", "INACTIVE", "MAINTENANCE"):
                updates["status"] = st

        if not updates:
            return self.get_floor_by_id(floor_id, hostel_id)

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        try:
            res = (
                self.db.table("floors")
                .update(updates)
                .eq("id", floor_id)
                .eq("hostel_id", hostel_id)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.error(f"Error updating floor {floor_id}: {e}")
            raise RuntimeError(f"Failed to update floor: {str(e)}")

        return self.get_floor_by_id(floor_id, hostel_id)

    def _default_floor_name(self, floor_number: int) -> str:
        """Helper to name floors intuitively."""
        if floor_number == 0:
            return "Ground Floor"
        elif floor_number == 1:
            return "First Floor"
        elif floor_number == 2:
            return "Second Floor"
        elif floor_number == 3:
            return "Third Floor"
        elif floor_number == 4:
            return "Fourth Floor"
        elif floor_number < 0:
            return f"Basement {abs(floor_number)}"
        else:
            return f"Floor {floor_number}"

    # =========================================================================
    # 2. ROOMS MANAGEMENT
    # =========================================================================

    def get_rooms(self, hostel_id: str, floor_id: str = None) -> list:
        """
        List all rooms for a hostel with nested beds, floor context,
        and current active tenant assignments.
        """
        if not self.db:
            return []

        try:
            # Query rooms
            query_r = self.db.table("rooms").select("*").eq("hostel_id", hostel_id)
            if floor_id:
                query_r = query_r.eq("floor_id", floor_id)
            res_r = query_r.order("floor").order("room_number").execute()
            rooms = res_r.data or []

            # Query beds
            res_b = (
                self.db.table("beds")
                .select("*")
                .eq("hostel_id", hostel_id)
                .order("bed_code")
                .execute()
            )
            beds = res_b.data or []

            # Query active tenants to attach tenant names to occupied beds
            res_t = (
                self.db.table("tenants")
                .select("id, full_name, tenant_code, phone, room_id, bed_id, status")
                .eq("hostel_id", hostel_id)
                .eq("status", "ACTIVE")
                .execute()
            )
            tenants = res_t.data or []
            tenants_by_bed = {str(t.get("bed_id")): t for t in tenants if t.get("bed_id")}

            # Group beds by room_id
            beds_by_room = {}
            for b in beds:
                r_id = str(b.get("room_id"))
                b_copy = dict(b)
                b_id = str(b.get("id"))
                if b_id in tenants_by_bed:
                    t_info = tenants_by_bed[b_id]
                    b_copy["tenant_name"] = t_info.get("full_name")
                    b_copy["tenant_id"] = t_info.get("id")
                    b_copy["tenant_phone"] = t_info.get("phone")
                else:
                    b_copy["tenant_name"] = None
                    b_copy["tenant_id"] = None
                    b_copy["tenant_phone"] = None

                beds_by_room.setdefault(r_id, []).append(b_copy)

            # Build enriched room objects
            result = []
            for r in rooms:
                r_id = str(r.get("id"))
                room_beds = beds_by_room.get(r_id, [])
                total_beds = len(room_beds)
                occupied = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "OCCUPIED")
                available = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "AVAILABLE")
                reserved = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "RESERVED")
                maintenance = sum(1 for b in room_beds if str(b.get("status", "")).upper() == "MAINTENANCE")

                floor_num = r.get("floor") if r.get("floor") is not None else 1
                floor_name = self._default_floor_name(floor_num)

                # Room Occupancy Classification derived from usable beds:
                # FULLY_OCCUPIED: available usable beds = 0 and at least one occupied/reserved bed
                # PARTIALLY_OCCUPIED: some beds occupied/reserved and some beds available
                # VACANT: all usable beds available and no occupied/reserved beds
                # MAINTENANCE: room.status = MAINTENANCE
                r_status = str(r.get("status", "")).upper()
                if r_status in ("MAINTENANCE", "UNAVAILABLE"):
                    occupancy_class = "MAINTENANCE"
                else:
                    occupied_or_reserved = occupied + reserved
                    if available == 0 and occupied_or_reserved > 0:
                        occupancy_class = "FULLY_OCCUPIED"
                    elif occupied_or_reserved > 0 and available > 0:
                        occupancy_class = "PARTIALLY_OCCUPIED"
                    elif available > 0 and occupied_or_reserved == 0:
                        occupancy_class = "VACANT"
                    else:
                        occupancy_class = "MAINTENANCE" if (total_beds > 0 and maintenance == total_beds) else "VACANT"

                room_copy = dict(r)
                room_copy["floor_name"] = floor_name
                room_copy["beds"] = room_beds
                room_copy["total_beds"] = total_beds
                room_copy["occupied_beds"] = occupied
                room_copy["available_beds"] = available
                room_copy["reserved_beds"] = reserved
                room_copy["maintenance_beds"] = maintenance
                room_copy["occupancy_rate"] = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0
                room_copy["occupancy_classification"] = occupancy_class

                result.append(room_copy)

            return result

        except Exception as e:
            logger.error(f"Error fetching rooms from Supabase: {e}")
            return []

    def get_room_by_id(self, room_id: str, hostel_id: str) -> dict:
        """Retrieve a single room with its beds and active tenants."""
        rooms = self.get_rooms(hostel_id)
        for r in rooms:
            if str(r.get("id")) == str(room_id) or str(r.get("room_number")) == str(room_id):
                return r
        return None

    def create_room(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new room in public.rooms and auto-generate its bed records in public.beds.
        Ensures room_number is unique in the hostel, capacity > 0, and monthly_rent is per person/bed.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        room_number = str(data.get("room_number", "")).strip()
        if not room_number:
            raise ValueError("Room number is required.")

        # Room Type handling: SINGLE, DOUBLE, TRIPLE, FOUR_SHARING, CUSTOM
        room_type = str(data.get("room_type", "DOUBLE")).upper()
        allowed_types = {"SINGLE", "DOUBLE", "TRIPLE", "FOUR_SHARING", "CUSTOM"}
        if room_type not in allowed_types:
            room_type = "DOUBLE"

        capacity_defaults = {"SINGLE": 1, "DOUBLE": 2, "TRIPLE": 3, "FOUR_SHARING": 4, "CUSTOM": 2}
        try:
            capacity = int(data.get("capacity") or capacity_defaults.get(room_type, 2))
        except (ValueError, TypeError):
            capacity = 2

        if capacity <= 0:
            raise ValueError("Room capacity must be at least 1 bed.")

        try:
            monthly_rent = float(data.get("monthly_rent") or 8500.0)
            if monthly_rent < 0:
                raise ValueError("Monthly rent per person must be a non-negative amount.")
        except (ValueError, TypeError):
            monthly_rent = 8500.0

        try:
            security_deposit = float(data.get("security_deposit") if data.get("security_deposit") is not None else monthly_rent)
            if security_deposit < 0:
                security_deposit = monthly_rent
        except (ValueError, TypeError):
            security_deposit = monthly_rent

        # Resolve floor
        floor_id = data.get("floor_id")
        floor_num = None
        if floor_id:
            found_floor = self.get_floor_by_id(floor_id, hostel_id)
            if found_floor:
                floor_num = found_floor.get("floor_number")

        if floor_num is None:
            if data.get("floor") is not None:
                try:
                    floor_num = int(data["floor"])
                except ValueError:
                    floor_num = 1
            elif room_number and room_number[0].isdigit():
                floor_num = int(room_number[0])
            else:
                floor_num = 1

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
            "floor": floor_num,
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "capacity": capacity,
            "status": str(data.get("status", "ACTIVE")).upper(),
            "room_name": data.get("room_name") or None,
            "notes": data.get("notes") or None,
        }
        if floor_id:
            room_payload["floor_id"] = floor_id

        # Insert room (resilient to schema column availability)
        try:
            res_room = self.db.table("rooms").insert(room_payload).execute()
        except Exception as insert_err:
            err_str = str(insert_err)
            if "floor_id" in err_str or "room_name" in err_str or "notes" in err_str:
                logger.warning("Optional room columns not yet in schema cache, falling back to core payload.")
                core_payload = {
                    "hostel_id": hostel_id,
                    "room_number": room_number,
                    "room_type": room_type if room_type in ('SINGLE', 'DOUBLE', 'TRIPLE') else 'DOUBLE',
                    "floor": floor_num,
                    "monthly_rent": monthly_rent,
                    "security_deposit": security_deposit,
                    "capacity": capacity,
                    "status": room_payload["status"],
                }
                res_room = self.db.table("rooms").insert(core_payload).execute()
            else:
                raise insert_err

        if not res_room.data or len(res_room.data) == 0:
            raise RuntimeError(f"Failed to insert room {room_number}")

        created_room = res_room.data[0]
        room_uuid = created_room["id"]

        # Auto-generate beds for the room (Bed A, Bed B, Bed C...)
        letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
        generated_beds = []
        for i in range(capacity):
            letter = letters[i] if i < len(letters) else str(i + 1)
            bed_code = f"Bed {letter}"
            bed_payload = {
                "hostel_id": hostel_id,
                "room_id": room_uuid,
                "bed_code": bed_code,
                "status": "AVAILABLE",
            }
            try:
                res_bed = self.db.table("beds").insert(bed_payload).execute()
                if res_bed.data and len(res_bed.data) > 0:
                    generated_beds.append(res_bed.data[0])
            except Exception as be:
                logger.error(f"Error creating bed {bed_code} for room {room_number}: {be}")

        created_room["beds"] = generated_beds
        created_room["total_beds"] = len(generated_beds)
        created_room["available_beds"] = len(generated_beds)
        created_room["occupied_beds"] = 0
        created_room["reserved_beds"] = 0
        created_room["maintenance_beds"] = 0
        created_room["floor_name"] = self._default_floor_name(floor_num)

        logger.info(f"Successfully created room {room_number} with {len(generated_beds)} beds.")
        return created_room

    def update_room(self, hostel_id: str, room_id: str, data: dict) -> dict:
        """
        Update room configuration with capacity safety guards and rent propagation option.
        - If capacity increases: auto-generates additional AVAILABLE beds.
        - If capacity decreases: checks whether beds being removed are OCCUPIED/RESERVED.
          Throws ValueError if reducing below occupied count.
        - If monthly_rent updates: supports 'apply_to_existing_tenants' option.
          Historical payments are never modified.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        current_room = self.get_room_by_id(room_id, hostel_id)
        if not current_room:
            raise ValueError(f"Room {room_id} not found.")

        room_uuid = current_room["id"]
        current_beds = current_room.get("beds", [])
        occupied_count = current_room.get("occupied_beds", 0)
        reserved_count = current_room.get("reserved_beds", 0)
        current_capacity = current_room.get("capacity") or len(current_beds)

        updates = {}

        # 1. Room Number
        if "room_number" in data and data["room_number"]:
            new_num = str(data["room_number"]).strip()
            if new_num != current_room.get("room_number"):
                # Check uniqueness
                dup = (
                    self.db.table("rooms")
                    .select("id")
                    .eq("hostel_id", hostel_id)
                    .eq("room_number", new_num)
                    .execute()
                )
                if dup.data and len(dup.data) > 0:
                    raise ValueError(f"Room number {new_num} is already taken in this hostel.")
                updates["room_number"] = new_num

        # 2. Room Type
        if "room_type" in data and data["room_type"]:
            rt = str(data["room_type"]).upper()
            if rt in ("SINGLE", "DOUBLE", "TRIPLE", "FOUR_SHARING", "CUSTOM"):
                updates["room_type"] = rt

        # 3. Floor Assignment
        if "floor_id" in data and data["floor_id"]:
            f_obj = self.get_floor_by_id(data["floor_id"], hostel_id)
            if f_obj:
                updates["floor_id"] = f_obj.get("id")
                updates["floor"] = f_obj.get("floor_number")

        # 4. Status & Notes
        if "status" in data and data["status"]:
            st = str(data["status"]).upper()
            if st in ("ACTIVE", "MAINTENANCE", "UNAVAILABLE"):
                updates["status"] = st
        if "room_name" in data:
            updates["room_name"] = str(data["room_name"]).strip() or None
        if "notes" in data:
            updates["notes"] = str(data["notes"]).strip() or None

        # 5. Capacity Change Safety Guard
        new_capacity = None
        if "capacity" in data and data["capacity"] is not None:
            try:
                new_capacity = int(data["capacity"])
            except ValueError:
                new_capacity = current_capacity

            if new_capacity <= 0:
                raise ValueError("Room capacity must be at least 1 bed.")

            if new_capacity < (occupied_count + reserved_count):
                raise ValueError(
                    f"Room capacity cannot be reduced to {new_capacity} because {occupied_count + reserved_count} "
                    f"bed(s) are currently occupied or reserved."
                )

            if new_capacity > len(current_beds):
                # Add extra beds
                letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
                needed = new_capacity - len(current_beds)
                existing_codes = {b.get("bed_code") for b in current_beds}

                added_count = 0
                for letter in letters:
                    cand = f"Bed {letter}"
                    if cand not in existing_codes:
                        self.db.table("beds").insert({
                            "hostel_id": hostel_id,
                            "room_id": room_uuid,
                            "bed_code": cand,
                            "status": "AVAILABLE",
                        }).execute()
                        added_count += 1
                        if added_count >= needed:
                            break

            elif new_capacity < len(current_beds):
                # Safely delete unused AVAILABLE beds (from highest bed code down)
                to_remove_count = len(current_beds) - new_capacity
                available_beds = [b for b in current_beds if str(b.get("status", "")).upper() == "AVAILABLE"]
                # Sort descending by bed_code
                available_beds.sort(key=lambda b: str(b.get("bed_code", "")), reverse=True)

                if len(available_beds) < to_remove_count:
                    raise ValueError("Cannot reduce capacity: not enough unused available beds to remove.")

                for i in range(to_remove_count):
                    b_id = available_beds[i]["id"]
                    self.db.table("beds").delete().eq("id", b_id).eq("hostel_id", hostel_id).execute()

            updates["capacity"] = new_capacity

        # 6. Monthly Rent & Security Deposit
        new_rent = None
        if "monthly_rent" in data and data["monthly_rent"] is not None:
            try:
                new_rent = float(data["monthly_rent"])
                if new_rent < 0:
                    raise ValueError("Monthly rent per person must be a non-negative amount.")
                updates["monthly_rent"] = new_rent
            except ValueError:
                pass

        if "security_deposit" in data and data["security_deposit"] is not None:
            try:
                new_dep = float(data["security_deposit"])
                if new_dep >= 0:
                    updates["security_deposit"] = new_dep
            except ValueError:
                pass

        # Perform room update in Supabase
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            try:
                self.db.table("rooms").update(updates).eq("id", room_uuid).eq("hostel_id", hostel_id).execute()
            except Exception as ue:
                err_str = str(ue)
                if "floor_id" in err_str or "room_name" in err_str or "notes" in err_str:
                    logger.warning(f"Omitting schema-cache missing columns in update: {ue}")
                    for col in ("floor_id", "room_name", "notes"):
                        updates.pop(col, None)
                    self.db.table("rooms").update(updates).eq("id", room_uuid).eq("hostel_id", hostel_id).execute()
                else:
                    raise ue

        # 7. Apply to existing active tenants if requested
        apply_to_existing = data.get("apply_to_existing_tenants", False)
        if apply_to_existing and new_rent is not None:
            try:
                self.db.table("tenants").update({
                    "monthly_rent": new_rent,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("room_id", room_uuid).eq("hostel_id", hostel_id).eq("status", "ACTIVE").execute()
                logger.info(f"Updated active tenants in room {room_uuid} to new rent ₹{new_rent}/month")
            except Exception as te:
                logger.error(f"Error updating active tenants rent in room {room_uuid}: {te}")

        return self.get_room_by_id(room_uuid, hostel_id)

    # =========================================================================
    # 3. BEDS MANAGEMENT
    # =========================================================================

    def add_bed(self, hostel_id: str, room_id: str, bed_code: str = None) -> dict:
        """
        Add an additional bed to an existing room and increment its capacity.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        room = self.get_room_by_id(room_id, hostel_id)
        if not room:
            raise ValueError(f"Room {room_id} not found.")

        room_uuid = room["id"]
        existing_beds = room.get("beds", [])
        existing_codes = {str(b.get("bed_code", "")).upper() for b in existing_beds}

        if not bed_code or not bed_code.strip():
            letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
            for l in letters:
                candidate = f"Bed {l}"
                if candidate.upper() not in existing_codes:
                    bed_code = candidate
                    break
            if not bed_code:
                bed_code = f"Bed {len(existing_beds) + 1}"
        else:
            bed_code = bed_code.strip()
            if bed_code.upper() in existing_codes:
                raise ValueError(f"Bed code '{bed_code}' already exists in room {room['room_number']}.")

        bed_payload = {
            "hostel_id": hostel_id,
            "room_id": room_uuid,
            "bed_code": bed_code,
            "status": "AVAILABLE",
        }

        res = self.db.table("beds").insert(bed_payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError(f"Failed to add bed {bed_code} to room {room['room_number']}")

        # Increment room capacity to reflect the new bed
        new_capacity = len(existing_beds) + 1
        try:
            self.db.table("rooms").update({
                "capacity": new_capacity,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", room_uuid).execute()
        except Exception as e:
            logger.warning(f"Could not update room capacity on bed add: {e}")

        return res.data[0]

    def update_bed_status(self, hostel_id: str, bed_id: str, new_status: str) -> dict:
        """Update bed availability status."""
        if not self.db:
            raise RuntimeError("Database client not available")

        valid_statuses = ["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE", "UNAVAILABLE"]
        new_status = new_status.upper()
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status {new_status}. Allowed: {valid_statuses}")

        now_iso = datetime.now(timezone.utc).isoformat()

        res = (
            self.db.table("beds")
            .update({"status": new_status, "updated_at": now_iso})
            .eq("id", bed_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]

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

    # =========================================================================
    # 4. PROPERTY SUMMARY & STATS
    # =========================================================================

    def get_property_summary(self, hostel_id: str) -> dict:
        """
        Aggregate property summary across floors, rooms, and beds for the owner.
        """
        rooms = self.get_rooms(hostel_id)
        floors = self.get_floors(hostel_id, rooms=rooms)

        total_floors = len(floors)
        total_rooms = len(rooms)
        total_beds = sum(r.get("total_beds", 0) for r in rooms)
        occupied_beds = sum(r.get("occupied_beds", 0) for r in rooms)
        available_beds = sum(r.get("available_beds", 0) for r in rooms)
        reserved_beds = sum(r.get("reserved_beds", 0) for r in rooms)
        maintenance_beds = sum(r.get("maintenance_beds", 0) for r in rooms)
        occupancy_rate = round((occupied_beds / total_beds * 100), 2) if total_beds > 0 else 0.0

        # Room occupancy classification counts derived strictly from usable beds
        rooms_fully_occupied = sum(1 for r in rooms if r.get("occupancy_classification") == "FULLY_OCCUPIED")
        rooms_partially_occupied = sum(1 for r in rooms if r.get("occupancy_classification") == "PARTIALLY_OCCUPIED")
        rooms_vacant = sum(1 for r in rooms if r.get("occupancy_classification") == "VACANT")
        rooms_maintenance = sum(1 for r in rooms if r.get("occupancy_classification") == "MAINTENANCE")

        floor_summaries = []
        for f in floors:
            floor_summaries.append({
                "id": f.get("id"),
                "floor_number": f.get("floor_number"),
                "floor_name": f.get("floor_name") or f"Floor {f.get('floor_number')}",
                "rooms_count": f.get("rooms_count", 0),
                "total_beds": f.get("total_beds", 0),
                "occupied_beds": f.get("occupied_beds", 0),
                "available_beds": f.get("available_beds", 0),
                "reserved_beds": f.get("reserved_beds", 0),
                "occupancy_rate": f.get("occupancy_rate", 0.0),
                "status": f.get("status", "ACTIVE"),
            })

        return {
            "floors": total_floors,
            "floors_count": total_floors,
            "rooms": total_rooms,
            "rooms_count": total_rooms,
            "beds": total_beds,
            "beds_count": total_beds,
            "roomsFullyOccupied": rooms_fully_occupied,
            "rooms_fully_occupied": rooms_fully_occupied,
            "roomsPartiallyOccupied": rooms_partially_occupied,
            "rooms_partially_occupied": rooms_partially_occupied,
            "roomsVacant": rooms_vacant,
            "rooms_vacant": rooms_vacant,
            "roomsMaintenance": rooms_maintenance,
            "rooms_maintenance": rooms_maintenance,
            "bedsOccupied": occupied_beds,
            "occupied_beds": occupied_beds,
            "bedsAvailable": available_beds,
            "available_beds": available_beds,
            "bedsReserved": reserved_beds,
            "reserved_beds": reserved_beds,
            "maintenance_beds": maintenance_beds,
            "occupancyRate": occupancy_rate,
            "occupancy_rate": occupancy_rate,
            "floorSummary": floor_summaries,
            "floor_summaries": floor_summaries,
            "floors_list": floor_summaries,
            "rooms_list": rooms,
        }

    def get_stats(self, hostel_id: str) -> dict:
        """Compatibility wrapper for dashboard stats."""
        summary = self.get_property_summary(hostel_id)
        return {
            "total_rooms": summary["rooms_count"],
            "total_beds": summary["beds_count"],
            "occupied_beds": summary["occupied_beds"],
            "available_beds": summary["available_beds"],
            "reserved_beds": summary["reserved_beds"],
            "maintenance_beds": summary["maintenance_beds"],
            "occupancy_rate": summary["occupancy_rate"],
            "floors_count": summary["floors_count"],
            "floors": summary["floorSummary"],
            "roomsFullyOccupied": summary["roomsFullyOccupied"],
            "roomsPartiallyOccupied": summary["roomsPartiallyOccupied"],
            "roomsVacant": summary["roomsVacant"],
            "roomsMaintenance": summary["roomsMaintenance"],
        }


_room_service_instance = None


def get_room_service(db_client=None) -> RoomService:
    global _room_service_instance
    if _room_service_instance is None:
        _room_service_instance = RoomService(db_client)
    elif db_client:
        _room_service_instance.db = db_client
    return _room_service_instance
