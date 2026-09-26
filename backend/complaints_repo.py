"""
UrbanNest Hostel CRM - Complaints & Maintenance Repository
Dual persistence: Thread-safe local JSON storage + Supabase PostgreSQL synchronization.
Handles tenant complaints, owner assignment/notes, status transitions,
and conversion/linking to maintenance work orders.
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone, date

logger = logging.getLogger("hostel_crm.complaints")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
COMPLAINTS_FILE = os.path.join(DATA_DIR, "complaints.json")
MAINTENANCE_FILE = os.path.join(DATA_DIR, "maintenance.json")

# Allowed complaint categories
ALLOWED_CATEGORIES = [
    "Internet / WiFi",
    "Water",
    "Electricity",
    "Plumbing",
    "Cleaning",
    "Food",
    "Furniture",
    "Room Maintenance",
    "Security",
    "Other",
]

# Allowed priority levels
TENANT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"]
MAINTENANCE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"]

# Allowed statuses
COMPLAINT_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]
MAINTENANCE_STATUSES = ["OPEN", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

# Initial seed complaints
INITIAL_SEED_COMPLAINTS = [
    {
        "id": "CMP-9001",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "tenant_id": "TEN-101",
        "tenant_name": "Rahul Kumar",
        "room_number": "Room 204 (Bed A)",
        "category": "Plumbing",
        "title": "Low water pressure in attached washroom",
        "description": "The shower and health faucet in bathroom 204 have very low pressure since yesterday morning.",
        "location": "Room 204 / Bed A",
        "priority": "MEDIUM",
        "status": "IN_PROGRESS",
        "assigned_to": "Plumber (Ramesh)",
        "owner_notes": "Plumber visited at 11 AM. Replacement valve required for the floor booster pump line.",
        "tenant_visible_notes": "Plumbing technician Ramesh has inspected the line. Spare valve being fitted today.",
        "created_at": "2026-09-24T09:30:00Z",
        "updated_at": "2026-09-25T14:15:00Z",
        "resolved_at": None,
    },
    {
        "id": "CMP-9002",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "tenant_id": "TEN-102",
        "tenant_name": "Priya Reddy",
        "room_number": "Room 302 (Bed A)",
        "category": "Electricity",
        "title": "Study lamp power socket sparking",
        "description": "The left 3-pin wall socket near the study desk sparks when plugging in the laptop charger.",
        "location": "Room 302 / Bed A",
        "priority": "HIGH",
        "status": "ASSIGNED",
        "assigned_to": "Electrician (Suresh)",
        "owner_notes": "Safety hazard. Instructed tenant not to use socket. Suresh will visit this afternoon.",
        "tenant_visible_notes": "Work order issued to licensed electrician. Please keep the switch turned off until inspected.",
        "created_at": "2026-09-25T16:00:00Z",
        "updated_at": "2026-09-26T08:00:00Z",
        "resolved_at": None,
    },
    {
        "id": "CMP-9003",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "tenant_id": "TEN-103",
        "tenant_name": "Arjun Mehta",
        "room_number": "Room 101 (Bed A)",
        "category": "Cleaning",
        "title": "Balcony dustbin not emptied",
        "description": "Common balcony trash has accumulated over two days.",
        "location": "Common Area",
        "priority": "LOW",
        "status": "RESOLVED",
        "assigned_to": "Cleaning Staff",
        "owner_notes": "Housekeeping team alerted and bin sanitized.",
        "tenant_visible_notes": "Housekeeping has cleared the balcony dustbin and sanitized the area.",
        "created_at": "2026-09-23T11:00:00Z",
        "updated_at": "2026-09-23T15:30:00Z",
        "resolved_at": "2026-09-23T15:30:00Z",
    },
    {
        "id": "CMP-9004",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "tenant_id": "TEN-101",
        "tenant_name": "Rahul Kumar",
        "room_number": "Room 204 (Bed A)",
        "category": "Food",
        "title": "Dinner timing delay feedback",
        "description": "Dinner was served 45 minutes late on Wednesday evening.",
        "location": "Dining Area",
        "priority": "LOW",
        "status": "CLOSED",
        "assigned_to": "Manager",
        "owner_notes": "Catering team warned about maintaining strict 7:30 PM schedule.",
        "tenant_visible_notes": "Discussed with chef and mess vendor. Serving times strictly enforced now.",
        "created_at": "2026-09-20T21:00:00Z",
        "updated_at": "2026-09-21T10:00:00Z",
        "resolved_at": "2026-09-21T10:00:00Z",
    },
]

# Initial seed maintenance tasks
INITIAL_SEED_MAINTENANCE = [
    {
        "id": "MNT-5001",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "complaint_id": "CMP-9001",
        "title": "Replace 2nd floor bathroom pressure booster valve",
        "description": "Install new 1-inch brass non-return pressure valve for Room 204 waterline.",
        "location": "Room 204 / Plumbing Shaft",
        "priority": "HIGH",
        "assigned_to": "Plumber (Ramesh)",
        "status": "IN_PROGRESS",
        "scheduled_date": "2026-09-26",
        "due_date": "2026-09-27",
        "completed_at": None,
        "notes": "Parts procured from hardware store (Receipt #HW-889). Work ongoing.",
        "created_at": "2026-09-25T14:00:00Z",
        "updated_at": "2026-09-26T09:00:00Z",
    },
    {
        "id": "MNT-5002",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "complaint_id": None,
        "title": "Overhead water tank bi-monthly chlorination & cleaning",
        "description": "Empty, scrub, pressure wash, and sanitize main 5000L overhead water reservoirs.",
        "location": "Hostel Rooftop",
        "priority": "URGENT",
        "assigned_to": "CleanAqua Services (Vendor)",
        "status": "SCHEDULED",
        "scheduled_date": "2026-09-28",
        "due_date": "2026-09-28",
        "completed_at": None,
        "notes": "Notify residents 24 hours in advance regarding 2-hour water supply pause.",
        "created_at": "2026-09-22T10:00:00Z",
        "updated_at": "2026-09-22T10:00:00Z",
    },
    {
        "id": "MNT-5003",
        "hostel_id": "11111111-1111-1111-1111-111111111111",
        "complaint_id": None,
        "title": "Ground floor corridor LED tube light replacements",
        "description": "Replace 4 flickering 20W LED fixtures with energy-efficient Phillips batten lights.",
        "location": "Ground Floor Corridor",
        "priority": "LOW",
        "assigned_to": "Electrician (Suresh)",
        "status": "COMPLETED",
        "scheduled_date": "2026-09-21",
        "due_date": "2026-09-22",
        "completed_at": "2026-09-22T16:00:00Z",
        "notes": "Completed and tested. All lights functioning properly.",
        "created_at": "2026-09-20T12:00:00Z",
        "updated_at": "2026-09-22T16:00:00Z",
    },
]


class ComplaintsMaintenanceRepository:
    """Thread-safe complaints and maintenance repository with dual-persistence."""

    _lock = threading.Lock()

    def __init__(self, db_client=None):
        self.db = db_client
        os.makedirs(DATA_DIR, exist_ok=True)
        self._init_files()

    def _init_files(self):
        with self._lock:
            if not os.path.exists(COMPLAINTS_FILE):
                with open(COMPLAINTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(INITIAL_SEED_COMPLAINTS, f, indent=2, ensure_ascii=False)
                logger.info(f"Initialized {COMPLAINTS_FILE} with seed complaints.")

            if not os.path.exists(MAINTENANCE_FILE):
                with open(MAINTENANCE_FILE, "w", encoding="utf-8") as f:
                    json.dump(INITIAL_SEED_MAINTENANCE, f, indent=2, ensure_ascii=False)
                logger.info(f"Initialized {MAINTENANCE_FILE} with seed maintenance tasks.")

    def _read_complaints(self) -> list:
        with self._lock:
            try:
                if os.path.exists(COMPLAINTS_FILE):
                    with open(COMPLAINTS_FILE, "r", encoding="utf-8") as f:
                        return json.load(f)
            except Exception as e:
                logger.error(f"Error reading {COMPLAINTS_FILE}: {e}")
            return list(INITIAL_SEED_COMPLAINTS)

    def _write_complaints(self, records: list):
        with self._lock:
            try:
                with open(COMPLAINTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error writing {COMPLAINTS_FILE}: {e}")

    def _read_maintenance(self) -> list:
        with self._lock:
            try:
                if os.path.exists(MAINTENANCE_FILE):
                    with open(MAINTENANCE_FILE, "r", encoding="utf-8") as f:
                        return json.load(f)
            except Exception as e:
                logger.error(f"Error reading {MAINTENANCE_FILE}: {e}")
            return list(INITIAL_SEED_MAINTENANCE)

    def _write_maintenance(self, records: list):
        with self._lock:
            try:
                with open(MAINTENANCE_FILE, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Error writing {MAINTENANCE_FILE}: {e}")

    def _try_sync_supabase_complaint(self, record: dict):
        if not self.db:
            return
        try:
            self.db.table("complaints").upsert(record).execute()
        except Exception as e:
            logger.debug(f"Complaints Supabase sync note (using local storage): {e}")

    def _try_sync_supabase_maintenance(self, record: dict):
        if not self.db:
            return
        try:
            self.db.table("maintenance_tasks").upsert(record).execute()
        except Exception as e:
            logger.debug(f"Maintenance Supabase sync note (using local storage): {e}")

    # =========================================================================
    # TENANT COMPLAINT METHODS
    # =========================================================================

    def get_tenant_complaints(self, hostel_id: str, tenant_id_filters: list) -> list:
        """
        Get all complaints belonging strictly to the authenticated tenant.
        Masks out internal owner_notes so the tenant NEVER sees staff-only notes.
        """
        clean_filters = [str(f).strip().lower() for f in (tenant_id_filters or []) if f]
        records = self._read_complaints()

        results = []
        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue

            r_tid = str(r.get("tenant_id") or "").strip().lower()
            r_tname = str(r.get("tenant_name") or "").strip().lower()

            matches = any(f in r_tid or f in r_tname for f in clean_filters)
            if not clean_filters or matches:
                # Mask out owner_notes
                sanitized = dict(r)
                sanitized.pop("owner_notes", None)
                results.append(sanitized)

        # Sort newest first
        results.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return results

    def get_tenant_complaint_summary(self, hostel_id: str, tenant_id_filters: list) -> dict:
        """Get summary KPI counts for tenant's complaints."""
        complaints = self.get_tenant_complaints(hostel_id, tenant_id_filters)

        open_cnt = 0
        in_progress_cnt = 0
        resolved_cnt = 0
        total_cnt = len(complaints)

        for c in complaints:
            st = (c.get("status") or "OPEN").upper()
            if st in ["OPEN", "ASSIGNED"]:
                open_cnt += 1
            elif st == "IN_PROGRESS":
                in_progress_cnt += 1
            elif st in ["RESOLVED", "CLOSED"]:
                resolved_cnt += 1

        return {
            "open": open_cnt,
            "in_progress": in_progress_cnt,
            "resolved": resolved_cnt,
            "total": total_cnt,
        }

    def get_tenant_complaint_by_id(self, complaint_id: str, hostel_id: str, tenant_id_filters: list) -> dict:
        """Get single complaint detail strictly verified for the tenant."""
        clean_filters = [str(f).strip().lower() for f in (tenant_id_filters or []) if f]
        records = self._read_complaints()

        for r in records:
            if r.get("id") == complaint_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                r_tid = str(r.get("tenant_id") or "").strip().lower()
                r_tname = str(r.get("tenant_name") or "").strip().lower()
                if clean_filters and not any(f in r_tid or f in r_tname for f in clean_filters):
                    return None
                sanitized = dict(r)
                sanitized.pop("owner_notes", None)
                return sanitized
        return None

    def create_tenant_complaint(self, data: dict, hostel_id: str, tenant_profile: dict) -> dict:
        """
        Create a new complaint raised by the authenticated resident.
        Initial status: OPEN.
        Validates category, priority, and automatically binds tenant identity.
        """
        category = str(data.get("category") or "Other").strip()
        if category not in ALLOWED_CATEGORIES:
            category = "Other"

        title = str(data.get("title") or "").strip()
        description = str(data.get("description") or "").strip()
        location = str(data.get("location") or "").strip()

        # Priority from tenant (only LOW, MEDIUM, HIGH allowed; no CRITICAL)
        priority = str(data.get("priority") or "MEDIUM").strip().upper()
        if priority not in TENANT_PRIORITIES:
            priority = "MEDIUM"

        tenant_id = str(tenant_profile.get("user_code") or tenant_profile.get("id") or "TEN-101").strip()
        tenant_name = str(tenant_profile.get("full_name") or "Hostel Resident").strip()
        room_number = str(tenant_profile.get("room_number") or "Room 204").strip()
        bed_code = str(tenant_profile.get("bed_code") or "").strip()
        if bed_code:
            room_number = f"{room_number} ({bed_code})"

        if not location:
            location = room_number

        now_iso = datetime.now(timezone.utc).isoformat()
        new_id = f"CMP-{round(datetime.now().timestamp() * 1000) % 90000 + 10000}"

        record = {
            "id": new_id,
            "hostel_id": hostel_id,
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "room_number": room_number,
            "category": category,
            "title": title,
            "description": description,
            "location": location,
            "priority": priority,
            "status": "OPEN",
            "assigned_to": "",
            "owner_notes": "",
            "tenant_visible_notes": "",
            "created_at": now_iso,
            "updated_at": now_iso,
            "resolved_at": None,
        }

        records = self._read_complaints()
        records.insert(0, record)
        self._write_complaints(records)
        self._try_sync_supabase_complaint(record)

        logger.info(f"New complaint raised: {new_id} by {tenant_name} ({tenant_id}) - {title}")
        sanitized = dict(record)
        sanitized.pop("owner_notes", None)
        return sanitized

    # =========================================================================
    # OWNER COMPLAINT METHODS
    # =========================================================================

    def get_owner_complaints(
        self,
        hostel_id: str,
        status_filter: str = "ALL",
        priority_filter: str = "ALL",
        search_query: str = "",
    ) -> dict:
        """
        Get all hostel complaints for owner with full details, filters, and summary KPIs.
        """
        records = self._read_complaints()
        maintenance_tasks = self._read_maintenance()

        # Build complaint_id -> maintenance task mapping
        m_map = {}
        for m in maintenance_tasks:
            cid = m.get("complaint_id")
            if cid:
                m_map[cid] = m

        open_cnt = 0
        assigned_cnt = 0
        in_progress_cnt = 0
        resolved_today_cnt = 0
        high_priority_cnt = 0

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        filtered = []
        status_filter = (status_filter or "ALL").upper().strip()
        priority_filter = (priority_filter or "ALL").upper().strip()
        query = (search_query or "").strip().lower()

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue

            st = (r.get("status") or "OPEN").upper()
            pri = (r.get("priority") or "MEDIUM").upper()

            # KPI calculations
            if st == "OPEN":
                open_cnt += 1
            elif st == "ASSIGNED":
                assigned_cnt += 1
            elif st == "IN_PROGRESS":
                in_progress_cnt += 1
            elif st in ["RESOLVED", "CLOSED"]:
                res_at = r.get("resolved_at") or r.get("updated_at") or ""
                if res_at.startswith(today_str):
                    resolved_today_cnt += 1

            if pri in ["HIGH", "URGENT"] and st not in ["RESOLVED", "CLOSED"]:
                high_priority_cnt += 1

            # Filter checks
            if status_filter != "ALL":
                if status_filter == "OPEN" and st != "OPEN":
                    continue
                elif status_filter == "ASSIGNED" and st != "ASSIGNED":
                    continue
                elif status_filter == "IN_PROGRESS" and st != "IN_PROGRESS":
                    continue
                elif status_filter == "RESOLVED" and st not in ["RESOLVED", "CLOSED"]:
                    continue
                elif status_filter == "HIGH_PRIORITY" and pri not in ["HIGH", "URGENT"]:
                    continue

            if priority_filter != "ALL" and pri != priority_filter:
                continue

            if query:
                t_name = str(r.get("tenant_name") or "").lower()
                r_room = str(r.get("room_number") or "").lower()
                c_id = str(r.get("id") or "").lower()
                title = str(r.get("title") or "").lower()
                desc = str(r.get("description") or "").lower()
                cat = str(r.get("category") or "").lower()
                if not (
                    query in t_name
                    or query in r_room
                    or query in c_id
                    or query in title
                    or query in desc
                    or query in cat
                ):
                    continue

            item = dict(r)
            if item.get("id") in m_map:
                item["linked_maintenance"] = {
                    "id": m_map[item["id"]].get("id"),
                    "status": m_map[item["id"]].get("status"),
                    "title": m_map[item["id"]].get("title"),
                    "assigned_to": m_map[item["id"]].get("assigned_to"),
                }
            filtered.append(item)

        # Sort newest first
        filtered.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        return {
            "complaints": filtered,
            "summary": {
                "open": open_cnt,
                "assigned": assigned_cnt,
                "in_progress": in_progress_cnt,
                "resolved_today": resolved_today_cnt,
                "high_priority": high_priority_cnt,
                "total": len(records),
            },
        }

    def get_owner_complaint_by_id(self, complaint_id: str, hostel_id: str) -> dict:
        """Find a single complaint for owner including internal notes and linked maintenance."""
        records = self._read_complaints()
        maintenance_tasks = self._read_maintenance()

        for r in records:
            if r.get("id") == complaint_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                item = dict(r)
                # Attach any linked maintenance tasks
                item["maintenance_tasks"] = [
                    m for m in maintenance_tasks if m.get("complaint_id") == complaint_id
                ]
                return item
        return None

    def update_owner_complaint(self, complaint_id: str, hostel_id: str, update_data: dict) -> dict:
        """
        Owner updates complaint: assign responsibility, set status, priority,
        internal owner notes, or tenant-visible resolution notes.
        """
        records = self._read_complaints()
        now_iso = datetime.now(timezone.utc).isoformat()

        updated_record = None
        for idx, r in enumerate(records):
            if r.get("id") == complaint_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None

                rec = dict(r)
                if "status" in update_data:
                    new_status = str(update_data["status"]).upper().strip()
                    if new_status in COMPLAINT_STATUSES:
                        rec["status"] = new_status
                        if new_status in ["RESOLVED", "CLOSED"] and not rec.get("resolved_at"):
                            rec["resolved_at"] = now_iso

                if "assigned_to" in update_data:
                    rec["assigned_to"] = str(update_data["assigned_to"]).strip()

                if "priority" in update_data:
                    new_priority = str(update_data["priority"]).upper().strip()
                    if new_priority in MAINTENANCE_PRIORITIES:
                        rec["priority"] = new_priority

                if "owner_notes" in update_data:
                    rec["owner_notes"] = str(update_data["owner_notes"]).strip()

                if "tenant_visible_notes" in update_data:
                    rec["tenant_visible_notes"] = str(update_data["tenant_visible_notes"]).strip()

                rec["updated_at"] = now_iso
                records[idx] = rec
                updated_record = rec
                break

        if updated_record:
            self._write_complaints(records)
            self._try_sync_supabase_complaint(updated_record)
            logger.info(f"Complaint {complaint_id} updated: status={updated_record.get('status')} assigned={updated_record.get('assigned_to')}")
            return updated_record

        return None

    # =========================================================================
    # OWNER MAINTENANCE METHODS
    # =========================================================================

    def get_owner_maintenance_tasks(
        self,
        hostel_id: str,
        status_filter: str = "ALL",
        priority_filter: str = "ALL",
        search_query: str = "",
    ) -> dict:
        """
        Get all maintenance work orders for owner with summary metrics.
        """
        records = self._read_maintenance()
        complaints = self._read_complaints()
        c_map = {c.get("id"): c for c in complaints}

        open_cnt = 0
        scheduled_cnt = 0
        in_progress_cnt = 0
        completed_cnt = 0
        urgent_cnt = 0

        filtered = []
        status_filter = (status_filter or "ALL").upper().strip()
        priority_filter = (priority_filter or "ALL").upper().strip()
        query = (search_query or "").strip().lower()

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue

            st = (r.get("status") or "OPEN").upper()
            pri = (r.get("priority") or "MEDIUM").upper()

            # KPI calculations
            if st == "OPEN":
                open_cnt += 1
            elif st == "SCHEDULED":
                scheduled_cnt += 1
            elif st == "IN_PROGRESS":
                in_progress_cnt += 1
            elif st == "COMPLETED":
                completed_cnt += 1

            if pri == "URGENT" and st != "COMPLETED":
                urgent_cnt += 1

            # Filter checks
            if status_filter != "ALL":
                if status_filter == "OPEN" and st != "OPEN":
                    continue
                elif status_filter == "SCHEDULED" and st != "SCHEDULED":
                    continue
                elif status_filter == "IN_PROGRESS" and st != "IN_PROGRESS":
                    continue
                elif status_filter == "COMPLETED" and st != "COMPLETED":
                    continue
                elif status_filter == "URGENT" and pri != "URGENT":
                    continue

            if priority_filter != "ALL" and pri != priority_filter:
                continue

            if query:
                t_title = str(r.get("title") or "").lower()
                t_loc = str(r.get("location") or "").lower()
                t_id = str(r.get("id") or "").lower()
                t_desc = str(r.get("description") or "").lower()
                t_assigned = str(r.get("assigned_to") or "").lower()
                cid = str(r.get("complaint_id") or "").lower()
                if not (
                    query in t_title
                    or query in t_loc
                    or query in t_id
                    or query in t_desc
                    or query in t_assigned
                    or query in cid
                ):
                    continue

            item = dict(r)
            # Attach related complaint summary if linked
            if item.get("complaint_id") and item["complaint_id"] in c_map:
                rel = c_map[item["complaint_id"]]
                item["complaint"] = {
                    "id": rel.get("id"),
                    "title": rel.get("title"),
                    "tenant_name": rel.get("tenant_name"),
                    "room_number": rel.get("room_number"),
                    "status": rel.get("status"),
                }
            filtered.append(item)

        # Sort newest first
        filtered.sort(key=lambda x: x.get("created_at") or "", reverse=True)

        return {
            "tasks": filtered,
            "summary": {
                "open": open_cnt,
                "scheduled": scheduled_cnt,
                "in_progress": in_progress_cnt,
                "completed": completed_cnt,
                "urgent": urgent_cnt,
                "total": len(records),
            },
        }

    def create_owner_maintenance_task(self, data: dict, hostel_id: str) -> dict:
        """
        Create a maintenance task manually or converted from a tenant complaint.
        If converted from complaint:
          - links complaint_id
          - if complaint was OPEN, can move it to ASSIGNED or IN_PROGRESS
        """
        title = str(data.get("title") or data.get("issue") or "").strip()
        description = str(data.get("description") or "").strip()
        location = str(data.get("location") or "Hostel Premises").strip()
        priority = str(data.get("priority") or "MEDIUM").strip().upper()
        if priority not in MAINTENANCE_PRIORITIES:
            priority = "MEDIUM"

        assigned_to = str(data.get("assigned_to") or "Maintenance Staff").strip()
        status = str(data.get("status") or "OPEN").strip().upper()
        if status not in MAINTENANCE_STATUSES:
            status = "OPEN"

        scheduled_date = data.get("scheduled_date") or None
        due_date = data.get("due_date") or None
        notes = str(data.get("notes") or "").strip()
        complaint_id = str(data.get("complaint_id") or "").strip() or None

        now_iso = datetime.now(timezone.utc).isoformat()
        new_id = f"MNT-{round(datetime.now().timestamp() * 1000) % 90000 + 10000}"

        task = {
            "id": new_id,
            "hostel_id": hostel_id,
            "complaint_id": complaint_id,
            "title": title,
            "description": description,
            "location": location,
            "priority": priority,
            "assigned_to": assigned_to,
            "status": status,
            "scheduled_date": scheduled_date,
            "due_date": due_date,
            "completed_at": None,
            "notes": notes,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        records = self._read_maintenance()
        records.insert(0, task)
        self._write_maintenance(records)
        self._try_sync_supabase_maintenance(task)

        # If linked to a complaint, optionally advance complaint status if still OPEN
        if complaint_id:
            complaint = self.get_owner_complaint_by_id(complaint_id, hostel_id)
            if complaint and complaint.get("status") == "OPEN":
                self.update_owner_complaint(
                    complaint_id,
                    hostel_id,
                    {
                        "status": "ASSIGNED",
                        "assigned_to": assigned_to,
                        "owner_notes": f"Converted to Maintenance Task {new_id}. {complaint.get('owner_notes') or ''}".strip(),
                    },
                )

        logger.info(f"Maintenance task created: {new_id} ({title}) - linked complaint: {complaint_id}")
        return task

    def update_owner_maintenance_task(self, task_id: str, hostel_id: str, update_data: dict) -> dict:
        """
        Update maintenance task status, schedule dates, notes, and completion.
        If status moved to IN_PROGRESS, optionally sets linked complaint to IN_PROGRESS.
        """
        records = self._read_maintenance()
        now_iso = datetime.now(timezone.utc).isoformat()

        updated_task = None
        for idx, r in enumerate(records):
            if r.get("id") == task_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None

                rec = dict(r)
                if "status" in update_data:
                    new_status = str(update_data["status"]).upper().strip()
                    if new_status in MAINTENANCE_STATUSES:
                        rec["status"] = new_status
                        if new_status == "COMPLETED" and not rec.get("completed_at"):
                            rec["completed_at"] = now_iso

                if "assigned_to" in update_data:
                    rec["assigned_to"] = str(update_data["assigned_to"]).strip()

                if "priority" in update_data:
                    new_priority = str(update_data["priority"]).upper().strip()
                    if new_priority in MAINTENANCE_PRIORITIES:
                        rec["priority"] = new_priority

                if "scheduled_date" in update_data:
                    rec["scheduled_date"] = update_data["scheduled_date"]

                if "due_date" in update_data:
                    rec["due_date"] = update_data["due_date"]

                if "notes" in update_data:
                    rec["notes"] = str(update_data["notes"]).strip()

                if "description" in update_data:
                    rec["description"] = str(update_data["description"]).strip()

                if "title" in update_data:
                    rec["title"] = str(update_data["title"]).strip()

                rec["updated_at"] = now_iso
                records[idx] = rec
                updated_task = rec
                break

        if updated_task:
            self._write_maintenance(records)
            self._try_sync_supabase_maintenance(updated_task)

            # Check if linked complaint should be moved to IN_PROGRESS
            cid = updated_task.get("complaint_id")
            if cid and updated_task.get("status") == "IN_PROGRESS":
                c = self.get_owner_complaint_by_id(cid, hostel_id)
                if c and c.get("status") in ["OPEN", "ASSIGNED"]:
                    self.update_owner_complaint(
                        cid,
                        hostel_id,
                        {
                            "status": "IN_PROGRESS",
                            "tenant_visible_notes": c.get("tenant_visible_notes")
                            or "Maintenance work order has commenced.",
                        },
                    )

            logger.info(f"Maintenance task {task_id} updated: status={updated_task.get('status')}")
            return updated_task

        return None

    # =========================================================================
    # DASHBOARD COUNTS
    # =========================================================================

    def get_dashboard_counts(self, hostel_id: str) -> dict:
        """Get live open complaints and maintenance attention count for owner dashboard."""
        complaints = self._read_complaints()
        maintenance = self._read_maintenance()

        open_complaints_count = sum(
            1 for c in complaints
            if (not hostel_id or c.get("hostel_id") == hostel_id)
            and c.get("status") in ["OPEN", "ASSIGNED", "IN_PROGRESS"]
        )

        maintenance_attention_count = sum(
            1 for m in maintenance
            if (not hostel_id or m.get("hostel_id") == hostel_id)
            and m.get("status") in ["OPEN", "SCHEDULED", "IN_PROGRESS"]
        )

        return {
            "open_complaints": open_complaints_count,
            "maintenance_attention": maintenance_attention_count,
        }
