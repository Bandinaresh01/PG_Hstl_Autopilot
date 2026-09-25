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

DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"
DEMO_HOSTEL_NAME = "UrbanNest Hostel"
DEMO_HOSTEL_LOCATION = "Hyderabad, Telangana"

ACCOUNTS_TO_PROVISION = [
    {
        "email": "owner@urbannest.in",
        "password": "UrbanNest@2026",
        "metadata": {
            "user_code": "OWN-001",
            "full_name": "Rajesh Kumar",
            "phone": "+91 98765 43210",
            "role": "OWNER",
            "hostel_id": DEMO_HOSTEL_ID,
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
            "hostel_id": DEMO_HOSTEL_ID,
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
            "hostel_id": DEMO_HOSTEL_ID,
            "hostel_name": DEMO_HOSTEL_NAME,
            "city": DEMO_HOSTEL_LOCATION,
            "is_active": False,
            "onboarding_completed": False,
        },
    },
]


def provision():
    print("Checking existing Supabase Auth users...")
    existing_users = sb.auth.admin.list_users()
    existing_map = {u.email.lower(): u for u in existing_users}

    user_records = {}

    for acc in ACCOUNTS_TO_PROVISION:
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

    # Next, try inserting into public.hostels and public.profiles if tables exist
    print("\nAttempting to seed public.hostels and public.profiles tables in PostgreSQL...")
    try:
        sb.table("hostels").upsert(
            {
                "id": DEMO_HOSTEL_ID,
                "name": DEMO_HOSTEL_NAME,
                "location": DEMO_HOSTEL_LOCATION,
                "status": "ACTIVE",
            }
        ).execute()
        print("Successfully seeded public.hostels with UrbanNest Hostel.")
    except Exception as e:
        print(f"Note: public.hostels table not yet created in PostgreSQL ({e}). Run migrations/001_owner_crm_foundation.sql in Supabase SQL editor.")

    owner_user = user_records.get("owner@urbannest.in")
    if owner_user:
        try:
            sb.table("profiles").upsert(
                {
                    "auth_user_id": owner_user.id,
                    "user_code": "OWN-001",
                    "full_name": "Rajesh Kumar",
                    "phone": "+91 98765 43210",
                    "role": "OWNER",
                    "hostel_id": DEMO_HOSTEL_ID,
                    "is_active": True,
                    "onboarding_completed": True,
                },
                on_conflict="auth_user_id",
            ).execute()
            print("Successfully linked owner profile in public.profiles table.")
        except Exception as e:
            print(f"Note: public.profiles table not yet created in PostgreSQL ({e}). Run migrations/001_owner_crm_foundation.sql in Supabase SQL editor.")

    print("\n--- Provisioning Summary ---")
    print(f"Owner Login:  owner@urbannest.in / UrbanNest@2026 (Role: OWNER, Code: OWN-001)")
    print(f"Tenant Login: tenant@urbannest.in / Tenant@2026 (Role: TENANT, Code: TEN-001)")
    print(f"Inactive:     inactive.owner@urbannest.in / Inactive@2026 (Role: OWNER, Active: False)")


if __name__ == "__main__":
    provision()
