-- ============================================================================
-- Migration: 008_create_payments.sql
-- Domain:    Financials, Rent Invoices & Payment Ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('MONTHLY_RENT', 'SECURITY_DEPOSIT', 'BOOKING_AMOUNT', 'ELECTRICITY', 'FOOD', 'LAUNDRY', 'MAINTENANCE', 'OTHER')),
    amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PENDING', 'PARTIAL', 'DUE_SOON', 'OVERDUE')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_id ON public.payments(hostel_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON public.payments(payment_type);
