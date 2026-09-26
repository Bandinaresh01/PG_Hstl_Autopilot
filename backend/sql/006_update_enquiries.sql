-- ============================================================================
-- Migration: 006_update_enquiries.sql
-- Domain:    Public Enquiries & Lead Pipeline (Non-destructive update)
-- ============================================================================

-- Safely extend enquiries table without dropping any existing rows
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
