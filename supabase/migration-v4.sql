-- ============================================================
-- MATCHFINDER MIGRATION V4 — Profile Enhancement + Storage
-- Run after migration-v3.sql
-- ============================================================


-- ============================================================
-- ADD PROFILE COLUMNS
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_facebook boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT false;


-- ============================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

CREATE POLICY "Authenticated upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');


-- ============================================================
-- END V4
-- ============================================================
