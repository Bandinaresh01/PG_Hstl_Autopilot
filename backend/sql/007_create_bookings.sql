-- ============================================================================
-- Migration: 007_create_bookings.sql
-- Domain:    Bookings & Reservations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
    booking_code TEXT UNIQUE,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_move_in_date DATE,
    booking_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'COMPLETED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')),
    monthly_rent NUMERIC(10,2) CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(10,2) CHECK (security_deposit >= 0),
    booking_amount NUMERIC(10,2) CHECK (booking_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_hostel_id ON public.bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_enquiry_id ON public.bookings(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_bed_id ON public.bookings(bed_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
