"""
Visitor Requests & Gate Security Repository & Supabase Data Store
Authoritative storage and state management for visitor passes, approvals,
and real-time check-in / check-out gate operations.
"""

import logging
import uuid
from datetime import datetime, timezone, date

logger = logging.getLogger("visitors_repo")


class VisitorsRepository:
    def __init__(self, db_client=None):
        self.db = db_client

    # =========================================================================
    # TENANT VISITOR METHODS
    # =========================================================================

    def get_tenant_visitors(self, hostel_id: str, tenant_id_filters: list) -> list:
        """
        List visitor requests strictly for the authenticated tenant.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("visitor_requests").select("*").eq("hostel_id", hostel_id)
            if tenant_id_filters and len(tenant_id_filters) == 1:
                query = query.eq("tenant_id", tenant_id_filters[0])
            elif tenant_id_filters:
                query = query.in_("tenant_id", tenant_id_filters)

            res = query.order("created_at", desc=True).execute()
            records = res.data or []

            # Strip staff-only internal notes
            safe_records = []
            for r in records:
                r_copy = dict(r)
                r_copy.pop("staff_notes", None)
                safe_records.append(r_copy)

            return safe_records

        except Exception as e:
            logger.error(f"Error fetching tenant visitors: {e}")
            return []

    def create_visitor_request(self, hostel_id: str, tenant_id: str, data: dict) -> dict:
        """
        Submit a new visitor pre-approval request from a resident tenant.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        visitor_name = (data.get("visitor_name") or "").strip()
        if not visitor_name:
            raise ValueError("Visitor name is required.")

        pass_code = f"VP-{uuid.uuid4().hex[:6].upper()}"
        visit_date = data.get("visit_date") or date.today().isoformat()
        now_iso = datetime.now(timezone.utc).isoformat()

        payload = {
            "hostel_id": hostel_id,
            "tenant_id": tenant_id,
            "visitor_name": visitor_name,
            "visitor_phone": data.get("visitor_phone") or None,
            "relationship": data.get("relationship") or "Friend",
            "purpose": data.get("purpose") or "Casual Visit",
            "visit_date": visit_date,
            "expected_arrival_time": data.get("expected_arrival_time") or "10:00:00",
            "expected_exit_time": data.get("expected_exit_time") or "18:00:00",
            "status": "PENDING",
            "tenant_notes": data.get("tenant_notes") or None,
            "pass_code": pass_code,
            "is_overnight": bool(data.get("is_overnight", False)),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.db.table("visitor_requests").insert(payload).execute()
        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to submit visitor request")

        return res.data[0]

    def cancel_visitor_request(self, hostel_id: str, tenant_id: str, request_id: str) -> dict:
        """
        Tenant cancels their own pending or approved visitor pass.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        res = (
            self.db.table("visitor_requests")
            .update({"status": "CANCELLED", "updated_at": now_iso})
            .eq("id", request_id)
            .eq("tenant_id", tenant_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )

        return res.data[0] if res.data else None

    def create_tenant_visitor_request(self, data: dict, hostel_id: str, tenant_profile: dict = None, tenant_id: str = None) -> dict:
        """
        Convenience adapter for create_visitor_request accepting tenant_profile.
        """
        t_id = tenant_id or (tenant_profile.get("tenant_id") if tenant_profile else None) or (tenant_profile.get("id") if tenant_profile else None)
        return self.create_visitor_request(hostel_id=hostel_id, tenant_id=t_id, data=data)

    def cancel_tenant_visitor_request(self, visitor_id: str, hostel_id: str, tenant_id_filters: list = None, tenant_id: str = None) -> dict:
        """
        Convenience adapter for cancel_visitor_request.
        """
        t_id = tenant_id or (tenant_id_filters[0] if tenant_id_filters else None)
        return self.cancel_visitor_request(hostel_id=hostel_id, tenant_id=t_id, request_id=visitor_id)

    # =========================================================================
    # OWNER / GATE DESK METHODS
    # =========================================================================

    def get_owner_visitors(
        self,
        hostel_id: str,
        status_filter: str = None,
        date_filter: str = None,
        search_query: str = None,
    ) -> list:
        """
        List all visitor requests for Owner / Receptionist desk, enriched with resident info.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("visitor_requests").select("*").eq("hostel_id", hostel_id)

            if status_filter and status_filter.upper() != "ALL":
                query = query.eq("status", status_filter.upper())
            if date_filter:
                query = query.eq("visit_date", date_filter)

            res = query.order("created_at", desc=True).execute()
            records = res.data or []

            # Enrich with tenant details
            t_res = self.db.table("tenants").select("id, tenant_code, full_name, room_id").eq("hostel_id", hostel_id).execute()
            tenant_map = {str(t["id"]): t for t in (t_res.data or [])}

            r_res = self.db.table("rooms").select("id, room_number").eq("hostel_id", hostel_id).execute()
            room_map = {str(r["id"]): r.get("room_number") for r in (r_res.data or [])}

            enriched = []
            for v in records:
                v_copy = dict(v)
                t_obj = tenant_map.get(str(v_copy.get("tenant_id")))
                if t_obj:
                    v_copy["resident_name"] = t_obj.get("full_name") or "-"
                    v_copy["tenant_code"] = t_obj.get("tenant_code") or "-"
                    r_id = str(t_obj.get("room_id")) if t_obj.get("room_id") else None
                    v_copy["room_number"] = room_map.get(r_id, "-")
                else:
                    v_copy["resident_name"] = "Resident"
                    v_copy["room_number"] = "-"

                if search_query:
                    sq = search_query.lower().strip()
                    v_name = str(v_copy.get("visitor_name", "")).lower()
                    r_name = str(v_copy.get("resident_name", "")).lower()
                    p_code = str(v_copy.get("pass_code", "")).lower()
                    if sq not in v_name and sq not in r_name and sq not in p_code:
                        continue

                enriched.append(v_copy)

            all_res = self.db.table("visitor_requests").select("status, visit_date").eq("hostel_id", hostel_id).execute()
            all_v = all_res.data or []
            summary = {
                "total": len(all_v),
                "pending": sum(1 for v in all_v if str(v.get("status", "")).upper() == "PENDING"),
                "approved": sum(1 for v in all_v if str(v.get("status", "")).upper() == "APPROVED"),
                "inside": sum(1 for v in all_v if str(v.get("status", "")).upper() == "CHECKED_IN"),
                "checked_out_today": sum(1 for v in all_v if str(v.get("status", "")).upper() == "CHECKED_OUT"),
            }

            return {"visitors": enriched, "summary": summary, "counts": summary}

        except Exception as e:
            logger.error(f"Error fetching owner visitors: {e}")
            return {"visitors": [], "summary": {}, "counts": {}}

    def get_owner_visitor_by_id(self, visitor_id: str, hostel_id: str) -> dict:
        if not self.db:
            return None
        try:
            res = self.db.table("visitor_requests").select("*").eq("id", visitor_id).eq("hostel_id", hostel_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching visitor {visitor_id}: {e}")
            return None

    def get_tenant_visitor_by_id(self, visitor_id: str, hostel_id: str, tenant_id_filters: list) -> dict:
        if not self.db:
            return None
        try:
            res = self.db.table("visitor_requests").select("*").eq("id", visitor_id).eq("hostel_id", hostel_id).execute()
            if res.data and len(res.data) > 0:
                v = res.data[0]
                v.pop("staff_notes", None)
                return v
            return None
        except Exception as e:
            logger.error(f"Error fetching tenant visitor {visitor_id}: {e}")
            return None

    def approve_visitor(self, visitor_id: str = None, hostel_id: str = None, request_id: str = None, staff_notes: str = None, tenant_note: str = None) -> dict:
        """
        Owner/Manager approves visitor request.
        """
        target_id = visitor_id or request_id
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {
            "status": "APPROVED",
            "updated_at": now_iso,
        }
        if staff_notes:
            db_updates["staff_notes"] = staff_notes
        if tenant_note:
            db_updates["tenant_visible_note"] = tenant_note

        res = (
            self.db.table("visitor_requests")
            .update(db_updates)
            .eq("id", target_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def reject_visitor(
        self,
        visitor_id: str = None,
        hostel_id: str = None,
        request_id: str = None,
        reason: str = None,
        rejection_reason: str = None,
        staff_notes: str = None,
        owner_notes: str = None,
    ) -> dict:
        """
        Owner rejects visitor request with reason.
        """
        target_id = visitor_id or request_id
        final_reason = rejection_reason or reason or "Not specified"
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {
            "status": "REJECTED",
            "rejection_reason": final_reason,
            "tenant_visible_note": f"Request rejected: {final_reason}",
            "updated_at": now_iso,
        }
        if staff_notes or owner_notes:
            db_updates["staff_notes"] = staff_notes or owner_notes

        res = (
            self.db.table("visitor_requests")
            .update(db_updates)
            .eq("id", target_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def check_in_visitor(
        self,
        visitor_id: str = None,
        hostel_id: str = None,
        request_id: str = None,
        check_in_data: dict = None,
        id_type: str = None,
        id_number: str = None,
        staff_member: str = None,
    ) -> dict:
        """
        Record visitor arrival and entry at gate desk.
        """
        target_id = visitor_id or request_id
        if not self.db:
            raise RuntimeError("Database client not available")

        data = check_in_data or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {
            "status": "CHECKED_IN",
            "actual_entry_time": now_iso,
            "checked_in_by": staff_member or data.get("checked_in_by") or "Security Desk",
            "updated_at": now_iso,
        }
        final_id_type = id_type or data.get("id_type")
        if final_id_type:
            db_updates["id_type"] = final_id_type
        final_id_number = id_number or data.get("id_number")
        if final_id_number:
            db_updates["id_number"] = final_id_number

        res = (
            self.db.table("visitor_requests")
            .update(db_updates)
            .eq("id", target_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def check_out_visitor(
        self,
        visitor_id: str = None,
        hostel_id: str = None,
        request_id: str = None,
        check_out_data: dict = None,
        staff_member: str = None,
    ) -> dict:
        """
        Record visitor departure and exit at gate desk.
        """
        target_id = visitor_id or request_id
        if not self.db:
            raise RuntimeError("Database client not available")

        data = check_out_data or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {
            "status": "CHECKED_OUT",
            "actual_exit_time": now_iso,
            "checked_out_by": staff_member or data.get("checked_out_by") or "Security Desk",
            "updated_at": now_iso,
        }

        res = (
            self.db.table("visitor_requests")
            .update(db_updates)
            .eq("id", target_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def create_walk_in_visitor(self, data: dict, hostel_id: str, staff_member: str = None) -> dict:
        return self.record_walk_in(hostel_id, data, staff_member)

    def record_walk_in(self, hostel_id: str, data: dict, staff_member: str = None) -> dict:
        """
        Create and immediately check in an unscheduled walk-in visitor.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        visitor_name = (data.get("visitor_name") or "").strip()
        if not visitor_name:
            raise ValueError("Visitor name is required.")

        now_iso = datetime.now(timezone.utc).isoformat()
        pass_code = f"VP-WALK-{uuid.uuid4().hex[:4].upper()}"

        # Resolve tenant_id if tenant_name or room_number provided
        tenant_id = data.get("tenant_id")
        if not tenant_id and data.get("tenant_name"):
            t_res = self.db.table("tenants").select("id").eq("hostel_id", hostel_id).ilike("full_name", f"%{data['tenant_name'].strip()}%").limit(1).execute()
            if t_res.data:
                tenant_id = t_res.data[0]["id"]

        if not tenant_id:
            # Pick first active tenant in hostel as host
            t_res = self.db.table("tenants").select("id").eq("hostel_id", hostel_id).limit(1).execute()
            if t_res.data:
                tenant_id = t_res.data[0]["id"]

        payload = {
            "hostel_id": hostel_id,
            "tenant_id": tenant_id,
            "visitor_name": visitor_name,
            "visitor_phone": data.get("visitor_phone") or None,
            "relationship": data.get("relationship") or "Visitor",
            "purpose": data.get("purpose") or "Immediate Visit",
            "visit_date": date.today().isoformat(),
            "status": "CHECKED_IN",
            "actual_entry_time": now_iso,
            "pass_code": pass_code,
            "id_type": data.get("id_type") or "Aadhaar Card",
            "id_number": data.get("id_number") or None,
            "checked_in_by": staff_member or "Security Desk",
            "staff_notes": data.get("staff_notes") or "Walk-in entry recorded at front gate.",
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.db.table("visitor_requests").insert(payload).execute()
        return res.data[0] if res.data else None


    def get_dashboard_counts(self, hostel_id: str) -> dict:
        """
        Return visitor metrics for owner dashboard.
        """
        if not self.db:
            return {"inside_now": 0, "pending_approval": 0, "today_expected": 0}

        try:
            res = (
                self.db.table("visitor_requests")
                .select("status, visit_date")
                .eq("hostel_id", hostel_id)
                .execute()
            )
            records = res.data or []
            today_str = date.today().isoformat()

            inside_now = sum(1 for v in records if str(v.get("status", "")).upper() == "CHECKED_IN")
            pending_approval = sum(1 for v in records if str(v.get("status", "")).upper() == "PENDING")
            today_expected = sum(
                1 for v in records
                if str(v.get("visit_date")) == today_str
                and str(v.get("status", "")).upper() in ("PENDING", "APPROVED")
            )

            return {
                "inside_now": inside_now,
                "pending_approval": pending_approval,
                "today_expected": today_expected,
            }
        except Exception as e:
            logger.error(f"Error computing visitor dashboard counts: {e}")
            return {"inside_now": 0, "pending_approval": 0, "today_expected": 0}

    def get_tenant_visitor_summary(self, hostel_id: str, tenant_id_filters: list) -> dict:
        """
        Calculate visitor statistics for tenant portal.
        """
        visitors = self.get_tenant_visitors(hostel_id, tenant_id_filters)
        return {
            "total": len(visitors),
            "inside": sum(1 for v in visitors if str(v.get("status", "")).upper() == "CHECKED_IN"),
            "approved": sum(1 for v in visitors if str(v.get("status", "")).upper() == "APPROVED"),
            "pending": sum(1 for v in visitors if str(v.get("status", "")).upper() == "PENDING"),
        }



_visitors_repo_instance = None


def get_visitors_repo(db_client=None) -> VisitorsRepository:
    global _visitors_repo_instance
    if _visitors_repo_instance is None:
        _visitors_repo_instance = VisitorsRepository(db_client)
    elif db_client:
        _visitors_repo_instance.db = db_client
    return _visitors_repo_instance
