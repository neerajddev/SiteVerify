-- SiteVerify — Full schema with auth roles (run in Supabase SQL Editor)
-- Step 1: Enable Phone auth in Supabase → Authentication → Providers → Phone
-- Step 2: Add SMS provider (Twilio) under Authentication → Phone

-- ── Profiles (one row per user, stores role) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('homeowner', 'inspector', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND role IN ('homeowner', 'inspector')
  );

-- Auto-create profile when user signs up (fixes RLS error on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'homeowner');
  IF user_role NOT IN ('homeowner', 'inspector') THEN
    user_role := 'homeowner';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    NEW.phone
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Projects table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  homeowner_name TEXT NOT NULL,
  assigned_inspector TEXT NOT NULL DEFAULT 'Pending Assignment',
  location TEXT NOT NULL,
  project_status TEXT NOT NULL DEFAULT 'Pending Assignment',
  foundation_type TEXT NOT NULL DEFAULT 'rr',
  blueprint_file TEXT,
  total_progress INTEGER NOT NULL DEFAULT 0,
  current_phase TEXT,
  data JSONB NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  inspector_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add columns if table already existed without them
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES auth.users(id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────────────────────
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

-- ── Remove old public prototype policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access" ON projects;
DROP POLICY IF EXISTS "Allow public insert access" ON projects;
DROP POLICY IF EXISTS "Allow public update access" ON projects;
DROP POLICY IF EXISTS "Allow public delete access" ON projects;

-- ── Role-based project policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Role-based project select" ON projects;
CREATE POLICY "Role-based project select" ON projects
  FOR SELECT USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR inspector_id = auth.uid()
  );

DROP POLICY IF EXISTS "Homeowners insert projects" ON projects;
CREATE POLICY "Homeowners insert projects" ON projects
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND public.get_my_role() = 'homeowner'
  );

DROP POLICY IF EXISTS "Homeowners update own projects" ON projects;
CREATE POLICY "Homeowners update own projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() AND public.get_my_role() = 'homeowner'
  );

DROP POLICY IF EXISTS "Inspectors update assigned projects" ON projects;
CREATE POLICY "Inspectors update assigned projects" ON projects
  FOR UPDATE USING (
    inspector_id = auth.uid() AND public.get_my_role() = 'inspector'
  );

DROP POLICY IF EXISTS "Admins manage all projects" ON projects;
CREATE POLICY "Admins manage all projects" ON projects
  FOR ALL USING (public.is_admin());

-- ── Bootstrap first admin (run AFTER creating account in Auth dashboard) ─────
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- ── Next steps after this file ───────────────────────────────────────────────
-- 1. prisma/storage-setup.sql — file uploads (drawings, photos)
-- 2. prisma/add-visit-structure.sql — optional generated visit columns on projects
-- 3. prisma/normalized-visits.sql — visits / tests / photos / corrections tables
--    (dual-written from the app; enables homeowner approved-only RLS + sequence lock)
-- 4. prisma/project-chat.sql — homeowner ↔ admin chat per project
