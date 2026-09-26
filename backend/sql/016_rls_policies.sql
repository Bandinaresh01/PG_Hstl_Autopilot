-- ============================================================================
-- Migration: 016_rls_policies.sql
-- Domain:    Row Level Security (RLS) Configuration
-- Purpose:   Defense-in-depth isolation for authenticated Supabase users
-- Note:      Flask backend continues to enforce strict server-side authorization
-- ============================================================================

-- Enable RLS on all operational domain tables
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_out_requests ENABLE ROW LEVEL SECURITY;

-- 1. Full access for service_role (used by Flask backend with secret key)
CREATE POLICY "service_role_full_access_hostels" ON public.hostels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_rooms" ON public.rooms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_beds" ON public.beds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_tenants" ON public.tenants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_enquiries" ON public.enquiries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_bookings" ON public.bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_expenses" ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_complaints" ON public.complaints FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_maintenance" ON public.maintenance_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_visitors" ON public.visitor_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_announcements" ON public.announcements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_documents" ON public.documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_move_out" ON public.move_out_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Public can create enquiries
CREATE POLICY "public_insert_enquiries" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Authenticated users can view their own profile
CREATE POLICY "authenticated_select_own_profile" ON public.profiles FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());
