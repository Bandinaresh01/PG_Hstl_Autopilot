"""
Complaints & Maintenance Repository & Supabase Data Store
Provides persistent, authoritative operational complaint tickets and maintenance tasks
for both Owner CRM and Tenant Portal.
"""

import logging
import uuid
from datetime import datetime, timezone, date

logger = logging.getLogger("complaints_repo")


class ComplaintsMaintenanceRepository:
    def __init__(self, db_client=None):
        self.db = db_client

    # =========================================================================
    # TENANT COMPLAINT METHODS
    # =========================================================================

    def get_tenant_complaints(self, hostel_id: str, tenant_id_filters: list) -> list:
        """
        Get all complaints belonging strictly to the authenticated tenant.
        Masks out internal owner_notes so the tenant NEVER sees staff-only notes.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("complaints").select("*").eq("hostel_id", hostel_id)
            if tenant_id_filters and len(tenant_id_filters) == 1:
                query = query.eq("tenant_id", tenant_id_filters[0])
            elif tenant_id_filters:
                query = query.in_("tenant_id", tenant_id_filters)

            res = query.order("created_at", desc=True).execute()
            records = res.data or []

            safe_list = []
            for c in records:
                c_copy = dict(c)
                # Strip staff internal notes for privacy
                c_copy.pop("owner_notes", None)
                safe_list.append(c_copy)

            return safe_list

        except Exception as e:
            logger.error(f"Error fetching tenant complaints: {e}")
            return []

    def create_tenant_complaint(self, data: dict, hostel_id: str, tenant_id: str = None, tenant_profile: dict = None) -> dict:
        """
        Tenant submits a new complaint ticket.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        t_id = tenant_id or (tenant_profile.get("tenant_id") if tenant_profile else None) or (tenant_profile.get("id") if tenant_profile else None)

        title = (data.get("title") or "").strip()
        category = (data.get("category") or "OTHER").upper()
        description = (data.get("description") or "").strip()
        location = (data.get("location") or "").strip()
        priority = (data.get("priority") or "MEDIUM").upper()

        if not title:
            raise ValueError("Complaint title is required.")

        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "hostel_id": hostel_id,
            "tenant_id": t_id,
            "category": category,
            "title": title,
            "description": description or None,
            "location": location or None,
            "priority": priority,
            "status": "OPEN",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.db.table("complaints").insert(payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to submit complaint")

        # Automatically create linked maintenance task if URGENT or HIGH priority
        created_complaint = res.data[0]
        if priority in ("URGENT", "HIGH"):
            try:
                task_payload = {
                    "hostel_id": hostel_id,
                    "complaint_id": created_complaint["id"],
                    "title": f"Fix: {title}",
                    "description": description or f"Urgent maintenance ticket from complaint {created_complaint['id']}",
                    "location": location or "Hostel Room/Floor",
                    "priority": priority,
                    "status": "OPEN",
                    "scheduled_date": date.today().isoformat(),
                }
                self.db.table("maintenance_tasks").insert(task_payload).execute()
            except Exception as task_err:
                logger.warning(f"Auto-maintenance task creation warning: {task_err}")

        return created_complaint

    # =========================================================================
    # OWNER COMPLAINT METHODS
    # =========================================================================

    def get_owner_complaints(
        self,
        hostel_id: str,
        status_filter: str = None,
        priority_filter: str = None,
        category_filter: str = None,
        search_query: str = None,
    ) -> dict:
        """
        Retrieve all hostel complaints for Owner CRM with filter and counts.
        """
        if not self.db:
            return {"complaints": [], "counts": {}}

        try:
            query = self.db.table("complaints").select("*").eq("hostel_id", hostel_id)

            if status_filter and status_filter.upper() != "ALL":
                query = query.eq("status", status_filter.upper())
            if priority_filter and priority_filter.upper() != "ALL":
                query = query.eq("priority", priority_filter.upper())
            if category_filter and category_filter.upper() != "ALL":
                query = query.eq("category", category_filter.upper())

            res = query.order("created_at", desc=True).execute()
            records = res.data or []

            # Enrich with tenant details
            t_res = self.db.table("tenants").select("id, tenant_code, full_name, room_id").eq("hostel_id", hostel_id).execute()
            tenant_map = {str(t["id"]): t for t in (t_res.data or [])}

            r_res = self.db.table("rooms").select("id, room_number").eq("hostel_id", hostel_id).execute()
            room_map = {str(r["id"]): r.get("room_number") for r in (r_res.data or [])}

            enriched = []
            for c in records:
                c_copy = dict(c)
                t_obj = tenant_map.get(str(c_copy.get("tenant_id")))
                if t_obj:
                    c_copy["tenant_name"] = t_obj.get("full_name") or "-"
                    c_copy["tenant_code"] = t_obj.get("tenant_code") or "-"
                    r_id = str(t_obj.get("room_id")) if t_obj.get("room_id") else None
                    c_copy["room_number"] = room_map.get(r_id, c_copy.get("location") or "-")
                else:
                    c_copy["tenant_name"] = c_copy.get("tenant_name") or "Resident"
                    c_copy["room_number"] = c_copy.get("location") or "-"

                if search_query:
                    sq = search_query.lower().strip()
                    title = str(c_copy.get("title", "")).lower()
                    t_name = str(c_copy.get("tenant_name", "")).lower()
                    if sq not in title and sq not in t_name:
                        continue

                enriched.append(c_copy)

            # Compute category/status counts
            all_res = self.db.table("complaints").select("status, priority").eq("hostel_id", hostel_id).execute()
            all_c = all_res.data or []
            counts = {
                "total": len(all_c),
                "open": sum(1 for x in all_c if str(x.get("status", "")).upper() == "OPEN"),
                "assigned": sum(1 for x in all_c if str(x.get("status", "")).upper() == "ASSIGNED"),
                "in_progress": sum(1 for x in all_c if str(x.get("status", "")).upper() == "IN_PROGRESS"),
                "resolved": sum(1 for x in all_c if str(x.get("status", "")).upper() in ("RESOLVED", "CLOSED")),
                "resolved_today": sum(1 for x in all_c if str(x.get("status", "")).upper() in ("RESOLVED", "CLOSED")),
                "urgent": sum(1 for x in all_c if str(x.get("priority", "")).upper() == "URGENT"),
                "high_priority": sum(1 for x in all_c if str(x.get("priority", "")).upper() in ("HIGH", "URGENT")),
            }

            return {"complaints": enriched, "counts": counts, "summary": counts}

        except Exception as e:
            logger.error(f"Error fetching owner complaints: {e}")
            return {"complaints": [], "counts": {}, "summary": {}}

    def get_owner_complaint_by_id(self, complaint_id: str, hostel_id: str) -> dict:
        if not self.db:
            return None
        try:
            res = self.db.table("complaints").select("*").eq("id", complaint_id).eq("hostel_id", hostel_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching complaint {complaint_id}: {e}")
            return None

    def update_owner_complaint(self, complaint_id: str, hostel_id: str, update_data: dict) -> dict:
        return self.update_complaint(complaint_id, update_data, hostel_id)

    def get_tenant_complaint_by_id(self, complaint_id: str, hostel_id: str, tenant_id_filters: list) -> dict:
        if not self.db:
            return None
        try:
            res = self.db.table("complaints").select("*").eq("id", complaint_id).eq("hostel_id", hostel_id).execute()
            if res.data and len(res.data) > 0:
                c = res.data[0]
                c.pop("owner_notes", None)
                return c
            return None
        except Exception as e:
            logger.error(f"Error fetching tenant complaint {complaint_id}: {e}")
            return None

    def update_complaint(self, complaint_id: str, updates: dict, hostel_id: str) -> dict:
        """
        Owner updates complaint status, assigns staff, or adds notes.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {"updated_at": now_iso}

        if "status" in updates:
            db_updates["status"] = str(updates["status"]).upper()
            if db_updates["status"] in ("RESOLVED", "CLOSED"):
                db_updates["resolved_at"] = now_iso

        if "assigned_to" in updates:
            db_updates["assigned_to"] = updates["assigned_to"]
        if "priority" in updates:
            db_updates["priority"] = str(updates["priority"]).upper()
        if "owner_notes" in updates:
            db_updates["owner_notes"] = updates["owner_notes"]
        if "tenant_visible_notes" in updates:
            db_updates["tenant_visible_notes"] = updates["tenant_visible_notes"]

        res = (
            self.db.table("complaints")
            .update(db_updates)
            .eq("id", complaint_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else None

    # =========================================================================
    # MAINTENANCE TASKS METHODS
    # =========================================================================

    def get_owner_maintenance_tasks(
        self,
        hostel_id: str,
        status_filter: str = None,
        priority_filter: str = None,
        search_query: str = None,
    ) -> dict:
        """
        List maintenance tasks from Supabase public.maintenance_tasks.
        """
        if not self.db:
            return {"tasks": [], "summary": {}, "counts": {}}

        try:
            query = self.db.table("maintenance_tasks").select("*").eq("hostel_id", hostel_id)
            if status_filter and status_filter.upper() != "ALL":
                query = query.eq("status", status_filter.upper())
            if priority_filter and priority_filter.upper() != "ALL":
                query = query.eq("priority", priority_filter.upper())

            res = query.order("scheduled_date", desc=True).execute()
            records = res.data or []

            if search_query:
                sq = search_query.lower().strip()
                records = [
                    t for t in records
                    if sq in str(t.get("title", "")).lower()
                    or sq in str(t.get("location", "")).lower()
                    or sq in str(t.get("assigned_to", "")).lower()
                ]

            all_tasks_res = self.db.table("maintenance_tasks").select("status, priority").eq("hostel_id", hostel_id).execute()
            all_t = all_tasks_res.data or []
            summary = {
                "total": len(all_t),
                "open": sum(1 for t in all_t if str(t.get("status", "")).upper() == "OPEN"),
                "scheduled": sum(1 for t in all_t if str(t.get("status", "")).upper() == "SCHEDULED"),
                "in_progress": sum(1 for t in all_t if str(t.get("status", "")).upper() == "IN_PROGRESS"),
                "completed": sum(1 for t in all_t if str(t.get("status", "")).upper() in ("RESOLVED", "CLOSED", "COMPLETED")),
                "urgent": sum(1 for t in all_t if str(t.get("priority", "")).upper() in ("URGENT", "HIGH")),
            }

            return {"tasks": records, "summary": summary, "counts": summary}
        except Exception as e:
            logger.error(f"Error fetching maintenance tasks: {e}")
            return {"tasks": [], "summary": {}, "counts": {}}


    def create_maintenance_task(self, data: dict, hostel_id: str) -> dict:
        """
        Create a new maintenance task.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        title = (data.get("title") or "").strip()
        if not title:
            raise ValueError("Task title is required.")

        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            "hostel_id": hostel_id,
            "complaint_id": data.get("complaint_id") or None,
            "title": title,
            "description": data.get("description") or None,
            "location": data.get("location") or "General Area",
            "priority": str(data.get("priority", "MEDIUM")).upper(),
            "assigned_to": data.get("assigned_to") or "Maintenance Team",
            "status": str(data.get("status", "OPEN")).upper(),
            "scheduled_date": data.get("scheduled_date") or date.today().isoformat(),
            "due_date": data.get("due_date") or None,
            "notes": data.get("notes") or None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.db.table("maintenance_tasks").insert(payload).execute()
        return res.data[0] if res.data else None

    def update_maintenance_task(self, task_id: str, updates: dict, hostel_id: str) -> dict:
        """
        Update status or assigned technician for a maintenance task.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {"updated_at": now_iso}

        if "status" in updates:
            st = str(updates["status"]).upper()
            db_updates["status"] = st
            if st in ("RESOLVED", "CLOSED"):
                db_updates["completed_at"] = now_iso

        if "assigned_to" in updates:
            db_updates["assigned_to"] = updates["assigned_to"]
        if "priority" in updates:
            db_updates["priority"] = str(updates["priority"]).upper()
        if "notes" in updates:
            db_updates["notes"] = updates["notes"]

        res = (
            self.db.table("maintenance_tasks")
            .update(db_updates)
            .eq("id", task_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else None

    def get_dashboard_counts(self, hostel_id: str) -> dict:
        """
        Return open complaint and maintenance counts for owner dashboard.
        """
        if not self.db:
            return {"open_complaints": 0, "maintenance_attention": 0, "open_maintenance": 0}

        try:
            c_res = (
                self.db.table("complaints")
                .select("status, priority")
                .eq("hostel_id", hostel_id)
                .execute()
            )
            c_list = c_res.data or []
            open_complaints = sum(
                1 for c in c_list
                if str(c.get("status", "")).upper() not in ("RESOLVED", "CLOSED")
            )
            high_priority_complaints = sum(
                1 for c in c_list
                if str(c.get("status", "")).upper() not in ("RESOLVED", "CLOSED")
                and str(c.get("priority", "")).upper() in ("HIGH", "URGENT")
            )

            m_res = (
                self.db.table("maintenance_tasks")
                .select("status, priority, scheduled_date, due_date")
                .eq("hostel_id", hostel_id)
                .execute()
            )
            m_list = m_res.data or []
            in_progress = sum(
                1 for m in m_list
                if str(m.get("status", "")).upper() in ("IN_PROGRESS", "ASSIGNED")
            )
            open_maintenance = sum(
                1 for m in m_list
                if str(m.get("status", "")).upper() in ("OPEN", "SCHEDULED", "ASSIGNED", "IN_PROGRESS")
            )
            today_str = date.today().isoformat()
            overdue_maintenance = sum(
                1 for m in m_list
                if str(m.get("status", "")).upper() not in ("COMPLETED", "CANCELLED")
                and (
                    (m.get("due_date") and str(m["due_date"]) < today_str) or
                    (m.get("scheduled_date") and str(m["scheduled_date"]) < today_str and str(m.get("status", "")).upper() == "SCHEDULED") or
                    str(m.get("priority", "")).upper() == "URGENT"
                )
            )

            return {
                "open_complaints": open_complaints,
                "openComplaints": open_complaints,
                "high_priority_complaints": high_priority_complaints,
                "highPriority": high_priority_complaints,
                "maintenance_attention": open_maintenance,
                "open_maintenance": open_maintenance,
                "maintenance_in_progress": in_progress,
                "inProgress": in_progress,
                "overdue_maintenance": overdue_maintenance,
                "overdue": overdue_maintenance,
            }
        except Exception as e:
            logger.error(f"Error computing complaint dashboard counts: {e}")
            return {
                "open_complaints": 0,
                "openComplaints": 0,
                "high_priority_complaints": 0,
                "highPriority": 0,
                "maintenance_attention": 0,
                "open_maintenance": 0,
                "maintenance_in_progress": 0,
                "inProgress": 0,
                "overdue_maintenance": 0,
                "overdue": 0,
            }

    def get_tenant_complaint_summary(self, hostel_id: str, tenant_id_filters: list) -> dict:
        """
        Calculate complaint summary stats for tenant portal cards.
        """
        complaints = self.get_tenant_complaints(hostel_id, tenant_id_filters)
        return {
            "total": len(complaints),
            "open": sum(1 for c in complaints if str(c.get("status", "")).upper() == "OPEN"),
            "in_progress": sum(1 for c in complaints if str(c.get("status", "")).upper() == "IN_PROGRESS"),
            "resolved": sum(1 for c in complaints if str(c.get("status", "")).upper() in ("RESOLVED", "CLOSED")),
        }

