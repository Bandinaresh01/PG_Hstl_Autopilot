-- ============================================================================
-- Migration: 001_create_hostels.sql
-- Domain:    Hostels Core
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
