-- SiteVerify demo setup (run once in Supabase SQL Editor)
-- Lets you test OTP login without paying for SMS

-- 1) Add test phone numbers in Supabase Dashboard (no SQL needed):
--    Authentication → Phone → Test phone numbers
--    +919876543210  →  123456   (homeowner)
--    +919876543211  →  123456   (inspector)

-- 2) Enable Phone provider:
--    Authentication → Providers → Phone → ON

-- 3) Create admin user in Dashboard:
--    Authentication → Users → Add user
--    Email: admin@siteverify.in
--    Password: Demo@12345
--    Auto-confirm: ON

-- 4) Promote admin profile (run after step 3):
UPDATE profiles SET role = 'admin', full_name = 'Site Admin'
WHERE email = 'admin@siteverify.in';

-- 5) Ensure phone column + profile trigger exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

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
