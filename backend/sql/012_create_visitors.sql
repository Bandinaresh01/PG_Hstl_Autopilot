-- ============================================================================
-- Migration: 012_create_visitors.sql
-- Domain:    Visitor Passes, Security Gate Approvals & Entry/Exit Tracking
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
