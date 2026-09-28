-- ============================================================================
-- Migration: 004_create_beds.sql
-- Domain:    Beds & Occupancy Tracking
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
