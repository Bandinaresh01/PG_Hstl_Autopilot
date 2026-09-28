-- ============================================================================
-- UrbanNest Hostel CRM: Complaints & Maintenance Tables
-- Migration: 02_complaints_maintenance.sql
-- ============================================================================

-- 1. Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
    id VARCHAR(64) PRIMARY KEY,
    hostel_id VARCHAR(64) NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    tenant_id VARCHAR(64) NOT NULL,
    tenant_name VARCHAR(128),
    room_number VARCHAR(64),
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(128) NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    assigned_to VARCHAR(128) DEFAULT '',
    owner_notes TEXT DEFAULT '',
    tenant_visible_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_complaints_hostel_tenant ON public.complaints(hostel_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);

-- 2. Maintenance Tasks Table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id VARCHAR(64) PRIMARY KEY,
    hostel_id VARCHAR(64) NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
    complaint_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    location VARCHAR(128) NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    assigned_to VARCHAR(128) DEFAULT 'Maintenance Staff',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    scheduled_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_hostel ON public.maintenance_tasks(hostel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_complaint ON public.maintenance_tasks(complaint_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_tasks(status);
