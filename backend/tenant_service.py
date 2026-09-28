"""
Tenant Domain Service & Supabase Data Access Layer
Provides persistent, relational tenant lifecycle management,
room/bed assignments, and tenancy metrics for UrbanNest Hostel CRM.
"""

import logging
import uuid
from datetime import datetime, timezone, date, timedelta

from room_service import get_room_service

logger = logging.getLogger("tenant_service")


class TenantService:
    def __init__(self, db_client=None):
        self.db = db_client

    def get_tenants(self, hostel_id: str, status: str = None, search: str = None) -> list:
        """
        Retrieve all tenants for a given hostel, enriched with room and bed details.
        Directly queries Supabase PostgreSQL public.tenants.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("tenants").select("*").eq("hostel_id", hostel_id)
            if status and status.upper() != "ALL":
                query = query.eq("status", status.upper())

            res = query.order("created_at", desc=True).execute()
            tenants = res.data or []

            # Filter by search query if provided
            if search:
                q = search.lower().strip()
                tenants = [
                    t for t in tenants
                    if q in str(t.get("full_name", "")).lower()
                    or q in str(t.get("tenant_code", "")).lower()
                    or q in str(t.get("phone", "")).lower()
                    or q in str(t.get("email", "")).lower()
                ]

            # Enrich tenants with current room and bed labels
            room_service = get_room_service(self.db)
            rooms_list = room_service.get_rooms(hostel_id)
            room_map = {str(r.get("id")): r for r in rooms_list}
            bed_map = {}
            for r in rooms_list:
                for b in r.get("beds", []):
                    bed_map[str(b.get("id"))] = (r, b)

            enriched = []
            for t in tenants:
                t_copy = dict(t)
                r_id = str(t_copy.get("room_id")) if t_copy.get("room_id") else None
                b_id = str(t_copy.get("bed_id")) if t_copy.get("bed_id") else None

                if b_id and b_id in bed_map:
                    r_obj, b_obj = bed_map[b_id]
                    t_copy["room_number"] = r_obj.get("room_number")
                    t_copy["bed_code"] = b_obj.get("bed_code")
                    t_copy["room_type"] = r_obj.get("room_type")
                elif r_id and r_id in room_map:
                    r_obj = room_map[r_id]
                    t_copy["room_number"] = r_obj.get("room_number")
                    t_copy["room_type"] = r_obj.get("room_type")
                else:
                    t_copy["room_number"] = t_copy.get("room_number") or "-"
                    t_copy["bed_code"] = t_copy.get("bed_code") or "-"

                enriched.append(t_copy)

            return enriched

        except Exception as e:
            logger.error(f"Error fetching tenants from Supabase: {e}")
            return []

    def get_tenant_by_id(self, tenant_id: str, hostel_id: str) -> dict:
        """
        Retrieve a tenant by UUID, tenant_code, or profile_id.
        """
        if not self.db:
            return None

        tenants = self.get_tenants(hostel_id)
        for t in tenants:
            if (
                str(t.get("id")) == str(tenant_id)
                or str(t.get("tenant_code")) == str(tenant_id)
                or str(t.get("profile_id")) == str(tenant_id)
            ):
                return t
        return None

    def create_tenant(self, hostel_id: str, data: dict) -> dict:
        """
        Create a new tenant record with optional room/bed assignment.
        Enforces bed occupancy transactional consistency.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        full_name = (data.get("full_name") or data.get("name") or "").strip()
        if not full_name:
            raise ValueError("Tenant full name is required.")

        phone = (data.get("phone") or "").strip()
        email = (data.get("email") or "").strip().lower()
        occupation = data.get("occupation") or "Not specified"
        monthly_rent = float(data.get("monthly_rent") or 8500.0)
        security_deposit = float(data.get("security_deposit") or monthly_rent)
        move_in_date = data.get("move_in_date") or date.today().isoformat()
        expected_end_date = data.get("expected_end_date") or (date.today() + timedelta(days=180)).isoformat()

        room_id = data.get("room_id")
        bed_id = data.get("bed_id")

        # Resolve room_id if room_number passed
        room_service = get_room_service(self.db)
        if not room_id and data.get("room_number"):
            found_room = room_service.get_room_by_id(data.get("room_number"), hostel_id)
            if found_room:
                room_id = found_room["id"]

        # Generate unique human-readable tenant code
        code_suffix = uuid.uuid4().hex[:4].upper()
        tenant_code = data.get("tenant_code") or f"TEN-{code_suffix}"

        # If bed assigned, mark bed as OCCUPIED
        if bed_id:
            room_service.update_bed_status(hostel_id, bed_id, "OCCUPIED")

        tenant_payload = {
            "hostel_id": hostel_id,
            "profile_id": data.get("profile_id") or None,
            "tenant_code": tenant_code,
            "full_name": full_name,
            "phone": phone or None,
            "email": email or None,
            "occupation": occupation,
            "room_id": room_id or None,
            "bed_id": bed_id or None,
            "move_in_date": move_in_date,
            "expected_end_date": expected_end_date,
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "status": str(data.get("status", "ACTIVE")).upper(),
            "emergency_contact_name": data.get("emergency_contact_name") or None,
            "emergency_contact_relationship": data.get("emergency_contact_relationship") or None,
            "emergency_contact_phone": data.get("emergency_contact_phone") or None,
        }

        res = self.db.table("tenants").insert(tenant_payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError(f"Failed to create tenant {full_name}")

        created_tenant = res.data[0]
        logger.info(f"Successfully created tenant {tenant_code} ({full_name}) in Supabase")
        return created_tenant

    def assign_bed(self, hostel_id: str, tenant_id: str, room_id: str, bed_id: str) -> dict:
        """
        Assign a room and bed to a tenant.
        - Releases previous bed to AVAILABLE
        - Marks newly assigned bed as OCCUPIED
        - Updates tenant record with room_id and bed_id
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        tenant = self.get_tenant_by_id(tenant_id, hostel_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found.")

        room_service = get_room_service(self.db)
        old_bed_id = tenant.get("bed_id")

        # 1. Release previous bed if changing beds
        if old_bed_id and str(old_bed_id) != str(bed_id):
            room_service.update_bed_status(hostel_id, old_bed_id, "AVAILABLE")

        # 2. Mark new bed as OCCUPIED
        if bed_id:
            room_service.update_bed_status(hostel_id, bed_id, "OCCUPIED")

        # 3. Update tenant
        now_iso = datetime.now(timezone.utc).isoformat()
        res = (
            self.db.table("tenants")
            .update({
                "room_id": room_id or None,
                "bed_id": bed_id or None,
                "updated_at": now_iso,
            })
            .eq("id", tenant["id"])
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else tenant

    def vacate_tenant(self, hostel_id: str, tenant_id: str) -> dict:
        """
        Process tenant checkout/vacating:
        - Marks status as MOVED_OUT
        - Releases assigned bed to AVAILABLE
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        tenant = self.get_tenant_by_id(tenant_id, hostel_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found.")

        # Release bed
        room_service = get_room_service(self.db)
        if tenant.get("bed_id"):
            room_service.update_bed_status(hostel_id, tenant["bed_id"], "AVAILABLE")

        now_iso = datetime.now(timezone.utc).isoformat()
        res = (
            self.db.table("tenants")
            .update({
                "status": "MOVED_OUT",
                "updated_at": now_iso,
            })
            .eq("id", tenant["id"])
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else tenant

    def get_stats(self, hostel_id: str) -> dict:
        """
        Return tenant occupancy metrics for owner dashboard.
        """
        tenants = self.get_tenants(hostel_id)
        total_tenants = len(tenants)
        active_tenants = sum(1 for t in tenants if str(t.get("status", "")).upper() == "ACTIVE")
        notice_tenants = sum(1 for t in tenants if str(t.get("status", "")).upper() == "NOTICE_PERIOD")

        today = date.today()
        upcoming_cutoff = today + timedelta(days=30)
        upcoming_vacancies = []

        # Map active tenants by room to detect full room vacancies
        tenants_by_room = {}
        for t in tenants:
            st = str(t.get("status", "")).upper()
            if st in ("ACTIVE", "NOTICE_PERIOD"):
                r_id = str(t.get("room_id") or "")
                if r_id:
                    tenants_by_room.setdefault(r_id, []).append(t)

        for t in tenants:
            st = str(t.get("status", "")).upper()
            if st in ("ACTIVE", "NOTICE_PERIOD") and t.get("expected_end_date"):
                try:
                    raw_date_str = str(t["expected_end_date"]).split("T")[0]
                    end_d = datetime.strptime(raw_date_str, "%Y-%m-%d").date()
                    if today <= end_d <= upcoming_cutoff:
                        days_left = (end_d - today).days
                        r_id = str(t.get("room_id") or "")
                        room_tenants = tenants_by_room.get(r_id, [])
                        # A room is full room vacancy if all its occupied beds have move-out dates <= upcoming_cutoff
                        is_full_room = False
                        if room_tenants and len(room_tenants) >= 1:
                            all_moving_out = all(
                                bool(rt.get("expected_end_date")) and 
                                today <= datetime.strptime(str(rt["expected_end_date"]).split("T")[0], "%Y-%m-%d").date() <= upcoming_cutoff
                                for rt in room_tenants
                            )
                            is_full_room = all_moving_out

                        # Pretty date formatting
                        pretty_date = end_d.strftime("%b %d, %Y")

                        r_num = str(t.get("room_number") or "-")
                        if not r_num.startswith("Room ") and r_num != "-":
                            r_num_display = f"Room {r_num}"
                        else:
                            r_num_display = r_num

                        upcoming_vacancies.append({
                            "tenant_id": t.get("id"),
                            "tenant_code": t.get("tenant_code"),
                            "name": t.get("full_name"),
                            "tenant_name": t.get("full_name"),
                            "room_id": t.get("room_id"),
                            "room": r_num_display,
                            "room_number": r_num_display,
                            "bed_id": t.get("bed_id"),
                            "bed": t.get("bed_code") or "Bed",
                            "bed_code": t.get("bed_code") or "Bed",
                            "move_out_date": raw_date_str,
                            "expected_move_out_date": raw_date_str,
                            "formatted_move_out_date": pretty_date,
                            "days_remaining": days_left,
                            "is_full_room_vacancy": is_full_room,
                            "room_type": t.get("room_type") or "Sharing",
                        })
                except Exception as ex:
                    logger.debug(f"Error parsing expected_end_date for tenant {t.get('id')}: {ex}")

        upcoming_vacancies.sort(key=lambda x: x["days_remaining"])

        # Compile distinct full room vacancy notices
        full_room_notices = []
        seen_rooms = set()
        for v in upcoming_vacancies:
            if v.get("is_full_room_vacancy") and v.get("room_id") not in seen_rooms:
                seen_rooms.add(v.get("room_id"))
                full_room_notices.append({
                    "room_id": v.get("room_id"),
                    "room_number": v.get("room_number"),
                    "room_type": v.get("room_type"),
                    "available_from": v.get("expected_move_out_date"),
                    "formatted_date": v.get("formatted_move_out_date"),
                    "days_remaining": v.get("days_remaining"),
                })

        return {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "notice_tenants": notice_tenants,
            "upcoming_stay_end_dates_count": len(upcoming_vacancies),
            "upcoming_stay_end_dates": upcoming_vacancies,
            "upcoming_vacancies": upcoming_vacancies,
            "full_room_vacancies": full_room_notices,
        }


_tenant_service_instance = None


def get_tenant_service(db_client=None) -> TenantService:
    global _tenant_service_instance
    if _tenant_service_instance is None:
        _tenant_service_instance = TenantService(db_client)
    elif db_client:
        _tenant_service_instance.db = db_client
    return _tenant_service_instance
