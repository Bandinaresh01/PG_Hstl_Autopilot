-- ============================================================================
-- Migration: 009_create_expenses.sql
-- Domain:    Hostel Operational Expenses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('ELECTRICITY', 'WATER', 'FOOD', 'INTERNET', 'MAINTENANCE', 'SALARY', 'SUPPLIES', 'OTHER')),
    description TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    expense_date DATE NOT NULL,
    vendor TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_hostel_id ON public.expenses(hostel_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
