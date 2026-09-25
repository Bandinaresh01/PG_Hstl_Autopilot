# UrbanNest Owner CRM - Database Setup & Owner Account Guide

This document describes how to configure the PostgreSQL database in Supabase and authenticate with the Owner CRM.

---

## 1. PostgreSQL Schema Migrations

In your [Supabase Dashboard](https://supabase.com/dashboard) -> Select Project -> **SQL Editor**:

### Step A: Run Migration 001
Copy and execute the contents of [`migrations/001_owner_crm_foundation.sql`](./migrations/001_owner_crm_foundation.sql):
- Creates `public.hostels` table with default demo hostel `UrbanNest Hostel` (`11111111-1111-1111-1111-111111111111`).
- Creates `public.profiles` table with foreign keys to `auth.users(id)` and `public.hostels(id)`.
- Defines allowed roles: `OWNER`, `TENANT`, `MANAGER`, `RECEPTIONIST`.

### Step B: Run Migration 002
Copy and execute the contents of [`migrations/002_seed_demo_owner.sql`](./migrations/002_seed_demo_owner.sql):
- Links the Supabase Auth user `owner@urbannest.in` to `public.profiles` with `user_code = 'OWN-001'` and `role = 'OWNER'`.

---

## 2. Pre-Provisioned Accounts (Supabase Auth)

The accounts have already been registered in **Supabase Auth**:

| Role | Email | Password | User Code | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `owner@urbannest.in` | `UrbanNest@2026` | `OWN-001` | Full Owner CRM (`/owner/*`) access |
| **Tenant** | `tenant@urbannest.in` | `Tenant@2026` | `TEN-001` | Denied from Owner CRM (HTTP 403) |
| **Inactive** | `inactive.owner@urbannest.in` | `Inactive@2026` | `OWN-999` | Deactivated (HTTP 403) |

> 🔒 **Security Notice**: Passwords are saved only within Supabase Auth (`auth.users`) and are never stored in plain-text or in the application database. The backend authenticates via Supabase Auth and validates the profile's role and active status before granting access to `/api/owner/*`.

---

## 3. Creating Future Owner Accounts Programmatically

To provision a new owner account:
1. Run `python setup_owner.py` or create the user in **Supabase Dashboard** -> **Authentication** -> **Users**.
2. Note the generated Auth User UUID.
3. Insert or update the profile row in `public.profiles`:
   ```sql
   INSERT INTO public.profiles (auth_user_id, user_code, full_name, phone, role, hostel_id, is_active, onboarding_completed)
   VALUES ('<AUTH_USER_UUID>', 'OWN-002', 'Full Name', '+91 98765 00000', 'OWNER', '11111111-1111-1111-1111-111111111111', true, true);
   ```
