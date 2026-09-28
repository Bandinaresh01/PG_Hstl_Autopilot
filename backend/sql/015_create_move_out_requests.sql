-- ============================================================================
-- Migration: 015_create_move_out_requests.sql
-- Domain:    Tenant Move-Out, Notice Period & Security Deposit Clearance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.move_out_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    requested_move_out_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED')),
    notice_given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    actual_move_out_date DATE,
    outstanding_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (outstanding_amount >= 0),
    deposit_refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_refund_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_out_hostel_id ON public.move_out_requests(hostel_id);
CREATE INDEX IF NOT EXISTS idx_move_out_tenant_id ON public.move_out_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_move_out_status ON public.move_out_requests(status);
CREATE INDEX IF NOT EXISTS idx_move_out_req_date ON public.move_out_requests(requested_move_out_date);
