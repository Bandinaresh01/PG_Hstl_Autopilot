-- ============================================================================
-- Migration: 001_owner_crm_foundation.sql
-- Purpose:   Create core hostels and profiles tables for Owner CRM Foundation
-- Stack:     Supabase (PostgreSQL + Supabase Auth)
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLE: hostels
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. TABLE: profiles
-- Stores role, hostel relation, user code, name, and account status.
-- Passwords are NEVER stored here; authentication is handled by Supabase Auth.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'TENANT', 'MANAGER', 'RECEPTIONIST')),
    hostel_id UUID REFERENCES public.hostels(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup during login & authorization
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_hostel_id ON public.profiles(hostel_id);

-- ============================================================================
-- 3. SEED DEMO HOSTEL: UrbanNest Hostel
-- ============================================================================
INSERT INTO public.hostels (id, name, location, status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'UrbanNest Hostel',
    'Hyderabad, Telangana',
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    status = EXCLUDED.status;
