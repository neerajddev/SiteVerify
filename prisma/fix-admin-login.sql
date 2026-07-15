-- Fix: admin login "Profile missing"
-- Cause: "Admins read all profiles" policy queries profiles inside itself → RLS blocks reads.
-- Run this whole file once in Supabase → SQL Editor → Run

-- 1) Safe admin check (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) Replace recursive SELECT policy
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 3) Promote all admin emails to role = admin
-- Run this AFTER creating each user in Auth → Users → Add user
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, 'Site Admin', 'admin'
FROM auth.users
WHERE email IN (
  'admin1@siteverify.com',
  'admin.ashin@siteverify.com',
  'admin.aswajith@siteverify.com'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Site Admin');

-- 4) Verify — should show all 3 with role = admin
SELECT id, email, role FROM public.profiles
WHERE email IN (
  'admin1@siteverify.com',
  'admin.ashin@siteverify.com',
  'admin.aswajith@siteverify.com'
)
ORDER BY email;
