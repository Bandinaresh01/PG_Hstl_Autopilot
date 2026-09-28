"""
seed_demo.py
Comprehensive, idempotent demo seed script for UrbanNest Hostel CRM.
Connects to Supabase using backend/.env and populates domain tables:
- UrbanNest Hostel
- Owner Auth & Profile (Rajesh Kumar)
- Rooms & Beds
- Demo Tenants (Rahul Kumar, Priya Reddy, Arjun Rao, Sai Kumar)
- Tenant Auth & Profile (Rahul Kumar)
- Bed Occupancy Status Synchronization
- Enquiries
- Bookings
- Payments
- Complaints & Maintenance Tasks
- Visitor Requests
- Announcements

Safe & Idempotent: checks for existing records before inserting.
Never drops or truncates tables.
"""
import os
import sys
from datetime import datetime, date, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env", file=sys.stderr)
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

DEMO_OWNER_EMAIL = os.environ.get("DEMO_OWNER_EMAIL", "owner@urbannest.in").strip().lower()
DEMO_OWNER_PASSWORD = os.environ.get("DEMO_OWNER_PASSWORD", "UrbanNest@2026")
DEMO_TENANT_EMAIL = os.environ.get("DEMO_TENANT_EMAIL", "tenant@urbannest.in").strip().lower()
DEMO_TENANT_PASSWORD = os.environ.get("DEMO_TENANT_PASSWORD", "Tenant@2026")

DEMO_HOSTEL_NAME = "UrbanNest Hostel"
DEMO_HOSTEL_LOCATION = "Hyderabad, Telangana"
DEMO_HOSTEL_ADDRESS = "Plot 42, Hitech City Main Road, Madhapur, Hyderabad - 500081"
DEMO_HOSTEL_PHONE = "+91 91234 56789"
DEMO_HOSTEL_EMAIL = "contact@urbannest.in"


def get_or_create_hostel():
    res = sb.table("hostels").select("id, name, location").eq("name", DEMO_HOSTEL_NAME).limit(1).execute()
    if res.data and len(res.data) > 0:
        h_id = res.data[0]["id"]
        print(f"Found existing hostel: {DEMO_HOSTEL_NAME} ({h_id})")
        return h_id

    res_any = sb.table("hostels").select("id, name, location").limit(1).execute()
    if res_any.data and len(res_any.data) > 0:
        h_id = res_any.data[0]["id"]
        sb.table("hostels").update({
            "name": DEMO_HOSTEL_NAME,
            "location": DEMO_HOSTEL_LOCATION,
            "address": DEMO_HOSTEL_ADDRESS,
            "phone": DEMO_HOSTEL_PHONE,
            "email": DEMO_HOSTEL_EMAIL,
            "status": "ACTIVE"
        }).eq("id", h_id).execute()
        print(f"Updated existing hostel to {DEMO_HOSTEL_NAME} ({h_id})")
        return h_id

    ins = sb.table("hostels").insert({
        "name": DEMO_HOSTEL_NAME,
        "location": DEMO_HOSTEL_LOCATION,
        "address": DEMO_HOSTEL_ADDRESS,
        "phone": DEMO_HOSTEL_PHONE,
        "email": DEMO_HOSTEL_EMAIL,
        "status": "ACTIVE"
    }).execute()
    h_id = ins.data[0]["id"]
    print(f"Created hostel: {DEMO_HOSTEL_NAME} ({h_id})")
    return h_id


def setup_auth_user(email, password, metadata):
    """
    Idempotently find or create user in Supabase Auth via Admin API,
    and update password & metadata.
    """
    user_id = None
    try:
        users = sb.auth.admin.list_users()
        for u in users:
            if (u.email or "").strip().lower() == email:
                user_id = u.id
                break
    except Exception as e:
        print(f"List users error: {e}")

    if user_id:
        try:
            sb.auth.admin.update_user_by_id(
                user_id,
                {
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": metadata,
                    "app_metadata": {"role": metadata.get("role", "TENANT")},
                },
            )
            print(f"Updated Auth user: {email} ({user_id})")
        except Exception as e:
            print(f"Update auth user note: {e}")
    else:
        try:
            created = sb.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": metadata,
                "app_metadata": {"role": metadata.get("role", "TENANT")},
            })
            user_id = created.user.id
            print(f"Created Auth user: {email} ({user_id})")
        except Exception as e:
            print(f"Create auth user error for {email}: {e}")

    return user_id


def setup_profile(auth_user_id, user_code, full_name, phone, role, hostel_id):
    """
    Idempotently upsert row in public.profiles.
    """
    res = sb.table("profiles").select("id").eq("auth_user_id", auth_user_id).limit(1).execute()
    if res.data:
        prof_id = res.data[0]["id"]
        sb.table("profiles").update({
            "user_code": user_code,
            "full_name": full_name,
            "phone": phone,
            "role": role,
            "hostel_id": hostel_id,
            "is_active": True,
            "onboarding_completed": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", prof_id).execute()
        print(f"Updated profile for {full_name} ({user_code})")
        return prof_id

    # Check by user_code
    res_code = sb.table("profiles").select("id").eq("user_code", user_code).limit(1).execute()
    if res_code.data:
        prof_id = res_code.data[0]["id"]
        sb.table("profiles").update({
            "auth_user_id": auth_user_id,
            "full_name": full_name,
            "phone": phone,
            "role": role,
            "hostel_id": hostel_id,
            "is_active": True,
            "onboarding_completed": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", prof_id).execute()
        print(f"Updated profile by user_code for {full_name} ({user_code})")
        return prof_id

    ins = sb.table("profiles").insert({
        "auth_user_id": auth_user_id,
        "user_code": user_code,
        "full_name": full_name,
        "phone": phone,
        "role": role,
        "hostel_id": hostel_id,
        "is_active": True,
        "onboarding_completed": True,
    }).execute()
    prof_id = ins.data[0]["id"]
    print(f"Created profile for {full_name} ({user_code})")
    return prof_id


def seed_rooms_and_beds(hostel_id):
    """
    Create demo rooms and beds:
    101 (Single, Floor 1, ₹12,000, Cap 1) -> 101-A
    102 (Double, Floor 1, ₹8,500, Cap 2) -> 102-A, 102-B
    103 (Triple, Floor 1, ₹7,000, Cap 3) -> 103-A, 103-B, 103-C
    201 (Double, Floor 2, ₹8,500, Cap 2) -> 201-A, 201-B
    202 (Triple, Floor 2, ₹7,000, Cap 3) -> 202-A, 202-B, 202-C
    203 (Double, Floor 2, ₹9,000, Cap 2) -> 203-A, 203-B
    """
    rooms_spec = [
        {"room_number": "101", "room_type": "SINGLE", "floor": 1, "monthly_rent": 12000, "security_deposit": 12000, "capacity": 1, "beds": ["101-A"]},
        {"room_number": "102", "room_type": "DOUBLE", "floor": 1, "monthly_rent": 8500, "security_deposit": 8500, "capacity": 2, "beds": ["102-A", "102-B"]},
        {"room_number": "103", "room_type": "TRIPLE", "floor": 1, "monthly_rent": 7000, "security_deposit": 7000, "capacity": 3, "beds": ["103-A", "103-B", "103-C"]},
        {"room_number": "201", "room_type": "DOUBLE", "floor": 2, "monthly_rent": 8500, "security_deposit": 8500, "capacity": 2, "beds": ["201-A", "201-B"]},
        {"room_number": "202", "room_type": "TRIPLE", "floor": 2, "monthly_rent": 7000, "security_deposit": 7000, "capacity": 3, "beds": ["202-A", "202-B", "202-C"]},
        {"room_number": "203", "room_type": "DOUBLE", "floor": 2, "monthly_rent": 9000, "security_deposit": 9000, "capacity": 2, "beds": ["203-A", "203-B"]},
    ]

    room_map = {}  # room_number -> room_id
    bed_map = {}   # bed_code -> bed_id

    for r in rooms_spec:
        r_num = r["room_number"]
        existing = sb.table("rooms").select("id").eq("hostel_id", hostel_id).eq("room_number", r_num).limit(1).execute()
        if existing.data:
            r_id = existing.data[0]["id"]
            sb.table("rooms").update({
                "room_type": r["room_type"],
                "floor": r["floor"],
                "monthly_rent": r["monthly_rent"],
                "security_deposit": r["security_deposit"],
                "capacity": r["capacity"],
                "status": "ACTIVE"
            }).eq("id", r_id).execute()
        else:
            ins = sb.table("rooms").insert({
                "hostel_id": hostel_id,
                "room_number": r_num,
                "room_type": r["room_type"],
                "floor": r["floor"],
                "monthly_rent": r["monthly_rent"],
                "security_deposit": r["security_deposit"],
                "capacity": r["capacity"],
                "status": "ACTIVE"
            }).execute()
            r_id = ins.data[0]["id"]
        room_map[r_num] = r_id

        # Beds for this room
        for b_code in r["beds"]:
            bed_existing = sb.table("beds").select("id").eq("room_id", r_id).eq("bed_code", b_code).limit(1).execute()
            if bed_existing.data:
                b_id = bed_existing.data[0]["id"]
            else:
                ins_b = sb.table("beds").insert({
                    "hostel_id": hostel_id,
                    "room_id": r_id,
                    "bed_code": b_code,
                    "status": "AVAILABLE"
                }).execute()
                b_id = ins_b.data[0]["id"]
            bed_map[b_code] = b_id

    print(f"Seeded {len(room_map)} rooms and {len(bed_map)} beds.")
    return room_map, bed_map


def seed_tenants(hostel_id, room_map, bed_map, tenant_profile_id):
    """
    Seed 4 realistic tenants:
    1. Rahul Kumar (TEN-1001) - Room 102, Bed 102-A - ACTIVE - ₹8,500
    2. Priya Reddy (TEN-1002) - Room 101, Bed 101-A - ACTIVE - ₹12,000
    3. Arjun Rao (TEN-1003) - Room 103, Bed 103-B - ACTIVE - ₹7,000
    4. Sai Kumar (TEN-1004) - Room 201, Bed 201-A - NOTICE_PERIOD - ₹8,500
    """
    tenants_spec = [
        {
            "tenant_code": "TEN-1001",
            "full_name": "Rahul Kumar",
            "phone": "+91 98765 11001",
            "email": DEMO_TENANT_EMAIL,
            "occupation": "Software Engineer",
            "room_number": "102",
            "bed_code": "102-A",
            "monthly_rent": 8500,
            "security_deposit": 8500,
            "move_in_date": "2026-06-01",
            "expected_end_date": "2027-05-31",
            "status": "ACTIVE",
            "profile_id": tenant_profile_id,
            "emergency_name": "Suresh Kumar",
            "emergency_rel": "Father",
            "emergency_phone": "+91 98765 00001",
        },
        {
            "tenant_code": "TEN-1002",
            "full_name": "Priya Reddy",
            "phone": "+91 98765 11002",
            "email": "priya.reddy@example.com",
            "occupation": "Product Designer",
            "room_number": "101",
            "bed_code": "101-A",
            "monthly_rent": 12000,
            "security_deposit": 12000,
            "move_in_date": "2026-07-15",
            "expected_end_date": "2027-07-14",
            "status": "ACTIVE",
            "profile_id": None,
            "emergency_name": "Kavita Reddy",
            "emergency_rel": "Mother",
            "emergency_phone": "+91 98765 00002",
        },
        {
            "tenant_code": "TEN-1003",
            "full_name": "Arjun Rao",
            "phone": "+91 98765 11003",
            "email": "arjun.rao@example.com",
            "occupation": "Data Analyst",
            "room_number": "103",
            "bed_code": "103-B",
            "monthly_rent": 7000,
            "security_deposit": 7000,
            "move_in_date": "2026-08-01",
            "expected_end_date": "2027-07-31",
            "status": "ACTIVE",
            "profile_id": None,
            "emergency_name": "Venkat Rao",
            "emergency_rel": "Brother",
            "emergency_phone": "+91 98765 00003",
        },
        {
            "tenant_code": "TEN-1004",
            "full_name": "Sai Kumar",
            "phone": "+91 98765 11004",
            "email": "sai.kumar@example.com",
            "occupation": "Financial Analyst",
            "room_number": "201",
            "bed_code": "201-A",
            "monthly_rent": 8500,
            "security_deposit": 8500,
            "move_in_date": "2026-03-01",
            "expected_end_date": "2026-10-15",
            "status": "NOTICE_PERIOD",
            "profile_id": None,
            "emergency_name": "Lakshmi Kumar",
            "emergency_rel": "Sister",
            "emergency_phone": "+91 98765 00004",
        },
    ]

    tenant_map = {}  # tenant_code -> tenant_id

    for t in tenants_spec:
        t_code = t["tenant_code"]
        room_id = room_map.get(t["room_number"])
        bed_id = bed_map.get(t["bed_code"])

        # Check existing by tenant_code or email
        existing = sb.table("tenants").select("id").eq("tenant_code", t_code).limit(1).execute()
        if not existing.data and t["email"]:
            existing = sb.table("tenants").select("id").eq("email", t["email"]).limit(1).execute()

        payload = {
            "hostel_id": hostel_id,
            "profile_id": t["profile_id"],
            "tenant_code": t_code,
            "full_name": t["full_name"],
            "phone": t["phone"],
            "email": t["email"],
            "occupation": t["occupation"],
            "room_id": room_id,
            "bed_id": bed_id,
            "move_in_date": t["move_in_date"],
            "expected_end_date": t["expected_end_date"],
            "monthly_rent": t["monthly_rent"],
            "security_deposit": t["security_deposit"],
            "status": t["status"],
            "emergency_contact_name": t["emergency_name"],
            "emergency_contact_relationship": t["emergency_rel"],
            "emergency_contact_phone": t["emergency_phone"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if existing.data:
            t_id = existing.data[0]["id"]
            sb.table("tenants").update(payload).eq("id", t_id).execute()
            print(f"Updated tenant: {t['full_name']} ({t_code})")
        else:
            ins = sb.table("tenants").insert(payload).execute()
            t_id = ins.data[0]["id"]
            print(f"Created tenant: {t['full_name']} ({t_code})")

        tenant_map[t_code] = t_id

        # Bed Status Sync: assigned bed status must become OCCUPIED
        if bed_id:
            sb.table("beds").update({"status": "OCCUPIED"}).eq("id", bed_id).execute()

    return tenant_map


def seed_enquiries(hostel_id):
    """
    Seed 4 realistic enquiries:
    1. Rahul Sharma (Double Sharing, NEW)
    2. Megha Reddy (Single Sharing, INTERESTED)
    3. Vikram (Triple Sharing, VISIT_SCHEDULED)
    4. Anjali (Double Sharing, CONTACTED)
    """
    enquiries_spec = [
        {
            "name": "Rahul Sharma",
            "phone": "+91 98765 22001",
            "email": "rahul.sharma@example.com",
            "preferred_room": "Double Sharing",
            "move_in_date": (date.today() + timedelta(days=4)).isoformat(),
            "occupation": "Student",
            "status": "NEW",
            "message": "Need AC room on 1st or 2nd floor with high-speed WiFi.",
        },
        {
            "name": "Megha Reddy",
            "phone": "+91 98765 22002",
            "email": "megha.reddy@example.com",
            "preferred_room": "Single Sharing",
            "move_in_date": (date.today() + timedelta(days=15)).isoformat(),
            "occupation": "Software Engineer",
            "status": "INTERESTED",
            "message": "Interested in private single room near Madhapur metro station.",
            "owner_notes": "Called on Sep 25. Will confirm after campus visit.",
            "follow_up_date": (date.today() + timedelta(days=2)).isoformat(),
        },
        {
            "name": "Vikram Singh",
            "phone": "+91 98765 22003",
            "email": "vikram.singh@example.com",
            "preferred_room": "Triple Sharing",
            "move_in_date": (date.today() + timedelta(days=10)).isoformat(),
            "occupation": "Intern",
            "status": "VISIT_SCHEDULED",
            "message": "Looking for budget-friendly triple sharing with food included.",
            "visit_date": (date.today() + timedelta(days=1)).isoformat(),
            "owner_notes": "Property visit booked for tomorrow 4:00 PM.",
        },
        {
            "name": "Anjali Verma",
            "phone": "+91 98765 22004",
            "email": "anjali.verma@example.com",
            "preferred_room": "Double Sharing",
            "move_in_date": (date.today() + timedelta(days=7)).isoformat(),
            "occupation": "Student",
            "status": "CONTACTED",
            "message": "Enquiring for October intake with two-wheeler parking.",
            "owner_notes": "Sent room photos and fee structure on WhatsApp.",
        },
    ]

    enquiry_ids = []
    for eq in enquiries_spec:
        existing = sb.table("enquiries").select("id").eq("hostel_id", hostel_id).eq("email", eq["email"]).limit(1).execute()
        if existing.data:
            e_id = existing.data[0]["id"]
            sb.table("enquiries").update({
                "status": eq["status"],
                "preferred_room": eq["preferred_room"],
                "move_in_date": eq["move_in_date"],
                "occupation": eq["occupation"],
                "message": eq["message"],
                "owner_notes": eq.get("owner_notes"),
                "visit_date": eq.get("visit_date"),
                "follow_up_date": eq.get("follow_up_date"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", e_id).execute()
        else:
            ins = sb.table("enquiries").insert({
                "hostel_id": hostel_id,
                "name": eq["name"],
                "phone": eq["phone"],
                "email": eq["email"],
                "preferred_room": eq["preferred_room"],
                "move_in_date": eq["move_in_date"],
                "occupation": eq["occupation"],
                "status": eq["status"],
                "message": eq["message"],
                "owner_notes": eq.get("owner_notes"),
                "visit_date": eq.get("visit_date"),
                "follow_up_date": eq.get("follow_up_date"),
            }).execute()
            e_id = ins.data[0]["id"]
        enquiry_ids.append(e_id)

    print(f"Seeded {len(enquiries_spec)} enquiries.")
    return enquiry_ids


def seed_bookings(hostel_id, room_map, bed_map, tenant_map):
    """
    Seed 3 relational demo bookings:
    1. BK-2026-001: CONFIRMED, future move-in, room 102, bed 102-B
    2. BK-2026-002: PENDING, room 202, bed 202-A
    3. BK-2026-003: CHECKED_IN, Rahul Kumar (TEN-1001), room 102, bed 102-A
    """
    bookings_spec = [
        {
            "booking_code": "BK-2026-001",
            "booking_status": "CONFIRMED",
            "payment_status": "PAID",
            "booking_amount": 2000,
            "monthly_rent": 8500,
            "security_deposit": 8500,
            "booking_date": (date.today() - timedelta(days=5)).isoformat(),
            "expected_move_in_date": (date.today() + timedelta(days=10)).isoformat(),
            "room_id": room_map.get("102"),
            "bed_id": bed_map.get("102-B"),
            "notes": "Advance booking deposit paid online via UPI.",
        },
        {
            "booking_code": "BK-2026-002",
            "booking_status": "PENDING",
            "payment_status": "UNPAID",
            "booking_amount": 0,
            "monthly_rent": 7000,
            "security_deposit": 7000,
            "booking_date": (date.today() - timedelta(days=2)).isoformat(),
            "expected_move_in_date": (date.today() + timedelta(days=14)).isoformat(),
            "room_id": room_map.get("202"),
            "bed_id": bed_map.get("202-A"),
            "notes": "Awaiting token advance payment before room lock.",
        },
        {
            "booking_code": "BK-2026-003",
            "booking_status": "CHECKED_IN",
            "payment_status": "PAID",
            "booking_amount": 2000,
            "monthly_rent": 8500,
            "security_deposit": 8500,
            "booking_date": "2026-05-25",
            "expected_move_in_date": "2026-06-01",
            "tenant_id": tenant_map.get("TEN-1001"),
            "room_id": room_map.get("102"),
            "bed_id": bed_map.get("102-A"),
            "notes": "Regular tenancy checked in on June 1, 2026.",
        },
    ]

    for b in bookings_spec:
        code = b["booking_code"]
        existing = sb.table("bookings").select("id").eq("hostel_id", hostel_id).eq("booking_code", code).limit(1).execute()
        payload = {
            "hostel_id": hostel_id,
            "booking_code": code,
            "booking_status": b["booking_status"],
            "payment_status": b["payment_status"],
            "booking_amount": b["booking_amount"],
            "monthly_rent": b["monthly_rent"],
            "security_deposit": b["security_deposit"],
            "booking_date": b["booking_date"],
            "expected_move_in_date": b["expected_move_in_date"],
            "tenant_id": b.get("tenant_id"),
            "room_id": b.get("room_id"),
            "bed_id": b.get("bed_id"),
            "notes": b["notes"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if existing.data:
            sb.table("bookings").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("bookings").insert(payload).execute()

    print(f"Seeded {len(bookings_spec)} bookings.")


def seed_payments(hostel_id, tenant_map):
    """
    Seed payments tied to real seeded tenants:
    - Rahul Kumar (TEN-1001): amount_due: 8500, amount_paid: 5000, balance: 3500, status: PARTIAL
    - Priya Reddy (TEN-1002): amount_due: 12000, amount_paid: 12000, balance: 0, status: PAID
    - Arjun Rao (TEN-1003): amount_due: 7000, amount_paid: 0, balance: 7000, status: OVERDUE (past due date)
    - Sai Kumar (TEN-1004): amount_due: 8500, amount_paid: 8500, balance: 0, status: PAID
    """
    rahul_id = tenant_map.get("TEN-1001")
    priya_id = tenant_map.get("TEN-1002")
    arjun_id = tenant_map.get("TEN-1003")
    sai_id = tenant_map.get("TEN-1004")

    payments_spec = [
        {
            "tenant_id": rahul_id,
            "payment_type": "MONTHLY_RENT",
            "amount_due": 8500,
            "amount_paid": 5000,
            "balance_amount": 3500,
            "status": "PARTIAL",
            "due_date": "2026-09-05",
            "paid_date": "2026-09-06",
            "payment_method": "UPI",
            "reference_number": "UPI/9871236541",
            "notes": "Partial rent received via PhonePe. Balance promised by month end.",
        },
        {
            "tenant_id": priya_id,
            "payment_type": "MONTHLY_RENT",
            "amount_due": 12000,
            "amount_paid": 12000,
            "balance_amount": 0,
            "status": "PAID",
            "due_date": "2026-09-05",
            "paid_date": "2026-09-04",
            "payment_method": "NET_BANKING",
            "reference_number": "HDFC-N9872134",
            "notes": "September rent paid in full.",
        },
        {
            "tenant_id": arjun_id,
            "payment_type": "MONTHLY_RENT",
            "amount_due": 7000,
            "amount_paid": 0,
            "balance_amount": 7000,
            "status": "OVERDUE",
            "due_date": "2026-09-05",
            "paid_date": None,
            "payment_method": None,
            "reference_number": None,
            "notes": "September rent overdue by 22 days. Reminder sent via WhatsApp.",
        },
        {
            "tenant_id": sai_id,
            "payment_type": "MONTHLY_RENT",
            "amount_due": 8500,
            "amount_paid": 8500,
            "balance_amount": 0,
            "status": "PAID",
            "due_date": "2026-09-05",
            "paid_date": "2026-09-05",
            "payment_method": "UPI",
            "reference_number": "UPI/234987123",
            "notes": "September rent received on time.",
        },
    ]

    for p in payments_spec:
        if not p["tenant_id"]:
            continue
        existing = sb.table("payments").select("id").eq("hostel_id", hostel_id).eq("tenant_id", p["tenant_id"]).eq("due_date", p["due_date"]).limit(1).execute()
        payload = {
            "hostel_id": hostel_id,
            "tenant_id": p["tenant_id"],
            "payment_type": p["payment_type"],
            "amount_due": p["amount_due"],
            "amount_paid": p["amount_paid"],
            "balance_amount": p["balance_amount"],
            "status": p["status"],
            "due_date": p["due_date"],
            "paid_date": p["paid_date"],
            "payment_method": p["payment_method"],
            "reference_number": p["reference_number"],
            "notes": p["notes"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if existing.data:
            sb.table("payments").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("payments").insert(payload).execute()

    print(f"Seeded {len(payments_spec)} payments.")


def seed_complaints_and_maintenance(hostel_id, tenant_map):
    """
    Seed complaints and linked maintenance tasks:
    1. Rahul Kumar: WiFi not working (HIGH, IN_PROGRESS)
       -> Maintenance task: WiFi router check and reboot
    2. Priya Reddy: Water leakage (MEDIUM, OPEN)
       -> Maintenance task: Water leakage repair
    """
    rahul_id = tenant_map.get("TEN-1001")
    priya_id = tenant_map.get("TEN-1002")

    complaints_spec = [
        {
            "tenant_id": rahul_id,
            "title": "WiFi not working",
            "category": "Internet",
            "description": "High ping and frequent disconnection on 1st floor corridor.",
            "location": "Room 102 / 1st Floor",
            "priority": "HIGH",
            "status": "IN_PROGRESS",
            "assigned_to": "NetLink Broadband Tech",
            "maint_title": "WiFi router check and reboot",
            "maint_desc": "Inspect 1st floor access point and replace faulty ethernet patch cable.",
            "maint_date": (date.today() + timedelta(days=1)).isoformat(),
        },
        {
            "tenant_id": priya_id,
            "title": "Water leakage in bathroom",
            "category": "Plumbing",
            "description": "Washbasin tap continuously dripping in Room 101 washroom.",
            "location": "Room 101 Bathroom",
            "priority": "MEDIUM",
            "status": "OPEN",
            "assigned_to": "Ramesh (Hostel Plumber)",
            "maint_title": "Water leakage repair",
            "maint_desc": "Replace rubber washer and tap spindle in Room 101.",
            "maint_date": (date.today() + timedelta(days=2)).isoformat(),
        },
    ]

    for c in complaints_spec:
        if not c["tenant_id"]:
            continue
        c_exist = sb.table("complaints").select("id").eq("hostel_id", hostel_id).eq("tenant_id", c["tenant_id"]).eq("title", c["title"]).limit(1).execute()
        payload = {
            "hostel_id": hostel_id,
            "tenant_id": c["tenant_id"],
            "title": c["title"],
            "category": c["category"],
            "description": c["description"],
            "location": c["location"],
            "priority": c["priority"],
            "status": c["status"],
            "assigned_to": c["assigned_to"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if c_exist.data:
            c_id = c_exist.data[0]["id"]
            sb.table("complaints").update(payload).eq("id", c_id).execute()
        else:
            ins = sb.table("complaints").insert(payload).execute()
            c_id = ins.data[0]["id"]

        # Linked maintenance task
        m_exist = sb.table("maintenance_tasks").select("id").eq("hostel_id", hostel_id).eq("complaint_id", c_id).limit(1).execute()
        m_payload = {
            "hostel_id": hostel_id,
            "complaint_id": c_id,
            "title": c["maint_title"],
            "description": c["maint_desc"],
            "location": c["location"],
            "priority": c["priority"],
            "assigned_to": c["assigned_to"],
            "status": c["status"],
            "scheduled_date": c["maint_date"],
            "due_date": (date.today() + timedelta(days=3)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if m_exist.data:
            sb.table("maintenance_tasks").update(m_payload).eq("id", m_exist.data[0]["id"]).execute()
        else:
            sb.table("maintenance_tasks").insert(m_payload).execute()

    print(f"Seeded complaints and linked maintenance tasks.")


def seed_visitors(hostel_id, tenant_map):
    """
    Seed visitors:
    1. Suresh Kumar (Rahul - PENDING)
    2. Sneha Reddy (Priya - APPROVED)
    3. Mohan Rao (Arjun - CHECKED_IN)
    4. Ramesh Kumar (Sai - CHECKED_OUT)
    """
    rahul_id = tenant_map.get("TEN-1001")
    priya_id = tenant_map.get("TEN-1002")
    arjun_id = tenant_map.get("TEN-1003")
    sai_id = tenant_map.get("TEN-1004")

    visitors_spec = [
        {
            "tenant_id": rahul_id,
            "visitor_name": "Suresh Kumar",
            "visitor_phone": "+91 98765 33001",
            "relationship": "Brother",
            "purpose": "Weekend Family Visit",
            "visit_date": (date.today() + timedelta(days=2)).isoformat(),
            "status": "PENDING",
            "pass_code": "V-9821",
        },
        {
            "tenant_id": priya_id,
            "visitor_name": "Sneha Reddy",
            "visitor_phone": "+91 98765 33002",
            "relationship": "Sister",
            "purpose": "Delivering Books and Clothes",
            "visit_date": (date.today() + timedelta(days=1)).isoformat(),
            "status": "APPROVED",
            "pass_code": "V-5412",
        },
        {
            "tenant_id": arjun_id,
            "visitor_name": "Mohan Rao",
            "visitor_phone": "+91 98765 33003",
            "relationship": "Friend",
            "purpose": "College Group Study",
            "visit_date": date.today().isoformat(),
            "status": "CHECKED_IN",
            "pass_code": "V-1204",
        },
        {
            "tenant_id": sai_id,
            "visitor_name": "Ramesh Kumar",
            "visitor_phone": "+91 98765 33004",
            "relationship": "Uncle",
            "purpose": "Personal Visit",
            "visit_date": (date.today() - timedelta(days=1)).isoformat(),
            "status": "CHECKED_OUT",
            "pass_code": "V-7731",
        },
    ]

    for v in visitors_spec:
        if not v["tenant_id"]:
            continue
        existing = sb.table("visitor_requests").select("id").eq("hostel_id", hostel_id).eq("tenant_id", v["tenant_id"]).eq("visitor_name", v["visitor_name"]).limit(1).execute()
        payload = {
            "hostel_id": hostel_id,
            "tenant_id": v["tenant_id"],
            "visitor_name": v["visitor_name"],
            "visitor_phone": v["visitor_phone"],
            "relationship": v["relationship"],
            "purpose": v["purpose"],
            "visit_date": v["visit_date"],
            "status": v["status"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if existing.data:
            sb.table("visitor_requests").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("visitor_requests").insert(payload).execute()

    print(f"Seeded {len(visitors_spec)} visitor requests.")


def seed_announcements(hostel_id, owner_profile_id):
    """
    Seed announcements:
    1. Water Maintenance (PUBLISHED)
    2. Food Timing Update (PUBLISHED)
    3. Holiday Notice (DRAFT)
    """
    ann_spec = [
        {
            "title": "Water Maintenance",
            "message": "Scheduled overhead tank cleaning tomorrow between 10:00 AM and 2:00 PM. Please store sufficient water in advance.",
            "category": "Maintenance",
            "priority": "URGENT",
            "audience_type": "ALL_TENANTS",
            "status": "PUBLISHED",
            "publish_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "title": "Food Timing Update",
            "message": "Dinner service will now operate from 8:00 PM to 10:30 PM daily starting this Monday.",
            "category": "Dining",
            "priority": "NORMAL",
            "audience_type": "ALL_TENANTS",
            "status": "PUBLISHED",
            "publish_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "title": "Holiday Notice",
            "message": "Hostel front office will be closed on Gandhi Jayanti (October 2). The emergency caretaking desk remains operational.",
            "category": "Notice",
            "priority": "NORMAL",
            "audience_type": "ALL_TENANTS",
            "status": "DRAFT",
            "publish_at": None,
        },
    ]

    for a in ann_spec:
        existing = sb.table("announcements").select("id").eq("hostel_id", hostel_id).eq("title", a["title"]).limit(1).execute()
        payload = {
            "hostel_id": hostel_id,
            "title": a["title"],
            "message": a["message"],
            "category": a["category"],
            "priority": a["priority"],
            "audience_type": a["audience_type"],
            "status": a["status"],
            "publish_at": a["publish_at"],
            "created_by": owner_profile_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if existing.data:
            sb.table("announcements").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("announcements").insert(payload).execute()

    print(f"Seeded {len(ann_spec)} announcements.")


def run_seed():
    print("==================================================")
    print("URBANNEST HOSTEL CRM: IDEMPOTENT DATABASE SEED")
    print("==================================================")
    print(f"Target Supabase Project: {SUPABASE_URL}")
    print(f"Owner Demo Email: {DEMO_OWNER_EMAIL}")
    print(f"Tenant Demo Email: {DEMO_TENANT_EMAIL}")

    # 1. Hostel
    hostel_id = get_or_create_hostel()

    # 2. Owner Auth & Profile
    owner_auth_id = setup_auth_user(
        email=DEMO_OWNER_EMAIL,
        password=DEMO_OWNER_PASSWORD,
        metadata={
            "user_code": "OWN-001",
            "full_name": "Rajesh Kumar",
            "phone": "+91 98765 43210",
            "role": "OWNER",
            "hostel_id": hostel_id,
            "hostel_name": DEMO_HOSTEL_NAME,
            "city": DEMO_HOSTEL_LOCATION,
            "is_active": True,
            "onboarding_completed": True,
        }
    )
    owner_profile_id = setup_profile(
        auth_user_id=owner_auth_id,
        user_code="OWN-001",
        full_name="Rajesh Kumar",
        phone="+91 98765 43210",
        role="OWNER",
        hostel_id=hostel_id
    )

    # 3. Rooms & Beds
    room_map, bed_map = seed_rooms_and_beds(hostel_id)

    # 4. Tenant Auth & Profile (Rahul Kumar)
    tenant_auth_id = setup_auth_user(
        email=DEMO_TENANT_EMAIL,
        password=DEMO_TENANT_PASSWORD,
        metadata={
            "user_code": "TEN-1001",
            "full_name": "Rahul Kumar",
            "phone": "+91 98765 11001",
            "role": "TENANT",
            "hostel_id": hostel_id,
            "hostel_name": DEMO_HOSTEL_NAME,
            "city": DEMO_HOSTEL_LOCATION,
            "is_active": True,
            "onboarding_completed": True,
        }
    )
    tenant_profile_id = setup_profile(
        auth_user_id=tenant_auth_id,
        user_code="TEN-1001",
        full_name="Rahul Kumar",
        phone="+91 98765 11001",
        role="TENANT",
        hostel_id=hostel_id
    )

    # 5. Demo Tenants (links Rahul Kumar to tenant_profile_id and assigns rooms/beds)
    tenant_map = seed_tenants(hostel_id, room_map, bed_map, tenant_profile_id)

    # 6. Enquiries
    seed_enquiries(hostel_id)

    # 7. Bookings
    seed_bookings(hostel_id, room_map, bed_map, tenant_map)

    # 8. Payments
    seed_payments(hostel_id, tenant_map)

    # 9. Complaints & Maintenance
    seed_complaints_and_maintenance(hostel_id, tenant_map)

    # 10. Visitors
    seed_visitors(hostel_id, tenant_map)

    # 11. Announcements
    seed_announcements(hostel_id, owner_profile_id)

    print("==================================================")
    print("DEMO DATA SEEDING COMPLETE!")
    print("==================================================")


if __name__ == "__main__":
    run_seed()
