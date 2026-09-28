-- ============================================================================
-- MIGRATION 03: VISITOR REQUESTS & ENTRY/EXIT SECURITY LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.visitors (
    id TEXT PRIMARY KEY,                           -- e.g. 'VIS-1001'
    hostel_id TEXT NOT NULL DEFAULT 'hstl_demo_001',
    tenant_id TEXT NOT NULL,                       -- e.g. 'TEN-1001' or tenant auth uuid
    tenant_name TEXT NOT NULL,                     -- e.g. 'Rahul Sharma'
    tenant_phone TEXT,
    room_number TEXT NOT NULL DEFAULT 'Room 204',
    bed_code TEXT DEFAULT 'Bed A',
    visitor_name TEXT NOT NULL,                    -- Full name of visitor
    visitor_phone TEXT NOT NULL,                   -- Contact phone
    relationship TEXT NOT NULL DEFAULT 'Friend',  -- 'Parent', 'Sibling', 'Friend', 'Colleague', 'Delivery', 'Other'
    purpose TEXT NOT NULL DEFAULT 'Personal Visit',
    id_type TEXT DEFAULT 'Aadhaar Card',          -- 'Aadhaar Card', 'Driving License', 'College ID', 'Passport', 'Other'
    id_number TEXT,                                -- Masked or full ID reference
    visit_date DATE NOT NULL,                      -- e.g. '2026-09-27'
    expected_time TEXT NOT NULL DEFAULT '14:00',   -- e.g. '14:00' or '14:00 - 18:00'
    expected_duration_hours INT DEFAULT 2,
    is_overnight BOOLEAN DEFAULT FALSE,
    pass_code TEXT,                                -- e.g. 'VP-8492'
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' 
        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED')),
    check_in_time TIMESTAMPTZ,                     -- Recorded at reception/gate
    check_out_time TIMESTAMPTZ,                    -- Recorded at reception/gate
    checked_in_by TEXT,                            -- Guard or receptionist
    checked_out_by TEXT,
    rejection_reason TEXT,                         -- Reason if rejected
    approval_notes TEXT,                           -- Gate instructions
    owner_notes TEXT,                              -- Internal staff notes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying and filtering
CREATE INDEX IF NOT EXISTS idx_visitors_hostel_status ON public.visitors(hostel_id, status);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant ON public.visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON public.visitors(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitors_pass_code ON public.visitors(pass_code);
