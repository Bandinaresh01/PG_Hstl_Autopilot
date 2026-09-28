-- ============================================================================
-- Migration: 017_announcements.sql
-- Domain:    Hostel Broadcasts & Tenant Notices
-- Fixes:     PGRST205 table cache / schema definition for public.announcements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    hostel_id uuid NOT NULL
        REFERENCES public.hostels(id)
        ON DELETE CASCADE,

    title text NOT NULL,

    message text NOT NULL,

    category text,

    priority text NOT NULL DEFAULT 'NORMAL',

    audience_type text NOT NULL DEFAULT 'ALL_TENANTS',

    publish_at timestamptz,

    expires_at timestamptz,

    status text NOT NULL DEFAULT 'DRAFT',

    created_by uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Priority check constraint (NORMAL, IMPORTANT, URGENT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_announcements_priority'
    ) THEN
        ALTER TABLE public.announcements
        ADD CONSTRAINT chk_announcements_priority
        CHECK (priority IN ('LOW', 'NORMAL', 'IMPORTANT', 'HIGH', 'URGENT'));
    END IF;
END $$;

-- Status check constraint (DRAFT, PUBLISHED, EXPIRED, ARCHIVED)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_announcements_status'
    ) THEN
        ALTER TABLE public.announcements
        ADD CONSTRAINT chk_announcements_status
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'));
    END IF;
END $$;

-- Indexes for performant lookups by hostel, status, and publication schedule
CREATE INDEX IF NOT EXISTS idx_announcements_hostel
ON public.announcements(hostel_id);

CREATE INDEX IF NOT EXISTS idx_announcements_status
ON public.announcements(status);

CREATE INDEX IF NOT EXISTS idx_announcements_publish_at
ON public.announcements(publish_at);

-- Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Allow authenticated users read announcements'
    ) THEN
        CREATE POLICY "Allow authenticated users read announcements"
            ON public.announcements
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
