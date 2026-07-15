-- Clean duplicate inspector profiles (same phone, multiple rows)
-- Run in Supabase SQL Editor after checking the SELECT results.

-- 1) See duplicates
SELECT phone, COUNT(*), array_agg(id), array_agg(full_name)
FROM public.profiles
WHERE role = 'inspector' AND phone IS NOT NULL AND phone <> ''
GROUP BY phone
HAVING COUNT(*) > 1;

-- 2) Keep the newest profile per phone; demote older duplicates to homeowner
--    so they no longer appear in the assign dropdown.
WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY RIGHT(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10)
      ORDER BY created_at DESC NULLS LAST
    ) AS rn
  FROM public.profiles
  WHERE role = 'inspector'
    AND phone IS NOT NULL
    AND phone <> ''
)
UPDATE public.profiles p
SET role = 'homeowner',
    updated_at = NOW()
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 3) If a project was assigned to a demoted duplicate id, point it at the kept inspector
-- (optional — review before running; replace KEPT_UUID / OLD_UUID as needed)
-- UPDATE public.projects
-- SET inspector_id = 'KEPT_UUID',
--     assigned_inspector = (SELECT full_name FROM public.profiles WHERE id = 'KEPT_UUID')
-- WHERE inspector_id = 'OLD_UUID';
