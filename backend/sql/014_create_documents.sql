-- ============================================================================
-- Migration: 014_create_documents.sql
-- Domain:    Tenant KYC, ID Verification & Lease Agreements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('AADHAAR', 'PAN', 'COLLEGE_ID', 'EMPLOYMENT_ID', 'RENTAL_AGREEMENT', 'POLICE_VERIFICATION', 'OTHER')),
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_hostel_id ON public.documents(hostel_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_verified_by ON public.documents(verified_by);
