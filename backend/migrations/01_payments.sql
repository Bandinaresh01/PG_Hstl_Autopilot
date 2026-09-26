-- ============================================================================
-- UrbanNest Hostel CRM: Payments & Rent Due Table
-- Migration: 01_payments.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id VARCHAR(64) PRIMARY KEY,
    hostel_id VARCHAR(64) NOT NULL DEFAULT 'hstl-urbannest-01',
    tenant_id VARCHAR(64) NOT NULL,
    tenant_name VARCHAR(128),
    room_number VARCHAR(64),
    payment_type VARCHAR(64) NOT NULL DEFAULT 'Monthly Rent',
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(64) DEFAULT 'Pending',
    reference_number VARCHAR(128) DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_tenant ON public.payments(hostel_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
