-- ============================================================================
-- MASTER SCHEMA MIGRATION: UrbanNest Hostel CRM
-- Stack: Supabase PostgreSQL
-- Purpose: Complete domain-driven schema with relational integrity, foreign keys,
--          indexes, constraints, and demo data seed.
-- Safe & Idempotent: Can be run directly in the Supabase SQL Query Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. HOSTELS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hostels_status ON public.hostels(status);

-- Seed UrbanNest Hostel demo row
INSERT INTO public.hostels (id, name, location, address, phone, email, status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'UrbanNest Hostel',
    'Hyderabad, Telangana',
    'Plot 42, Hitech City Main Road, Madhapur, Hyderabad - 500081',
    '+91 91234 56789',
    'contact@urbannest.in',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    status = EXCLUDED.status,
    updated_at = now();

-- ============================================================================
-- 2. PROFILES TABLE (Supabase Auth IAM mapping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'RECEPTIONIST', 'TENANT')),
    hostel_id UUID REFERENCES public.hostels(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_hostel_id ON public.profiles(hostel_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_code ON public.profiles(user_code);

-- ============================================================================
-- 3. ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE')),
    floor INTEGER,
    monthly_rent NUMERIC(10,2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'UNAVAILABLE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rooms_hostel_room_number UNIQUE (hostel_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id ON public.rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON public.rooms(floor);

-- ============================================================================
-- 4. BEDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    bed_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_beds_room_bed_code UNIQUE (room_id, bed_code)
);

CREATE INDEX IF NOT EXISTS idx_beds_hostel_id ON public.beds(hostel_id);
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON public.beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON public.beds(status);

-- ============================================================================
-- 5. TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tenant_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    occupation TEXT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
    move_in_date DATE,
    expected_end_date DATE,
    monthly_rent NUMERIC(10,2) CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'NOTICE_PERIOD', 'MOVED_OUT', 'INACTIVE')),
    emergency_contact_name TEXT,
    emergency_contact_relationship TEXT,
    emergency_contact_phone TEXT,
    rules_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_hostel_id ON public.tenants(hostel_id);
CREATE INDEX IF NOT EXISTS idx_tenants_profile_id ON public.tenants(profile_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON public.tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_bed_id ON public.tenants(bed_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);

-- ============================================================================
-- 6. ENQUIRIES TABLE (Safely update existing table without dropping data)
-- ============================================================================
ALTER TABLE public.enquiries
    ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES public.hostels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS follow_up_date DATE,
    ADD COLUMN IF NOT EXISTS visit_date DATE,
    ADD COLUMN IF NOT EXISTS owner_notes TEXT,
    ADD COLUMN IF NOT EXISTS preferred_room TEXT,
    ADD COLUMN IF NOT EXISTS move_in_date DATE,
    ADD COLUMN IF NOT EXISTS occupation TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill any existing unlinked enquiries with UrbanNest demo hostel ID
UPDATE public.enquiries
SET hostel_id = '11111111-1111-1111-1111-111111111111'
WHERE hostel_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_enquiries_hostel_id ON public.enquiries(hostel_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);

-- ============================================================================
-- 7. BOOKINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
    booking_code TEXT UNIQUE,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_move_in_date DATE,
    booking_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    monthly_rent NUMERIC(10,2) CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(10,2) CHECK (security_deposit >= 0),
    booking_amount NUMERIC(10,2) CHECK (booking_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_hostel_id ON public.bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_enquiry_id ON public.bookings(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed_id ON public.bookings(bed_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- ============================================================================
-- 8. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('MONTHLY_RENT', 'SECURITY_DEPOSIT', 'BOOKING_AMOUNT', 'ELECTRICITY', 'FOOD', 'LAUNDRY', 'MAINTENANCE', 'OTHER')),
    amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PENDING', 'PARTIAL', 'DUE_SOON', 'OVERDUE')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_id ON public.payments(hostel_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);

-- ============================================================================
-- 9. EXPENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('ELECTRICITY', 'WATER', 'FOOD', 'INTERNET', 'MAINTENANCE', 'SALARY', 'SUPPLIES', 'OTHER')),
    description TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL,
    vendor TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_hostel_id ON public.expenses(hostel_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- ============================================================================
-- 10. COMPLAINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    assigned_to TEXT,
    owner_notes TEXT,
    tenant_visible_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_hostel_id ON public.complaints(hostel_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_id ON public.complaints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);

-- ============================================================================
-- 11. MAINTENANCE TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    scheduled_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_hostel_id ON public.maintenance_tasks(hostel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_complaint_id ON public.maintenance_tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_date ON public.maintenance_tasks(due_date);

-- ============================================================================
-- 12. VISITOR REQUESTS TABLE (and 'visitors' compatibility view)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    relationship TEXT,
    purpose TEXT,
    visit_date DATE,
    expected_arrival_time TIME,
    expected_exit_time TIME,
    actual_entry_time TIMESTAMPTZ,
    actual_exit_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
    tenant_notes TEXT,
    staff_notes TEXT,
    tenant_visible_note TEXT,
    pass_code TEXT,
    id_type TEXT,
    id_number TEXT,
    is_overnight BOOLEAN DEFAULT false,
    checked_in_by TEXT,
    checked_out_by TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_requests_hostel_id ON public.visitor_requests(hostel_id);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_tenant_id ON public.visitor_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_status ON public.visitor_requests(status);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_visit_date ON public.visitor_requests(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_pass_code ON public.visitor_requests(pass_code);

-- Compatibility view for queries using table name 'visitors'
CREATE OR REPLACE VIEW public.visitors AS
    SELECT * FROM public.visitor_requests;

-- ============================================================================
-- 13. ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    audience_type TEXT NOT NULL DEFAULT 'ALL_TENANTS' CHECK (audience_type IN ('ALL_TENANTS', 'FLOOR', 'ROOM', 'CUSTOM')),
    publish_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_hostel_id ON public.announcements(hostel_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON public.announcements(publish_at);

-- ============================================================================
-- 14. DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('AADHAAR', 'PAN', 'COLLEGE_ID', 'EMPLOYMENT_ID', 'RENTAL_AGREEMENT', 'POLICE_VERIFICATION', 'OTHER')),
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_hostel_id ON public.documents(hostel_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_verified_by ON public.documents(verified_by);

-- ============================================================================
-- 15. MOVE-OUT REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.move_out_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    requested_move_out_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED')),
    notice_given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    actual_move_out_date DATE,
    outstanding_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
    deposit_refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_refund_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_out_hostel_id ON public.move_out_requests(hostel_id);
CREATE INDEX IF NOT EXISTS idx_move_out_tenant_id ON public.move_out_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_move_out_status ON public.move_out_requests(status);
CREATE INDEX IF NOT EXISTS idx_move_out_req_date ON public.move_out_requests(requested_move_out_date);

-- ============================================================================
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_out_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypasses for backend queries
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS "service_role_full_access_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "service_role_full_access_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END
$$;

-- Allow public to submit website enquiries
DROP POLICY IF EXISTS "public_insert_enquiries" ON public.enquiries;
CREATE POLICY "public_insert_enquiries" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow authenticated users to view their own profile
DROP POLICY IF EXISTS "authenticated_select_own_profile" ON public.profiles;
CREATE POLICY "authenticated_select_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
