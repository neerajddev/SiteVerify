-- SiteVerify — Supabase Storage setup
-- Run in Supabase Dashboard → SQL Editor (AFTER prisma/schema.sql)

-- ── 1. Create public bucket for drawings, site photos, inspection evidence ───
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-uploads',
  'site-uploads',
  true,
  8388608,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'application/pdf',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Storage policies ──────────────────────────────────────────────────────

-- Anyone with the link can view (bucket is public — good for admin/homeowner/inspector)
DROP POLICY IF EXISTS "site_uploads public read" ON storage.objects;
CREATE POLICY "site_uploads public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-uploads');

-- Logged-in users can upload
DROP POLICY IF EXISTS "site_uploads authenticated insert" ON storage.objects;
CREATE POLICY "site_uploads authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-uploads');

-- Users can replace their own files (path contains their user id)
DROP POLICY IF EXISTS "site_uploads owner update" ON storage.objects;
CREATE POLICY "site_uploads owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-uploads'
  AND auth.uid()::text = ANY(string_to_array(name, '/'))
);

-- Users can delete their own files
DROP POLICY IF EXISTS "site_uploads owner delete" ON storage.objects;
CREATE POLICY "site_uploads owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-uploads'
  AND auth.uid()::text = ANY(string_to_array(name, '/'))
);
