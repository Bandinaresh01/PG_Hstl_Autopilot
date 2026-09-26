"""
Visitor Management Repository for UrbanNest Hostel CRM.
Handles dual-persistence: local JSON file storage (backend/data/visitors.json)
synchronized with Supabase PostgreSQL (public.visitors).

Features:
- Tenant visitor requests (creation, cancellation, live status, digital pass)
- Owner/Reception approval / rejection workflow
- Gate check-in and check-out tracking (entry/exit timestamps & security notes)
- Walk-in reception registration
- Strict tenant data isolation: tenants only see their own visitor passes
"""

import json
import logging
import os
import random
import threading
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional, Dict, Any

logger = logging.getLogger("hostel_crm.visitors_repo")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
VISITORS_JSON_PATH = os.path.join(DATA_DIR, "visitors.json")

VISITOR_STATUSES = [
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "CANCELLED",
    "EXPIRED",
]

RELATIONSHIPS = [
    "Parent",
    "Sibling",
    "Friend",
    "Colleague",
    "Delivery / Service",
    "Relative",
    "Other",
]

DEMO_HOSTEL_ID = "hstl_demo_001"


def generate_pass_code() -> str:
    """Generate a readable 6-character pass code, e.g. VP-7492"""
    digits = random.randint(1000, 9999)
    return f"VP-{digits}"


INITIAL_VISITORS_SEED: List[Dict[str, Any]] = [
    {
        "id": "VIS-1001",
        "hostel_id": DEMO_HOSTEL_ID,
        "tenant_id": "TEN-1001",
        "tenant_name": "Rahul Sharma",
        "tenant_phone": "+91 98765 43210",
        "room_number": "Room 204",
        "bed_code": "Bed A",
        "visitor_name": "Anil Sharma",
        "visitor_phone": "+91 94123 45678",
        "relationship": "Parent",
        "purpose": "Family visit & term fee payment check",
        "id_type": "Aadhaar Card",
        "id_number": "XXXX-XXXX-9012",
        "visit_date": (date.today() + timedelta(days=1)).isoformat(),
        "expected_time": "11:00 AM - 02:00 PM",
        "expected_duration_hours": 3,
        "is_overnight": False,
        "pass_code": None,
        "status": "PENDING_APPROVAL",
        "check_in_time": None,
        "check_out_time": None,
        "checked_in_by": None,
        "checked_out_by": None,
        "rejection_reason": None,
        "approval_notes": None,
        "owner_notes": "Father visiting from home town.",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
    },
    {
        "id": "VIS-1002",
        "hostel_id": DEMO_HOSTEL_ID,
        "tenant_id": "TEN-1001",
        "tenant_name": "Rahul Sharma",
        "tenant_phone": "+91 98765 43210",
        "room_number": "Room 204",
        "bed_code": "Bed A",
        "visitor_name": "Priya Verma",
        "visitor_phone": "+91 98112 34567",
        "relationship": "Friend",
        "purpose": "Engineering project & study session",
        "id_type": "College ID",
        "id_number": "COL-CS-8891",
        "visit_date": date.today().isoformat(),
        "expected_time": "03:00 PM - 07:00 PM",
        "expected_duration_hours": 4,
        "is_overnight": False,
        "pass_code": "VP-4219",
        "status": "CHECKED_IN",
        "check_in_time": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
        "check_out_time": None,
        "checked_in_by": "Security Desk - Gate 1",
        "checked_out_by": None,
        "rejection_reason": None,
        "approval_notes": "Approved for study lounge & Room 204 common balcony.",
        "owner_notes": "ID verified at entry. Visitor badge #12 issued.",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
    },
    {
        "id": "VIS-1003",
        "hostel_id": DEMO_HOSTEL_ID,
        "tenant_id": "TEN-1001",
        "tenant_name": "Rahul Sharma",
        "tenant_phone": "+91 98765 43210",
        "room_number": "Room 204",
        "bed_code": "Bed A",
        "visitor_name": "Rohit Deshmukh",
        "visitor_phone": "+91 97654 32109",
        "relationship": "Friend",
        "purpose": "Book return and brief discussion",
        "id_type": "Driving License",
        "id_number": "DL-04-2022-771",
        "visit_date": (date.today() - timedelta(days=1)).isoformat(),
        "expected_time": "05:00 PM - 06:30 PM",
        "expected_duration_hours": 1,
        "is_overnight": False,
        "pass_code": "VP-3108",
        "status": "CHECKED_OUT",
        "check_in_time": (datetime.now(timezone.utc) - timedelta(days=1, hours=4)).isoformat(),
        "check_out_time": (datetime.now(timezone.utc) - timedelta(days=1, hours=2, minutes=30)).isoformat(),
        "checked_in_by": "Ramesh (Reception Desk)",
        "checked_out_by": "Ramesh (Reception Desk)",
        "rejection_reason": None,
        "approval_notes": "Standard 2 hour visitor pass.",
        "owner_notes": "Visitor badge returned. No incidents.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1, hours=8)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=1, hours=2, minutes=30)).isoformat(),
    },
    {
        "id": "VIS-1004",
        "hostel_id": DEMO_HOSTEL_ID,
        "tenant_id": "TEN-1002",
        "tenant_name": "Amit Joshi",
        "tenant_phone": "+91 98765 11111",
        "room_number": "Room 102",
        "bed_code": "Bed B",
        "visitor_name": "Vikas Mehra",
        "visitor_phone": "+91 99887 76655",
        "relationship": "Sibling",
        "purpose": "Dropping off clothes and laptop bag",
        "id_type": "Aadhaar Card",
        "id_number": "XXXX-XXXX-1144",
        "visit_date": date.today().isoformat(),
        "expected_time": "06:00 PM - 08:00 PM",
        "expected_duration_hours": 2,
        "is_overnight": False,
        "pass_code": "VP-8831",
        "status": "APPROVED",
        "check_in_time": None,
        "check_out_time": None,
        "checked_in_by": None,
        "checked_out_by": None,
        "rejection_reason": None,
        "approval_notes": "Pass valid till 8:30 PM. Please leave ID at reception during visit.",
        "owner_notes": "Approved by Warden.",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
    },
    {
        "id": "VIS-1005",
        "hostel_id": DEMO_HOSTEL_ID,
        "tenant_id": "TEN-1003",
        "tenant_name": "Sneha Reddy",
        "tenant_phone": "+91 98765 22222",
        "room_number": "Room 301",
        "bed_code": "Bed A",
        "visitor_name": "Kiran Rao",
        "visitor_phone": "+91 91234 99887",
        "relationship": "Friend",
        "purpose": "Late night group study",
        "id_type": "College ID",
        "id_number": "COL-EN-3341",
        "visit_date": (date.today() - timedelta(days=2)).isoformat(),
        "expected_time": "10:30 PM - 02:00 AM",
        "expected_duration_hours": 4,
        "is_overnight": True,
        "pass_code": None,
        "status": "REJECTED",
        "check_in_time": None,
        "check_out_time": None,
        "checked_in_by": None,
        "checked_out_by": None,
        "rejection_reason": "Hostel visiting hours are restricted to 9:00 AM to 8:30 PM. Overnight guest requests require 48 hours prior parent letter.",
        "approval_notes": None,
        "owner_notes": "Parent permission not provided for late night stay.",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2, hours=10)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=2, hours=6)).isoformat(),
    },
]


class VisitorsRepository:
    """Thread-safe Visitor Request & Gate Security Repository."""

    def __init__(self):
        self._lock = threading.Lock()
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(VISITORS_JSON_PATH):
            self._write_visitors(INITIAL_VISITORS_SEED)
        else:
            try:
                with open(VISITORS_JSON_PATH, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if not content:
                        self._write_visitors(INITIAL_VISITORS_SEED)
            except Exception as e:
                logger.error(f"Error initializing visitors.json: {e}")
                self._write_visitors(INITIAL_VISITORS_SEED)

    def _read_visitors(self) -> List[Dict[str, Any]]:
        with self._lock:
            try:
                if os.path.exists(VISITORS_JSON_PATH):
                    with open(VISITORS_JSON_PATH, "r", encoding="utf-8") as f:
                        return json.load(f)
            except Exception as e:
                logger.error(f"Error reading {VISITORS_JSON_PATH}: {e}")
            return list(INITIAL_VISITORS_SEED)

    def _write_visitors(self, records: List[Dict[str, Any]]):
        with self._lock:
            try:
                with open(VISITORS_JSON_PATH, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2, default=str)
            except Exception as e:
                logger.error(f"Error writing to {VISITORS_JSON_PATH}: {e}")

    def _try_sync_supabase(self, visitor_record: Dict[str, Any]):
        """Non-blocking background sync with Supabase PostgreSQL."""
        def _sync():
            try:
                from app import get_db_client
                db = get_db_client()
                db.table("visitors").upsert(visitor_record).execute()
                logger.info(f"Synchronized visitor {visitor_record.get('id')} to Supabase.")
            except Exception as e:
                # Expected when table does not exist or network unavailable
                logger.debug(f"Supabase visitors sync skipped/unavailable: {e}")

        t = threading.Thread(target=_sync, daemon=True)
        t.start()

    # =========================================================================
    # TENANT METHODS (Strict Isolation & Sanitization)
    # =========================================================================

    def _sanitize_for_tenant(self, rec: Dict[str, Any]) -> Dict[str, Any]:
        """Strip internal owner notes and confidential staff remarks."""
        sanitized = dict(rec)
        sanitized.pop("owner_notes", None)
        return sanitized

    def get_tenant_visitors(
        self,
        hostel_id: str,
        tenant_id_filters: List[str]
    ) -> List[Dict[str, Any]]:
        """List visitor requests for the requesting tenant only."""
        valid_filters = {str(f).strip().lower() for f in tenant_id_filters if f}
        records = self._read_visitors()
        matched = []

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue
            rec_tid = str(r.get("tenant_id") or "").strip().lower()
            rec_tname = str(r.get("tenant_name") or "").strip().lower()
            if rec_tid in valid_filters or any(vf in rec_tname for vf in valid_filters if len(vf) > 4):
                matched.append(self._sanitize_for_tenant(r))

        # Sort newest first
        matched.sort(key=lambda x: (x.get("visit_date") or "", x.get("created_at") or ""), reverse=True)
        return matched

    def get_tenant_visitor_summary(
        self,
        hostel_id: str,
        tenant_id_filters: List[str]
    ) -> Dict[str, int]:
        """Calculates tenant KPI counters."""
        visitors = self.get_tenant_visitors(hostel_id, tenant_id_filters)
        pending = sum(1 for v in visitors if v.get("status") == "PENDING_APPROVAL")
        approved = sum(1 for v in visitors if v.get("status") == "APPROVED")
        inside = sum(1 for v in visitors if v.get("status") == "CHECKED_IN")
        checked_out = sum(1 for v in visitors if v.get("status") == "CHECKED_OUT")

        return {
            "pending": pending,
            "approved": approved,
            "inside": inside,
            "checked_out": checked_out,
            "total": len(visitors),
        }

    def get_tenant_visitor_by_id(
        self,
        visitor_id: str,
        hostel_id: str,
        tenant_id_filters: List[str]
    ) -> Optional[Dict[str, Any]]:
        """Fetch single visitor details for tenant."""
        valid_filters = {str(f).strip().lower() for f in tenant_id_filters if f}
        records = self._read_visitors()
        for r in records:
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec_tid = str(r.get("tenant_id") or "").strip().lower()
                rec_tname = str(r.get("tenant_name") or "").strip().lower()
                if rec_tid in valid_filters or any(vf in rec_tname for vf in valid_filters if len(vf) > 4):
                    return self._sanitize_for_tenant(r)
                return None
        return None

    def create_tenant_visitor_request(
        self,
        data: Dict[str, Any],
        hostel_id: str,
        tenant_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new visitor request submitted by resident."""
        now_iso = datetime.now(timezone.utc).isoformat()
        records = self._read_visitors()

        # Generate unique ID
        existing_ids = {r.get("id") for r in records}
        candidate_num = 1001 + len(records)
        while f"VIS-{candidate_num}" in existing_ids:
            candidate_num += 1
        new_id = f"VIS-{candidate_num}"

        tenant_name = tenant_profile.get("full_name") or "Hostel Resident"
        tenant_id = tenant_profile.get("user_code") or tenant_profile.get("auth_user_id") or "TEN-1001"
        tenant_phone = tenant_profile.get("phone") or ""
        room_number = tenant_profile.get("room_number") or "Room 204"
        bed_code = tenant_profile.get("bed_code") or "Bed A"

        visit_date = data.get("visit_date") or date.today().isoformat()
        expected_time = str(data.get("expected_time") or "14:00").strip()
        duration_hrs = int(data.get("expected_duration_hours") or 2)
        is_overnight = bool(data.get("is_overnight") or False)

        visitor_record = {
            "id": new_id,
            "hostel_id": hostel_id or DEMO_HOSTEL_ID,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "tenant_phone": tenant_phone,
            "room_number": room_number,
            "bed_code": bed_code,
            "visitor_name": str(data.get("visitor_name") or "").strip(),
            "visitor_phone": str(data.get("visitor_phone") or "").strip(),
            "relationship": str(data.get("relationship") or "Friend").strip(),
            "purpose": str(data.get("purpose") or "Personal Visit").strip(),
            "id_type": str(data.get("id_type") or "Aadhaar Card").strip(),
            "id_number": str(data.get("id_number") or "").strip(),
            "visit_date": visit_date,
            "expected_time": expected_time,
            "expected_duration_hours": duration_hrs,
            "is_overnight": is_overnight,
            "pass_code": None,
            "status": "PENDING_APPROVAL",
            "check_in_time": None,
            "check_out_time": None,
            "checked_in_by": None,
            "checked_out_by": None,
            "rejection_reason": None,
            "approval_notes": None,
            "owner_notes": None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        records.insert(0, visitor_record)
        self._write_visitors(records)
        self._try_sync_supabase(visitor_record)

        logger.info(f"Visitor request {new_id} created by {tenant_name} for visitor {visitor_record['visitor_name']}")
        return self._sanitize_for_tenant(visitor_record)

    def cancel_tenant_visitor_request(
        self,
        visitor_id: str,
        hostel_id: str,
        tenant_id_filters: List[str]
    ) -> Optional[Dict[str, Any]]:
        """Tenant cancels their own pending or approved request before entry."""
        valid_filters = {str(f).strip().lower() for f in tenant_id_filters if f}
        records = self._read_visitors()
        now_iso = datetime.now(timezone.utc).isoformat()
        updated_rec = None

        for idx, r in enumerate(records):
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec_tid = str(r.get("tenant_id") or "").strip().lower()
                rec_tname = str(r.get("tenant_name") or "").strip().lower()
                if not (rec_tid in valid_filters or any(vf in rec_tname for vf in valid_filters if len(vf) > 4)):
                    return None

                if r.get("status") in ["CHECKED_IN", "CHECKED_OUT"]:
                    raise ValueError("Cannot cancel a visitor request that is already checked in or completed.")

                rec = dict(r)
                rec["status"] = "CANCELLED"
                rec["updated_at"] = now_iso
                records[idx] = rec
                updated_rec = rec
                break

        if updated_rec:
            self._write_visitors(records)
            self._try_sync_supabase(updated_rec)
            return self._sanitize_for_tenant(updated_rec)

        return None

    # =========================================================================
    # OWNER & RECEPTION METHODS
    # =========================================================================

    def get_owner_visitors(
        self,
        hostel_id: str,
        status_filter: str = "ALL",
        date_filter: str = "ALL",
        search_query: str = ""
    ) -> Dict[str, Any]:
        """
        List all visitors for owner/reception with stats summary and search.
        """
        records = self._read_visitors()
        today_str = date.today().isoformat()

        # Summary KPIs across all records for this hostel
        pending_cnt = 0
        approved_cnt = 0
        inside_cnt = 0
        checked_out_today_cnt = 0
        total_cnt = 0

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue
            total_cnt += 1
            st = r.get("status")
            if st == "PENDING_APPROVAL":
                pending_cnt += 1
            elif st == "APPROVED":
                approved_cnt += 1
            elif st == "CHECKED_IN":
                inside_cnt += 1
            elif st == "CHECKED_OUT":
                chk_out = str(r.get("check_out_time") or "")
                if chk_out.startswith(today_str) or r.get("visit_date") == today_str:
                    checked_out_today_cnt += 1

        # Apply filtering
        filtered = []
        sq = search_query.strip().lower()

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue

            # Status filter
            st = r.get("status")
            if status_filter and status_filter.upper() != "ALL":
                target_st = status_filter.upper()
                if target_st == "INSIDE" and st != "CHECKED_IN":
                    continue
                elif target_st == "ACTIVE" and st not in ["APPROVED", "CHECKED_IN"]:
                    continue
                elif target_st != "INSIDE" and target_st != "ACTIVE" and st != target_st:
                    continue

            # Date filter
            vdate = r.get("visit_date") or ""
            if date_filter == "TODAY" and vdate != today_str:
                continue
            elif date_filter == "UPCOMING" and vdate < today_str:
                continue
            elif date_filter == "PAST" and vdate >= today_str:
                continue

            # Search query
            if sq:
                haystack = " ".join([
                    r.get("id") or "",
                    r.get("visitor_name") or "",
                    r.get("visitor_phone") or "",
                    r.get("tenant_name") or "",
                    r.get("room_number") or "",
                    r.get("pass_code") or "",
                    r.get("relationship") or "",
                    r.get("purpose") or "",
                ]).lower()
                if sq not in haystack:
                    continue

            filtered.append(r)

        # Sort: CHECKED_IN first, then PENDING_APPROVAL, then by date desc
        status_priority = {
            "CHECKED_IN": 0,
            "PENDING_APPROVAL": 1,
            "APPROVED": 2,
            "CHECKED_OUT": 3,
            "REJECTED": 4,
            "CANCELLED": 5,
            "EXPIRED": 6,
        }
        filtered.sort(
            key=lambda x: (
                status_priority.get(x.get("status"), 99),
                x.get("visit_date") or "",
                x.get("created_at") or "",
            ),
            reverse=False,
        )

        return {
            "visitors": filtered,
            "summary": {
                "pending": pending_cnt,
                "approved": approved_cnt,
                "inside": inside_cnt,
                "checked_out_today": checked_out_today_cnt,
                "total": total_cnt,
            },
        }

    def get_owner_visitor_by_id(
        self,
        visitor_id: str,
        hostel_id: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch single visitor record for owner."""
        records = self._read_visitors()
        for r in records:
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                return dict(r)
        return None

    def approve_visitor(
        self,
        visitor_id: str,
        hostel_id: str,
        approval_notes: str = "",
        owner_notes: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Owner/Reception approves request and issues a digital pass code.
        """
        records = self._read_visitors()
        now_iso = datetime.now(timezone.utc).isoformat()
        updated = None

        for idx, r in enumerate(records):
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec = dict(r)
                rec["status"] = "APPROVED"
                if not rec.get("pass_code"):
                    rec["pass_code"] = generate_pass_code()
                if approval_notes:
                    rec["approval_notes"] = approval_notes.strip()
                if owner_notes:
                    existing_notes = rec.get("owner_notes") or ""
                    rec["owner_notes"] = f"{existing_notes}\n[Approved]: {owner_notes.strip()}".strip()
                rec["updated_at"] = now_iso
                records[idx] = rec
                updated = rec
                break

        if updated:
            self._write_visitors(records)
            self._try_sync_supabase(updated)
            logger.info(f"Visitor request {visitor_id} approved with pass code {updated.get('pass_code')}")
            return updated

        return None

    def reject_visitor(
        self,
        visitor_id: str,
        hostel_id: str,
        rejection_reason: str,
        owner_notes: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Owner/Reception rejects request with reason visible to tenant.
        """
        records = self._read_visitors()
        now_iso = datetime.now(timezone.utc).isoformat()
        updated = None

        for idx, r in enumerate(records):
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec = dict(r)
                rec["status"] = "REJECTED"
                rec["rejection_reason"] = rejection_reason.strip()
                if owner_notes:
                    existing = rec.get("owner_notes") or ""
                    rec["owner_notes"] = f"{existing}\n[Rejected]: {owner_notes.strip()}".strip()
                rec["updated_at"] = now_iso
                records[idx] = rec
                updated = rec
                break

        if updated:
            self._write_visitors(records)
            self._try_sync_supabase(updated)
            logger.info(f"Visitor request {visitor_id} rejected: {rejection_reason}")
            return updated

        return None

    def check_in_visitor(
        self,
        visitor_id: str,
        hostel_id: str,
        check_in_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Record visitor arrival / gate check-in.
        Sets status = CHECKED_IN, records check_in_time, guard name, ID verification.
        """
        records = self._read_visitors()
        now_iso = datetime.now(timezone.utc).isoformat()
        data = check_in_data or {}
        updated = None

        for idx, r in enumerate(records):
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec = dict(r)
                rec["status"] = "CHECKED_IN"
                rec["check_in_time"] = now_iso
                rec["checked_in_by"] = str(data.get("checked_in_by") or "Security Reception Desk").strip()
                if data.get("id_number"):
                    rec["id_number"] = str(data["id_number"]).strip()
                if data.get("owner_notes"):
                    existing = rec.get("owner_notes") or ""
                    rec["owner_notes"] = f"{existing}\n[Check-in]: {data['owner_notes']}".strip()
                rec["updated_at"] = now_iso
                records[idx] = rec
                updated = rec
                break

        if updated:
            self._write_visitors(records)
            self._try_sync_supabase(updated)
            logger.info(f"Visitor {visitor_id} ({updated.get('visitor_name')}) checked in.")
            return updated

        return None

    def check_out_visitor(
        self,
        visitor_id: str,
        hostel_id: str,
        check_out_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Record visitor exit / gate check-out.
        Sets status = CHECKED_OUT, records check_out_time.
        """
        records = self._read_visitors()
        now_iso = datetime.now(timezone.utc).isoformat()
        data = check_out_data or {}
        updated = None

        for idx, r in enumerate(records):
            if r.get("id") == visitor_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                rec = dict(r)
                rec["status"] = "CHECKED_OUT"
                rec["check_out_time"] = now_iso
                rec["checked_out_by"] = str(data.get("checked_out_by") or "Security Reception Desk").strip()
                if data.get("owner_notes"):
                    existing = rec.get("owner_notes") or ""
                    rec["owner_notes"] = f"{existing}\n[Check-out]: {data['owner_notes']}".strip()
                rec["updated_at"] = now_iso
                records[idx] = rec
                updated = rec
                break

        if updated:
            self._write_visitors(records)
            self._try_sync_supabase(updated)
            logger.info(f"Visitor {visitor_id} ({updated.get('visitor_name')}) checked out.")
            return updated

        return None

    def create_walk_in_visitor(
        self,
        data: Dict[str, Any],
        hostel_id: str
    ) -> Dict[str, Any]:
        """
        Direct walk-in registration at reception.
        Instantly approves and checks in visitor.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        records = self._read_visitors()

        existing_ids = {r.get("id") for r in records}
        candidate_num = 1001 + len(records)
        while f"VIS-{candidate_num}" in existing_ids:
            candidate_num += 1
        new_id = f"VIS-{candidate_num}"

        pass_code = generate_pass_code()
        visit_date = data.get("visit_date") or date.today().isoformat()
        expected_time = str(data.get("expected_time") or "Walk-in").strip()
        duration_hrs = int(data.get("expected_duration_hours") or 2)

        # Immediate check-in flag
        auto_check_in = bool(data.get("auto_check_in", True))
        status = "CHECKED_IN" if auto_check_in else "APPROVED"

        visitor_record = {
            "id": new_id,
            "hostel_id": hostel_id or DEMO_HOSTEL_ID,
            "tenant_id": str(data.get("tenant_id") or "TEN-1001").strip(),
            "tenant_name": str(data.get("tenant_name") or "Hostel Resident").strip(),
            "tenant_phone": str(data.get("tenant_phone") or "").strip(),
            "room_number": str(data.get("room_number") or "Room 204").strip(),
            "bed_code": str(data.get("bed_code") or "Bed A").strip(),
            "visitor_name": str(data.get("visitor_name") or "").strip(),
            "visitor_phone": str(data.get("visitor_phone") or "").strip(),
            "relationship": str(data.get("relationship") or "Other").strip(),
            "purpose": str(data.get("purpose") or "Walk-in Reception Visit").strip(),
            "id_type": str(data.get("id_type") or "Aadhaar Card").strip(),
            "id_number": str(data.get("id_number") or "").strip(),
            "visit_date": visit_date,
            "expected_time": expected_time,
            "expected_duration_hours": duration_hrs,
            "is_overnight": bool(data.get("is_overnight") or False),
            "pass_code": pass_code,
            "status": status,
            "check_in_time": now_iso if auto_check_in else None,
            "check_out_time": None,
            "checked_in_by": str(data.get("checked_in_by") or "Reception Desk").strip() if auto_check_in else None,
            "checked_out_by": None,
            "rejection_reason": None,
            "approval_notes": "Walk-in registered at reception.",
            "owner_notes": str(data.get("owner_notes") or "Walk-in logged.").strip(),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        records.insert(0, visitor_record)
        self._write_visitors(records)
        self._try_sync_supabase(visitor_record)

        logger.info(f"Walk-in visitor {new_id} ({visitor_record['visitor_name']}) registered with status {status}")
        return visitor_record

    def get_dashboard_counts(self, hostel_id: str) -> Dict[str, int]:
        """Live counters for owner dashboard cards."""
        records = self._read_visitors()
        inside_cnt = sum(
            1 for r in records
            if (not hostel_id or r.get("hostel_id") == hostel_id)
            and r.get("status") == "CHECKED_IN"
        )
        pending_cnt = sum(
            1 for r in records
            if (not hostel_id or r.get("hostel_id") == hostel_id)
            and r.get("status") == "PENDING_APPROVAL"
        )
        return {
            "inside_now": inside_cnt,
            "pending_approval": pending_cnt,
        }


# Singleton instance
_visitors_repo: Optional[VisitorsRepository] = None


def get_visitors_repo() -> VisitorsRepository:
    global _visitors_repo
    if _visitors_repo is None:
        _visitors_repo = VisitorsRepository()
    return _visitors_repo
