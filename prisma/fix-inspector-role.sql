-- Promote a phone user to inspector (run in Supabase SQL Editor)
-- Use when someone signed up on the inspector portal but still has role = homeowner,
-- or their profiles row is missing after OTP.

-- 1) Find the user
SELECT id, phone, email FROM auth.users
WHERE phone LIKE '%YOUR_10_DIGIT_NUMBER%';

-- 2) Create / set inspector profile
INSERT INTO public.profiles (id, phone, full_name, role)
SELECT id, phone, COALESCE(raw_user_meta_data->>'full_name', 'Inspector'), 'inspector'
FROM auth.users
WHERE phone LIKE '%YOUR_10_DIGIT_NUMBER%'
ON CONFLICT (id) DO UPDATE
SET role = 'inspector',
    phone = EXCLUDED.phone,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

-- 3) Confirm
SELECT id, phone, full_name, role FROM public.profiles
WHERE phone LIKE '%YOUR_10_DIGIT_NUMBER%';
