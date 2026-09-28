"""
End-to-End Relational Domain Flow & Isolation Test Suite
Verifies:
1. Room 204 creation & automatic bed generation (Bed A, Bed B)
2. Tenant creation
3. Transactional bed assignment (Bed marked OCCUPIED)
4. Domain relationships:
   - Payment referencing tenant
   - Complaint referencing tenant
   - Visitor pass referencing tenant
5. Dashboard aggregation across all relational domains
6. Tenant API data isolation (no cross-tenant data leaks)
7. Vacate flow & transactional bed release (Bed reverted to AVAILABLE)
"""

import os
import sys
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from room_service import get_room_service
from tenant_service import get_tenant_service
from booking_service import get_booking_service
from payments_repo import PaymentRepository
from complaints_repo import ComplaintsMaintenanceRepository
from visitors_repo import get_visitors_repo
from dashboard_service import DashboardService

DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"


class TestRelationalDomainFlow(unittest.TestCase):
    def setUp(self):
        self.room_service = get_room_service()
        self.tenant_service = get_tenant_service()
        self.booking_service = get_booking_service()
        self.payment_repo = PaymentRepository()
        self.complaints_repo = ComplaintsMaintenanceRepository()
        self.visitors_repo = get_visitors_repo()
        self.dashboard_service = DashboardService(
            db_client=None,
            payment_repo=self.payment_repo,
            complaints_repo=self.complaints_repo,
            visitors_repo=self.visitors_repo,
        )

    def test_complete_relational_lifecycle(self):
        print("\n--- [1] Room 204 Creation & Auto Bed Generation ---")
        room_payload = {
            "room_number": "204",
            "room_type": "DOUBLE",
            "floor": 2,
            "monthly_rent": 8500.0,
            "security_deposit": 8500.0,
            "capacity": 2
        }
        # Check if room already exists or create
        existing_rooms = self.room_service.get_rooms(DEMO_HOSTEL_ID)
        room_204 = next((r for r in existing_rooms if str(r.get("room_number")) == "204"), None)
        if not room_204:
            room_204 = self.room_service.create_room(DEMO_HOSTEL_ID, room_payload)

        self.assertIsNotNone(room_204)
        self.assertEqual(str(room_204.get("room_number")), "204")
        self.assertEqual(len(room_204.get("beds", [])), 2)
        print(f"Room 204 verified with beds: {[b['id'] for b in room_204['beds']]}")

        bed_a = room_204["beds"][0]
        bed_b = room_204["beds"][1]

        # Reset bed statuses to AVAILABLE for clean test run
        self.room_service.update_bed_status(DEMO_HOSTEL_ID, bed_a["id"], "AVAILABLE")
        self.room_service.update_bed_status(DEMO_HOSTEL_ID, bed_b["id"], "AVAILABLE")

        beds_after_reset = self.room_service.get_room_by_id(room_204["id"], DEMO_HOSTEL_ID)["beds"]
        self.assertEqual(beds_after_reset[0]["status"], "AVAILABLE")
        self.assertEqual(beds_after_reset[1]["status"], "AVAILABLE")
        print("Bed statuses verified AVAILABLE.")

        print("\n--- [2] Tenant Rahul Creation ---")
        tenant_payload = {
            "name": "Rahul Sharma Test",
            "phone": "+91 98765 43210",
            "email": "rahul.test@example.com",
            "occupation": "Software Engineer",
            "monthly_rent": 8500.0,
            "security_deposit": 8500.0,
            "move_in_date": "2026-09-01",
            "expected_end_date": "2027-03-01",
            "emergency_contact_name": "Ramesh Sharma",
            "emergency_contact_phone": "+91 98765 00000"
        }
        tenant = self.tenant_service.create_tenant(DEMO_HOSTEL_ID, tenant_payload)
        self.assertIsNotNone(tenant)
        self.assertTrue(tenant.get("id").startswith("TEN-"))
        tenant_id = tenant["id"]
        print(f"Created tenant {tenant['full_name']} with ID: {tenant_id}")

        print("\n--- [3] Bed Assignment & Transactional Consistency ---")
        assigned_tenant = self.tenant_service.assign_bed(
            DEMO_HOSTEL_ID,
            tenant_id=tenant_id,
            room_id=room_204["id"],
            bed_id=bed_b["id"]
        )
        self.assertEqual(assigned_tenant["bed_id"], bed_b["id"])
        self.assertEqual(assigned_tenant["room_id"], room_204["id"])

        # Check that Bed B is now OCCUPIED and Bed A remains AVAILABLE
        updated_room = self.room_service.get_room_by_id(room_204["id"], DEMO_HOSTEL_ID)
        updated_beds = {b["id"]: b["status"] for b in updated_room["beds"]}
        self.assertEqual(updated_beds[bed_b["id"]], "OCCUPIED")
        self.assertEqual(updated_beds[bed_a["id"]], "AVAILABLE")
        print(f"Bed statuses verified: Bed A={updated_beds[bed_a['id']]}, Bed B={updated_beds[bed_b['id']]}")

        print("\n--- [4] Foreign Key Relationships Across Domains ---")
        # 4a. Payment referencing tenant_id
        payment_record = {
            "hostel_id": DEMO_HOSTEL_ID,
            "tenant_id": tenant_id,
            "tenant_name": tenant["full_name"],
            "room_number": "Room 204 (Bed B)",
            "payment_type": "Monthly Rent",
            "amount_due": 8500.0,
            "amount_paid": 8500.0,
            "due_date": "2026-09-20",
            "paid_date": "2026-09-20",
            "payment_method": "UPI",
            "reference_number": "UPI-RELATIONAL-TEST-1234",
            "notes": "September rent payment for room 204"
        }
        payment = self.payment_repo.create_or_update(payment_record, DEMO_HOSTEL_ID)
        self.assertIsNotNone(payment)
        self.assertEqual(payment["tenant_id"], tenant_id)
        self.assertEqual(payment["status"], "PAID")
        print(f"Payment recorded: {payment['id']} for tenant {payment['tenant_id']}")

        # 4b. Complaint referencing tenant_id and room_id
        tenant_profile_mock = {
            "id": tenant_id,
            "user_code": tenant_id,
            "full_name": tenant["full_name"],
            "room_number": "Room 204",
            "bed_code": "Bed B"
        }
        complaint_data = {
            "category": "Electrical",
            "title": "Study lamp socket loose in 204",
            "description": "Power socket near bed B has intermittent contact.",
            "priority": "MEDIUM"
        }
        complaint = self.complaints_repo.create_tenant_complaint(
            complaint_data,
            hostel_id=DEMO_HOSTEL_ID,
            tenant_profile=tenant_profile_mock
        )
        self.assertIsNotNone(complaint)
        self.assertEqual(complaint["tenant_id"], tenant_id)
        self.assertEqual(complaint["status"], "OPEN")
        print(f"Complaint logged: {complaint['id']} for tenant {complaint['tenant_id']}")

        # 4c. Visitor pass referencing tenant_id
        visitor_data = {
            "visitor_name": "Amit Verma",
            "visitor_phone": "+91 98888 77777",
            "relationship": "Friend",
            "purpose": "Project discussion",
            "visit_date": "2026-09-27",
            "expected_time": "14:00"
        }
        visitor = self.visitors_repo.create_tenant_visitor_request(
            visitor_data,
            hostel_id=DEMO_HOSTEL_ID,
            tenant_profile=tenant_profile_mock
        )
        self.assertIsNotNone(visitor)
        self.assertEqual(visitor["tenant_id"], tenant_id)
        self.assertEqual(visitor["status"], "PENDING_APPROVAL")
        print(f"Visitor request created: {visitor['id']} for tenant {visitor['tenant_id']}")

        print("\n--- [5] Live Owner Dashboard KPI Aggregation ---")
        dashboard = self.dashboard_service.get_dashboard_metrics(DEMO_HOSTEL_ID, "UrbanNest Hostel")
        self.assertEqual(dashboard["hostel_id"], DEMO_HOSTEL_ID)
        self.assertGreater(dashboard["stats"]["total_beds"], 0)
        self.assertGreater(dashboard["stats"]["occupied_beds"], 0)
        self.assertGreater(dashboard["stats"]["active_tenants"], 0)
        self.assertGreater(dashboard["stats"]["total_collected"], 0)
        self.assertGreater(dashboard["stats"]["open_complaints"], 0)
        print("Dashboard KPIs live and aggregated across all relational tables:")
        print(f"  - Total Beds: {dashboard['stats']['total_beds']}")
        print(f"  - Occupied Beds: {dashboard['stats']['occupied_beds']}")
        print(f"  - Occupancy Rate: {dashboard['stats']['occupancy_rate']}%")
        print(f"  - Total Collected: Rs {dashboard['stats']['total_collected']}")
        print(f"  - Open Complaints: {dashboard['stats']['open_complaints']}")

        print("\n--- [6] Strict Tenant Data Isolation Check ---")
        # Querying tenant's data must return only this tenant's items
        tenant_payments = self.payment_repo.get_all(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[tenant_id])
        for p in tenant_payments:
            self.assertEqual(p["tenant_id"], tenant_id)

        tenant_complaints = self.complaints_repo.get_tenant_complaints(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[tenant_id])
        for c in tenant_complaints:
            self.assertEqual(c["tenant_id"], tenant_id)

        tenant_visitors = self.visitors_repo.get_tenant_visitors(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[tenant_id])
        for v in tenant_visitors:
            self.assertEqual(v["tenant_id"], tenant_id)

        # Another tenant ID should see NONE of Rahul's data
        other_tenant_id = "TEN-OTHER-NONEXISTENT"
        other_payments = self.payment_repo.get_all(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[other_tenant_id])
        other_complaints = self.complaints_repo.get_tenant_complaints(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[other_tenant_id])
        other_visitors = self.visitors_repo.get_tenant_visitors(hostel_id=DEMO_HOSTEL_ID, tenant_id_filters=[other_tenant_id])
        self.assertEqual(len(other_payments), 0)
        self.assertEqual(len(other_complaints), 0)
        self.assertEqual(len(other_visitors), 0)
        print("Tenant data isolation strictly verified. No cross-tenant data leakage.")

        print("\n--- [7] Vacate Flow & Transactional Bed Release ---")
        vacated_tenant = self.tenant_service.vacate_tenant(DEMO_HOSTEL_ID, tenant_id)
        self.assertEqual(vacated_tenant["status"], "MOVED_OUT")

        # Verify bed is returned to AVAILABLE
        room_after_vacate = self.room_service.get_room_by_id(room_204["id"], DEMO_HOSTEL_ID)
        bed_b_after = next(b for b in room_after_vacate["beds"] if b["id"] == bed_b["id"])
        self.assertEqual(bed_b_after["status"], "AVAILABLE")
        print(f"Tenant vacated. Bed {bed_b_after['id']} reverted to {bed_b_after['status']}.")


if __name__ == "__main__":
    unittest.main()
