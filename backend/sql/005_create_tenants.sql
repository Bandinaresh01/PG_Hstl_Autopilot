-- ============================================================================
-- Migration: 005_create_tenants.sql
-- Domain:    Tenants & Resident Profiles
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
