-- ============================================================================
-- Migration: 016_property_structure.sql
-- Domain:    Hostel Property Structure (Floors, Rooms & Beds Hierarchy)
-- Purpose:   Add dedicated floors table, link rooms to floors, support flexible
--            room types and pricing without losing existing data.
-- ============================================================================

-- 1. CREATE FLOORS TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    floor_name TEXT,
    display_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_floors_hostel_floor_number UNIQUE (hostel_id, floor_number)
);

-- 2. ALTER ROOMS TABLE TO ADD floor_id, room_name, notes & EXPAND room_type
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS notes TEXT;

-- Safely expand room_type constraint to allow FOUR_SHARING and CUSTOM
DO $$
BEGIN
    ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check;
    ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS chk_rooms_type;
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_room_type_check
        CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING', 'CUSTOM'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. MIGRATE EXISTING ROOM FLOOR DATA TO FLOORS TABLE (Idempotent)
INSERT INTO public.floors (hostel_id, floor_number, floor_name, display_order)
SELECT DISTINCT
    r.hostel_id,
    COALESCE(r.floor, 1) AS floor_number,
    CASE
        WHEN COALESCE(r.floor, 1) = 0 THEN 'Ground Floor'
        WHEN COALESCE(r.floor, 1) = 1 THEN 'First Floor'
        WHEN COALESCE(r.floor, 1) = 2 THEN 'Second Floor'
        WHEN COALESCE(r.floor, 1) = 3 THEN 'Third Floor'
        WHEN COALESCE(r.floor, 1) = 4 THEN 'Fourth Floor'
        ELSE 'Floor ' || COALESCE(r.floor, 1)
    END AS floor_name,
    COALESCE(r.floor, 1) AS display_order
FROM public.rooms r
WHERE r.hostel_id IS NOT NULL
ON CONFLICT (hostel_id, floor_number) DO NOTHING;

-- Link existing rooms to their respective floors by (hostel_id, floor_number)
UPDATE public.rooms r
SET floor_id = f.id
FROM public.floors f
WHERE r.hostel_id = f.hostel_id
  AND COALESCE(r.floor, 1) = f.floor_number
  AND r.floor_id IS NULL;

-- 4. CREATE INDEXES FOR FAST RELATIONAL QUERIES
CREATE INDEX IF NOT EXISTS idx_floors_hostel_id ON public.floors(hostel_id);
CREATE INDEX IF NOT EXISTS idx_floors_floor_number ON public.floors(floor_number);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON public.rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_id ON public.rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON public.beds(room_id);
CREATE INDEX IF NOT EXISTS idx_beds_hostel_id ON public.beds(hostel_id);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) ON FLOORS
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES FOR FLOORS
DO $$
BEGIN
    DROP POLICY IF EXISTS "service_role_full_access_floors" ON public.floors;
    CREATE POLICY "service_role_full_access_floors" ON public.floors
        FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_select_floors" ON public.floors;
    CREATE POLICY "authenticated_select_floors" ON public.floors
        FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
