-- ============================================================================
-- Migration: 003_create_rooms.sql
-- Domain:    Rooms Management
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
