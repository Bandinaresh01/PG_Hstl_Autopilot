"""
Owner Dashboard Aggregator Service
Computes real-time hostel operational KPIs across database tables:
rooms, beds, tenants, enquiries, bookings, payments, complaints, maintenance, and visitors.
"""

import logging
from datetime import date

from room_service import get_room_service
from tenant_service import get_tenant_service
from booking_service import get_booking_service

logger = logging.getLogger("dashboard_service")


class DashboardService:
    def __init__(self, db_client=None, payment_repo=None, complaints_repo=None, visitors_repo=None):
        self.db = db_client
        self.payment_repo = payment_repo
        self.complaints_repo = complaints_repo
        self.visitors_repo = visitors_repo

    def get_dashboard_metrics(self, hostel_id: str, hostel_name: str = "UrbanNest Hostel") -> dict:
        """
        Aggregate live metrics across all domains without hardcoded operational data.
        """
        room_service = get_room_service(self.db)
        tenant_service = get_tenant_service(self.db)
        booking_service = get_booking_service(self.db)

        # 1. Rooms & Beds
        room_stats = room_service.get_stats(hostel_id)

        # 2. Tenants
        tenant_stats = tenant_service.get_stats(hostel_id)

        # 3. Bookings
        booking_stats = booking_service.get_stats(hostel_id)

        # 4. Enquiries (from Supabase enquiries table)
        new_enquiries = 0
        total_enquiries = 0
        recent_enquiries = []
        if self.db:
            try:
                enq_res = self.db.table("enquiries").select("*").order("created_at", desc=True).limit(50).execute()
                all_enq = enq_res.data or []
                total_enquiries = len(all_enq)
                new_enquiries = sum(1 for e in all_enq if str(e.get("status", "")).upper() == "NEW")
                recent_enquiries = all_enq[:5]
            except Exception as e:
                logger.warning(f"Error fetching enquiries for dashboard: {e}")

        # 5. Financials & Payments
        collected = 0.0
        pending = 0.0
        overdue = 0.0
        recent_payments = []
        if self.payment_repo:
            try:
                p_summary = self.payment_repo.get_hostel_summary(hostel_id=hostel_id)
                collected = float(p_summary.get("total_collected", 0.0))
                pending = float(p_summary.get("total_pending", 0.0))
                overdue = float(p_summary.get("total_overdue", 0.0))
                p_records = self.payment_repo.get_all(hostel_id=hostel_id)
                recent_payments = p_records[:5]
            except Exception as e:
                logger.warning(f"Error fetching payments for dashboard: {e}")

        # 6. Complaints & Maintenance
        open_complaints = 0
        open_maintenance = 0
        recent_complaints = []
        if self.complaints_repo:
            try:
                c_counts = self.complaints_repo.get_dashboard_counts(hostel_id=hostel_id)
                open_complaints = int(c_counts.get("open_complaints", 0))
                open_maintenance = int(c_counts.get("open_maintenance", 0))
                all_c = self.complaints_repo.get_owner_complaints(hostel_id=hostel_id).get("complaints", [])
                recent_complaints = all_c[:5]
            except Exception as e:
                logger.warning(f"Error fetching complaints for dashboard: {e}")

        # 7. Visitors & Gate Operations
        visitors_inside = 0
        pending_visitors = 0
        if self.visitors_repo:
            try:
                v_counts = self.visitors_repo.get_dashboard_counts(hostel_id=hostel_id)
                visitors_inside = int(v_counts.get("inside_now", 0))
                pending_visitors = int(v_counts.get("pending_approval", 0))
            except Exception as e:
                logger.warning(f"Error fetching visitors for dashboard: {e}")

        return {
            "hostel_name": hostel_name,
            "hostel_id": hostel_id,
            "stats": {
                "total_rooms": room_stats["total_rooms"],
                "total_beds": room_stats["total_beds"],
                "occupied_beds": room_stats["occupied_beds"],
                "available_beds": room_stats["available_beds"],
                "reserved_beds": room_stats["reserved_beds"],
                "maintenance_beds": room_stats["maintenance_beds"],
                "occupancy_rate": room_stats["occupancy_rate"],
                "current_tenants": tenant_stats["active_tenants"],
                "active_tenants": tenant_stats["active_tenants"],
                "total_tenants": tenant_stats["total_tenants"],
                "new_enquiries": new_enquiries,
                "total_enquiries": total_enquiries,
                "upcoming_bookings": booking_stats["upcoming_bookings_count"],
                "total_bookings": booking_stats["total_bookings"],
                "rent_collected": collected,
                "total_collected": collected,
                "pending_rent": pending,
                "total_pending": pending,
                "overdue_rent": overdue,
                "total_overdue": overdue,
                "open_complaints": open_complaints,
                "maintenance_tasks": open_maintenance,
                "visitors_inside": visitors_inside,
                "pending_visitors": pending_visitors,
                "upcoming_move_outs": tenant_stats["upcoming_stay_end_dates_count"]
            },
            "upcoming_stay_end_dates": tenant_stats["upcoming_stay_end_dates"],
            "upcoming_bookings_list": booking_stats["upcoming_bookings"][:5],
            "recent_payments": recent_payments,
            "recent_enquiries": recent_enquiries,
            "recent_complaints": recent_complaints
        }


_dashboard_service_instance = None


def get_dashboard_service(db_client=None, payment_repo=None, complaints_repo=None, visitors_repo=None) -> DashboardService:
    global _dashboard_service_instance
    if _dashboard_service_instance is None:
        _dashboard_service_instance = DashboardService(db_client, payment_repo, complaints_repo, visitors_repo)
    else:
        if db_client:
            _dashboard_service_instance.db = db_client
        if payment_repo:
            _dashboard_service_instance.payment_repo = payment_repo
        if complaints_repo:
            _dashboard_service_instance.complaints_repo = complaints_repo
        if visitors_repo:
            _dashboard_service_instance.visitors_repo = visitors_repo
    return _dashboard_service_instance
