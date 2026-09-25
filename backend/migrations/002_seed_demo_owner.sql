-- ============================================================================
-- Migration: 002_seed_demo_owner.sql
-- Purpose:   Link the Supabase Auth owner user to public.profiles
-- Note:      Replace '<AUTH_USER_UUID>' with the real UUID from auth.users
-- ============================================================================

-- Example: If your Supabase Auth user for owner@urbannest.in has id = '...',
-- you can link the profile row as follows:

DO $$
DECLARE
    v_owner_auth_id UUID;
    v_hostel_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Look up the auth.users id for the owner email
    SELECT id INTO v_owner_auth_id
    FROM auth.users
    WHERE email = 'owner@urbannest.in'
    LIMIT 1;

    IF v_owner_auth_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            auth_user_id,
            user_code,
            full_name,
            phone,
            role,
            hostel_id,
            is_active,
            onboarding_completed
        )
        VALUES (
            v_owner_auth_id,
            'OWN-001',
            'Rajesh Kumar',
            '+91 98765 43210',
            'OWNER',
            v_hostel_id,
            true,
            true
        )
        ON CONFLICT (auth_user_id) DO UPDATE
        SET
            user_code = EXCLUDED.user_code,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            hostel_id = EXCLUDED.hostel_id,
            is_active = EXCLUDED.is_active;
            
        RAISE NOTICE 'Successfully linked owner profile for auth user %', v_owner_auth_id;
    ELSE
        RAISE NOTICE 'No auth user with email owner@urbannest.in found. Create the user in Supabase Auth first.';
    END IF;
END $$;
