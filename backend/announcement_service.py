"""
Announcement Domain Service & Supabase Data Access Layer
Provides persistent announcement broadcasting, scheduling,
and audience management for UrbanNest Hostel CRM.
"""

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("announcement_service")


class AnnouncementService:
    def __init__(self, db_client=None):
        self.db = db_client

    def get_announcements(self, hostel_id: str, status_filter: str = None) -> list:
        """
        List all announcements for Owner CRM.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("announcements").select("*").eq("hostel_id", hostel_id)
            if status_filter and status_filter.upper() != "ALL":
                query = query.eq("status", status_filter.upper())

            res = query.order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching announcements from Supabase: {e}")
            return []

    def get_tenant_announcements(self, hostel_id: str) -> list:
        """
        List published announcements visible to hostel residents.
        """
        if not self.db:
            return []

        try:
            res = (
                self.db.table("announcements")
                .select("*")
                .eq("hostel_id", hostel_id)
                .eq("status", "PUBLISHED")
                .order("publish_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching tenant announcements: {e}")
            return []

    def create_announcement(self, hostel_id: str, data: dict, created_by_profile_id: str = None) -> dict:
        """
        Publish or draft a new hostel announcement.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        title = (data.get("title") or "").strip()
        message = (data.get("message") or "").strip()
        if not title:
            raise ValueError("Announcement title is required.")
        if not message:
            raise ValueError("Announcement message is required.")

        now_iso = datetime.now(timezone.utc).isoformat()
        status = str(data.get("status", "PUBLISHED")).upper()

        payload = {
            "hostel_id": hostel_id,
            "title": title,
            "message": message,
            "category": data.get("category") or "GENERAL",
            "priority": str(data.get("priority", "NORMAL")).upper(),
            "audience_type": str(data.get("audience_type", "ALL_TENANTS")).upper(),
            "publish_at": data.get("publish_at") or now_iso,
            "expires_at": data.get("expires_at") or None,
            "status": status,
            "created_by": created_by_profile_id or None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        res = self.db.table("announcements").insert(payload).execute()
        return res.data[0] if res.data else None

    def update_announcement(self, hostel_id: str, announcement_id: str, updates: dict) -> dict:
        """
        Update an announcement.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        now_iso = datetime.now(timezone.utc).isoformat()
        db_updates = {"updated_at": now_iso}

        for key in ["title", "message", "category", "priority", "audience_type", "status", "expires_at"]:
            if key in updates:
                db_updates[key] = updates[key]

        res = (
            self.db.table("announcements")
            .update(db_updates)
            .eq("id", announcement_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return res.data[0] if res.data else None

    def delete_announcement(self, hostel_id: str, announcement_id: str) -> bool:
        """
        Delete an announcement.
        """
        if not self.db:
            return False

        res = (
            self.db.table("announcements")
            .delete()
            .eq("id", announcement_id)
            .eq("hostel_id", hostel_id)
            .execute()
        )
        return True


_announcement_service_instance = None


def get_announcement_service(db_client=None) -> AnnouncementService:
    global _announcement_service_instance
    if _announcement_service_instance is None:
        _announcement_service_instance = AnnouncementService(db_client)
    elif db_client:
        _announcement_service_instance.db = db_client
    return _announcement_service_instance
