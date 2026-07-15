-- SiteVerify — Visit-structure alignment (optional but recommended)
-- Run in Supabase SQL Editor AFTER prisma/schema.sql.
--
-- The app stores the full project (stages, 17 tests, assignment with
-- visitCodes 1A–4B, constructionType, plinthBeamType) inside the JSONB
-- `data` column, so no schema change is strictly required for sync.
-- This migration only exposes commonly-filtered fields as real columns
-- (auto-derived from JSONB — the app never writes them directly).

-- Kerala construction type (rr_load_bearing / laterite /
-- contemporary_traditional / modern_square)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS construction_type TEXT
  GENERATED ALWAYS AS (data->>'constructionType') STORED;

-- Plinth type on RR base ('rr' pure rubble | 'rcc' hybrid plinth beam).
-- Drives which foundation tests are N/A (pure RR: 2,3,4 · hybrid: 2 only).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS plinth_beam_type TEXT
  GENERATED ALWAYS AS (data->>'plinthBeamType') STORED;

-- Current assigned visit code (1A,1B,2A,3A,3B,3C,3D,4A,4B)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS assigned_visit_code TEXT
  GENERATED ALWAYS AS (data->'assignment'->'visitCodes'->>0) STORED;

-- Scheduled visit time — useful for admin dashboards ordering by next visit
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS scheduled_visit_at TIMESTAMPTZ
  GENERATED ALWAYS AS (
    NULLIF(data->'assignment'->>'scheduledVisitAt', '')::timestamptz
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_projects_assigned_visit
  ON projects (assigned_visit_code)
  WHERE assigned_visit_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_scheduled_visit
  ON projects (scheduled_visit_at)
  WHERE scheduled_visit_at IS NOT NULL;
