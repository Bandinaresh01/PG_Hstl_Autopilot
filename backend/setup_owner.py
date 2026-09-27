"""
setup_owner.py
Automated provisioning script for Supabase Auth Owner and Tenant accounts.
Uses Supabase Admin API with SUPABASE_SECRET_KEY from backend/.env.
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env", file=sys.stderr)
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

DEMO_HOSTEL_NAME = "UrbanNest Hostel"
DEMO_HOSTEL_LOCATION = "Hyderabad, Telangana"


def get_or_create_hostel():
    try:
        res = sb.table("hostels").select("id, name, location").eq("name", DEMO_HOSTEL_NAME).limit(1).execute()
        if res.data and len(res.data) > 0:
            print(f"Found existing hostel: {res.data[0]['name']} (UUID: {res.data[0]['id']})")
            return res.data[0]["id"]
    except Exception as e:
        print(f"Query hostel note: {e}")

    try:
        res_any = sb.table("hostels").select("id, name, location").limit(1).execute()
        if res_any.data and len(res_any.data) > 0:
            print(f"Using existing hostel: {res_any.data[0]['name']} (UUID: {res_any.data[0]['id']})")
            return res_any.data[0]["id"]
    except Exception as e:
        print(f"Query any hostel note: {e}")

    try:
        ins = sb.table("hostels").insert({
            "name": DEMO_HOSTEL_NAME,
            "location": DEMO_HOSTEL_LOCATION,
            "status": "ACTIVE"
        }).execute()
        if ins.data:
            print(f"Created hostel: {ins.data[0]['name']} (UUID: {ins.data[0]['id']})")
            return ins.data[0]["id"]
    except Exception as e:
        print(f"Error creating hostel: {e}")

    return "020f1800-c239-4a9f-9cf5-2012f4a9415d"


def provision():
    hostel_id = get_or_create_hostel()
    print(f"Active Hostel ID: {hostel_id}")

    accounts_to_provision = [
        {
            "email": "owner@urbannest.in",
            "password": "UrbanNest@2026",
            "metadata": {
                "user_code": "OWN-001",
                "full_name": "Rajesh Kumar",
                "phone": "+91 98765 43210",
                "role": "OWNER",
                "hostel_id": hostel_id,
                "hostel_name": DEMO_HOSTEL_NAME,
                "city": DEMO_HOSTEL_LOCATION,
                "is_active": True,
                "onboarding_completed": True,
            },
        },
        {
            "email": "tenant@urbannest.in",
            "password": "Tenant@2026",
            "metadata": {
                "user_code": "TEN-001",
                "full_name": "Aarav Sharma",
                "phone": "+91 91234 56789",
                "role": "TENANT",
                "hostel_id": hostel_id,
                "hostel_name": DEMO_HOSTEL_NAME,
                "city": DEMO_HOSTEL_LOCATION,
                "is_active": True,
                "onboarding_completed": True,
            },
        },
        {
            "email": "inactive.owner@urbannest.in",
            "password": "Inactive@2026",
            "metadata": {
                "user_code": "OWN-999",
                "full_name": "Inactive Owner",
                "phone": "+91 90000 00000",
                "role": "OWNER",
                "hostel_id": hostel_id,
                "hostel_name": DEMO_HOSTEL_NAME,
                "city": DEMO_HOSTEL_LOCATION,
                "is_active": False,
                "onboarding_completed": False,
            },
        },
    ]

    print("Checking existing Supabase Auth users...")
    existing_users = sb.auth.admin.list_users()
    existing_map = {u.email.lower(): u for u in existing_users}

    user_records = {}

    for acc in accounts_to_provision:
        email = acc["email"].lower()
        if email in existing_map:
            user = existing_map[email]
            print(f"User {email} already exists in Supabase Auth (UUID: {user.id}). Updating metadata...")
            updated = sb.auth.admin.update_user_by_id(
                user.id,
                {
                    "user_metadata": acc["metadata"],
                    "app_metadata": acc["metadata"],
                    "email_confirm": True,
                },
            )
            user_records[email] = updated.user if hasattr(updated, "user") else user
        else:
            print(f"Creating new Supabase Auth user: {email}...")
            created = sb.auth.admin.create_user(
                {
                    "email": email,
                    "password": acc["password"],
                    "email_confirm": True,
                    "user_metadata": acc["metadata"],
                    "app_metadata": acc["metadata"],
                }
            )
            user_records[email] = created.user if hasattr(created, "user") else created
            print(f"Created {email} with UUID: {user_records[email].id}")

    # Link profiles in public.profiles table
    print("\nLinking profiles in public.profiles table...")
    for acc in accounts_to_provision:
        email = acc["email"].lower()
        user = user_records.get(email)
        if not user:
            continue
        meta = acc["metadata"]
        try:
            sb.table("profiles").upsert(
                {
                    "auth_user_id": user.id,
                    "user_code": meta["user_code"],
                    "full_name": meta["full_name"],
                    "phone": meta["phone"],
                    "role": meta["role"],
                    "hostel_id": hostel_id,
                    "is_active": meta["is_active"],
                    "onboarding_completed": meta["onboarding_completed"],
                },
                on_conflict="auth_user_id",
            ).execute()
            print(f"Successfully linked profile for {email} ({meta['role']}).")
        except Exception as e:
            print(f"Error linking profile for {email}: {e}")

    # Seed demo tenant record in public.tenants if needed
    tenant_user = user_records.get("tenant@urbannest.in")
    if tenant_user:
        try:
            prof_res = sb.table("profiles").select("id").eq("auth_user_id", tenant_user.id).limit(1).execute()
            prof_id = prof_res.data[0]["id"] if prof_res.data else None
            sb.table("tenants").upsert(
                {
                    "hostel_id": hostel_id,
                    "profile_id": prof_id,
                    "tenant_code": "TEN-001",
                    "full_name": "Aarav Sharma",
                    "phone": "+91 91234 56789",
                    "email": "tenant@urbannest.in",
                    "occupation": "Software Engineer",
                    "monthly_rent": 8500.0,
                    "security_deposit": 8500.0,
                    "status": "ACTIVE",
                    "move_in_date": "2026-09-01",
                    "expected_end_date": "2027-03-01",
                    "emergency_contact_name": "Suresh Sharma",
                    "emergency_contact_phone": "+91 98765 00000",
                },
                on_conflict="tenant_code",
            ).execute()
            print("Successfully linked tenant record in public.tenants table.")
        except Exception as e:
            print(f"Note on tenant table linking: {e}")

    print("\n--- Provisioning Summary ---")
    print(f"Hostel ID:    {hostel_id}")
    print(f"Owner Login:  owner@urbannest.in / UrbanNest@2026 (Role: OWNER, Code: OWN-001)")
    print(f"Tenant Login: tenant@urbannest.in / Tenant@2026 (Role: TENANT, Code: TEN-001)")
    print(f"Inactive:     inactive.owner@urbannest.in / Inactive@2026 (Role: OWNER, Active: False)")


if __name__ == "__main__":
    provision()
