"""
Tenant Domain Service & Data Access Layer
Provides persistent resident management, room/bed assignment consistency,
stay tracking, and tenant portal profile synchronization for UrbanNest Hostel CRM.
"""

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone, date

from room_service import get_room_service

logger = logging.getLogger("tenant_service")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TENANTS_FILE = os.path.join(DATA_DIR, "tenants.json")
_lock = threading.Lock()

DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"

DEFAULT_TENANTS = [
    {
        "id": "TEN-101",
        "hostel_id": DEMO_HOSTEL_ID,
        "profile_id": None,
        "tenant_code": "TEN-101",
        "full_name": "Rahul Sharma",
        "phone": "+91 98765 43210",
        "email": "rahul.sharma@example.com",
        "occupation": "Software Engineer (Infosys)",
        "room_id": "RM-204",
        "room_number": "204",
        "bed_id": "BED-204A",
        "bed_code": "Bed A",
        "move_in_date": "2026-09-01",
        "expected_end_date": "2027-03-01",
        "monthly_rent": 8500.0,
        "security_deposit": 8500.0,
        "status": "ACTIVE",
        "emergency_contact_name": "Ramesh Sharma",
        "emergency_contact_relationship": "Father",
        "emergency_contact_phone": "+91 98765 00000",
        "rules_accepted_at": "2026-09-01T10:00:00+00:00",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "TEN-102",
        "hostel_id": DEMO_HOSTEL_ID,
        "profile_id": None,
        "tenant_code": "TEN-102",
        "full_name": "Priya Patel",
        "phone": "+91 98123 45678",
        "email": "priya.patel@example.com",
        "occupation": "Product Analyst (Google)",
        "room_id": "RM-201",
        "room_number": "201",
        "bed_id": "BED-201A",
        "bed_code": "Bed A",
        "move_in_date": "2026-08-15",
        "expected_end_date": "2027-02-15",
        "monthly_rent": 14000.0,
        "security_deposit": 14000.0,
        "status": "ACTIVE",
        "emergency_contact_name": "Suresh Patel",
        "emergency_contact_relationship": "Father",
        "emergency_contact_phone": "+91 98123 00000",
        "rules_accepted_at": "2026-08-15T12:00:00+00:00",
        "created_at": "2026-08-15T00:00:00+00:00",
        "updated_at": "2026-08-15T00:00:00+00:00"
    },
    {
        "id": "TEN-103",
        "hostel_id": DEMO_HOSTEL_ID,
        "profile_id": None,
        "tenant_code": "TEN-103",
        "full_name": "Arjun Mehta",
        "phone": "+91 97654 32109",
        "email": "arjun.mehta@example.com",
        "occupation": "Consultant (Deloitte)",
        "room_id": "RM-101",
        "room_number": "101",
        "bed_id": "BED-101A",
        "bed_code": "Bed A",
        "move_in_date": "2026-09-01",
        "expected_end_date": "2027-02-28",
        "monthly_rent": 6500.0,
        "security_deposit": 6500.0,
        "status": "ACTIVE",
        "emergency_contact_name": "Kavita Mehta",
        "emergency_contact_relationship": "Mother",
        "emergency_contact_phone": "+91 97654 00000",
        "rules_accepted_at": "2026-09-01T14:00:00+00:00",
        "created_at": "2026-09-01T00:00:00+00:00",
        "updated_at": "2026-09-01T00:00:00+00:00"
    },
    {
        "id": "TEN-110",
        "hostel_id": DEMO_HOSTEL_ID,
        "profile_id": None,
        "tenant_code": "TEN-110",
        "full_name": "Suresh Babu",
        "phone": "+91 96543 21098",
        "email": "suresh.babu@example.com",
        "occupation": "Data Engineer (Amazon)",
        "room_id": "RM-102",
        "room_number": "102",
        "bed_id": "BED-102B",
        "bed_code": "Bed B",
        "move_in_date": "2026-08-15",
        "expected_end_date": "2026-10-15",
        "monthly_rent": 8500.0,
        "security_deposit": 8500.0,
        "status": "ACTIVE",
        "emergency_contact_name": "Venkat Babu",
        "emergency_contact_relationship": "Brother",
        "emergency_contact_phone": "+91 96543 00000",
        "rules_accepted_at": "2026-08-15T09:00:00+00:00",
        "created_at": "2026-08-15T00:00:00+00:00",
        "updated_at": "2026-08-15T00:00:00+00:00"
    }
]


class TenantService:
    def __init__(self, db_client=None):
        self.db = db_client
        os.makedirs(DATA_DIR, exist_ok=True)
        self._init_storage()

    def _init_storage(self):
        with _lock:
            if not os.path.exists(TENANTS_FILE):
                with open(TENANTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_TENANTS, f, indent=2)

    def _read_local(self) -> list:
        try:
            with open(TENANTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return DEFAULT_TENANTS.copy()

    def _write_local(self, data: list):
        with open(TENANTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_tenants(self, hostel_id: str, status: str = None, search: str = None) -> list:
        tenants = []
        if self.db:
            try:
                query = self.db.table("tenants").select("*").eq("hostel_id", hostel_id)
                if status and status.upper() != "ALL":
                    query = query.eq("status", status.upper())
                res = query.order("created_at", desc=True).execute()
                tenants = res.data or []
            except Exception as e:
                if "PGRST205" not in str(e):
                    logger.warning(f"Supabase tenants fetch error: {e}")

        if not tenants:
            all_t = self._read_local()
            tenants = [t for t in all_t if t.get("hostel_id") == hostel_id]
            if status and status.upper() != "ALL":
                tenants = [t for t in tenants if t.get("status") == status.upper()]

        # Filter by search string if provided
        if search:
            q = search.lower().strip()
            tenants = [
                t for t in tenants
                if q in str(t.get("full_name", "")).lower()
                or q in str(t.get("tenant_code", "")).lower()
                or q in str(t.get("phone", "")).lower()
                or q in str(t.get("email", "")).lower()
                or q in str(t.get("room_number", "")).lower()
            ]

        # Enrich tenants with current room and bed labels if missing
        room_service = get_room_service(self.db)
        rooms_list = room_service.get_rooms(hostel_id)
        room_map = {r.get("id"): r for r in rooms_list}
        bed_map = {}
        for r in rooms_list:
            for b in r.get("beds", []):
                bed_map[b.get("id")] = (r, b)

        enriched = []
        for t in tenants:
            t_copy = dict(t)
            r_id = t_copy.get("room_id")
            b_id = t_copy.get("bed_id")

            if b_id in bed_map:
                r_obj, b_obj = bed_map[b_id]
                t_copy["room_number"] = r_obj.get("room_number")
                t_copy["bed_code"] = b_obj.get("bed_code")
                t_copy["room_type"] = r_obj.get("room_type")
            elif r_id in room_map:
                r_obj = room_map[r_id]
                t_copy["room_number"] = r_obj.get("room_number")
                t_copy["room_type"] = r_obj.get("room_type")

            enriched.append(t_copy)

        return enriched

    def get_tenant_by_id(self, tenant_id: str, hostel_id: str) -> dict:
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
        Create a new tenant record with optional immediate room/bed assignment.
        Enforces bed occupancy transactional consistency.
        """
        full_name = (data.get("full_name") or data.get("name") or "").strip()
        if not full_name:
            raise ValueError("Tenant full name is required.")

        phone = (data.get("phone") or "").strip()
        email = (data.get("email") or "").strip().lower()
        occupation = data.get("occupation") or "Not specified"
        monthly_rent = float(data.get("monthly_rent") or 8500.0)
        security_deposit = float(data.get("security_deposit") or monthly_rent)
        move_in_date = data.get("move_in_date") or date.today().isoformat()
        expected_end_date = data.get("expected_end_date") or "2027-03-31"

        room_id = data.get("room_id")
        bed_id = data.get("bed_id")
        room_number = data.get("room_number")
        bed_code = data.get("bed_code")

        now_iso = datetime.now(timezone.utc).isoformat()
        code_suffix = uuid.uuid4().hex[:4].upper()
        tenant_code = f"TEN-{code_suffix}"
        tenant_id = tenant_code

        # If bed assigned, verify and mark bed OCCUPIED
        room_service = get_room_service(self.db)
        if bed_id:
            room_service.update_bed_status(hostel_id, bed_id, "OCCUPIED")

        new_tenant = {
            "id": tenant_id,
            "hostel_id": hostel_id,
            "profile_id": data.get("profile_id"),
            "tenant_code": tenant_code,
            "full_name": full_name,
            "phone": phone,
            "email": email,
            "occupation": occupation,
            "room_id": room_id,
            "room_number": room_number,
            "bed_id": bed_id,
            "bed_code": bed_code,
            "move_in_date": move_in_date,
            "expected_end_date": expected_end_date,
            "monthly_rent": monthly_rent,
            "security_deposit": security_deposit,
            "status": data.get("status", "ACTIVE"),
            "emergency_contact_name": data.get("emergency_contact_name", ""),
            "emergency_contact_relationship": data.get("emergency_contact_relationship", ""),
            "emergency_contact_phone": data.get("emergency_contact_phone", ""),
            "rules_accepted_at": data.get("rules_accepted_at", now_iso),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        with _lock:
            tenants = self._read_local()
            tenants.append(new_tenant)
            self._write_local(tenants)

        if self.db:
            try:
                # Prepare payload omitting non-column fields if needed
                db_payload = {k: v for k, v in new_tenant.items() if k not in ["room_number", "bed_code"]}
                self.db.table("tenants").insert(db_payload).execute()
            except Exception as e:
                logger.warning(f"Supabase tenant creation sync warning: {e}")

        logger.info(f"Created tenant {tenant_code} ({full_name})")
        return new_tenant

    def assign_bed(self, hostel_id: str, tenant_id: str, room_id: str, bed_id: str) -> dict:
        """
        Assign a room and bed to a tenant.
        Transactional consistency:
        - Frees previous bed if tenant had one
        - Marks newly assigned bed as OCCUPIED
        - Updates tenant record
        """
        tenant = self.get_tenant_by_id(tenant_id, hostel_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found.")

        room_service = get_room_service(self.db)
        old_bed_id = tenant.get("bed_id")

        # 1. Release previous bed if changing beds
        if old_bed_id and str(old_bed_id) != str(bed_id):
            room_service.update_bed_status(hostel_id, old_bed_id, "AVAILABLE")

        # 2. Mark new bed as OCCUPIED
        room_service.update_bed_status(hostel_id, bed_id, "OCCUPIED")

        # 3. Update tenant
        now_iso = datetime.now(timezone.utc).isoformat()
        with _lock:
            tenants = self._read_local()
            for t in tenants:
                if str(t.get("id")) == str(tenant["id"]) or str(t.get("tenant_code")) == str(tenant["tenant_code"]):
                    t["room_id"] = room_id
                    t["bed_id"] = bed_id
                    t["status"] = "ACTIVE"
                    t["updated_at"] = now_iso
                    break
            self._write_local(tenants)

        if self.db:
            try:
                self.db.table("tenants").update({
                    "room_id": room_id,
                    "bed_id": bed_id,
                    "status": "ACTIVE",
                    "updated_at": now_iso
                }).eq("id", tenant["id"]).execute()
            except Exception as e:
                logger.warning(f"Supabase tenant bed assignment sync warning: {e}")

        return self.get_tenant_by_id(tenant_id, hostel_id)

    def vacate_tenant(self, hostel_id: str, tenant_id: str, move_out_date: str = None) -> dict:
        """
        Mark tenant as MOVED_OUT and release their bed back to AVAILABLE.
        """
        tenant = self.get_tenant_by_id(tenant_id, hostel_id)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found.")

        bed_id = tenant.get("bed_id")
        room_service = get_room_service(self.db)

        # 1. Free bed
        if bed_id:
            room_service.update_bed_status(hostel_id, bed_id, "AVAILABLE")

        # 2. Update tenant status to MOVED_OUT
        now_iso = datetime.now(timezone.utc).isoformat()
        actual_date = move_out_date or date.today().isoformat()

        with _lock:
            tenants = self._read_local()
            for t in tenants:
                if str(t.get("id")) == str(tenant["id"]) or str(t.get("tenant_code")) == str(tenant["tenant_code"]):
                    t["status"] = "MOVED_OUT"
                    t["bed_id"] = None
                    t["expected_end_date"] = actual_date
                    t["updated_at"] = now_iso
                    break
            self._write_local(tenants)

        if self.db:
            try:
                self.db.table("tenants").update({
                    "status": "MOVED_OUT",
                    "bed_id": None,
                    "expected_end_date": actual_date,
                    "updated_at": now_iso
                }).eq("id", tenant["id"]).execute()
            except Exception as e:
                logger.warning(f"Supabase tenant vacate sync warning: {e}")

        return self.get_tenant_by_id(tenant_id, hostel_id)

    def get_stats(self, hostel_id: str) -> dict:
        """
        Calculate tenant statistics for dashboard.
        """
        tenants = self.get_tenants(hostel_id)
        total_tenants = len(tenants)
        active = sum(1 for t in tenants if t.get("status") == "ACTIVE")
        pending = sum(1 for t in tenants if t.get("status") == "PENDING")
        notice_period = sum(1 for t in tenants if t.get("status") == "NOTICE_PERIOD")
        moved_out = sum(1 for t in tenants if t.get("status") == "MOVED_OUT")

        # Upcoming stay end dates (within 30 days)
        today = date.today()
        upcoming_end_dates = []
        for t in tenants:
            if t.get("status") in ["ACTIVE", "NOTICE_PERIOD"] and t.get("expected_end_date"):
                try:
                    end_d = date.fromisoformat(str(t.get("expected_end_date")))
                    days_left = (end_d - today).days
                    if 0 <= days_left <= 30:
                        upcoming_end_dates.append({
                            "tenant_id": t.get("id"),
                            "full_name": t.get("full_name"),
                            "room_number": t.get("room_number"),
                            "expected_end_date": str(end_d),
                            "days_left": days_left
                        })
                except Exception:
                    pass

        return {
            "total_tenants": total_tenants,
            "active_tenants": active,
            "pending_tenants": pending,
            "notice_period_tenants": notice_period,
            "moved_out_tenants": moved_out,
            "upcoming_stay_end_dates_count": len(upcoming_end_dates),
            "upcoming_stay_end_dates": upcoming_end_dates
        }


_tenant_service_instance = None


def get_tenant_service(db_client=None) -> TenantService:
    global _tenant_service_instance
    if _tenant_service_instance is None:
        _tenant_service_instance = TenantService(db_client)
    elif db_client and not _tenant_service_instance.db:
        _tenant_service_instance.db = db_client
    return _tenant_service_instance
