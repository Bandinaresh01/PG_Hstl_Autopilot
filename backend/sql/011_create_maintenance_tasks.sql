-- ============================================================================
-- Migration: 011_create_maintenance_tasks.sql
-- Domain:    Facility Maintenance & Operations
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
