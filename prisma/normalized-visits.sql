-- SiteVerify — Normalized visits / tests / photos (run in Supabase SQL Editor)
-- Prerequisite: prisma/schema.sql (projects + profiles) already applied.
-- Optional: prisma/add-visit-structure.sql
--
-- The app still stores the full tree in projects.data (JSONB) for the UI.
-- These tables mirror that tree for reporting, filters, RLS gates, and
-- future API rules (homeowner approved-only, visit sequence, 3B alerts).

-- ── Extra project columns (writable; synced from app on save) ─────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS maps_link TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permit_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_projects_district ON projects (district);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (project_status);

-- ── Inspectors profile extension ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_number TEXT,
  years_experience NUMERIC(4,1),
  district_list TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  kit_deposit_paid BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inspectors read own row" ON inspectors;
CREATE POLICY "Inspectors read own row" ON inspectors
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Inspectors update own row" ON inspectors;
CREATE POLICY "Inspectors update own row" ON inspectors
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage inspectors" ON inspectors;
CREATE POLICY "Admins manage inspectors" ON inspectors
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Inspectors insert own row" ON inspectors;
CREATE POLICY "Inspectors insert own row" ON inspectors
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ── Visits (9 per project: 1A–4B) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visit_code TEXT NOT NULL CHECK (
    visit_code IN ('1A','1B','2A','3A','3B','4A','4B','3C','3D')
  ),
  inspector_id UUID REFERENCES auth.users(id),
  scheduled_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN (
      'not_started', 'assigned', 'in_progress', 'submitted',
      'revision', 'approved', 'locked'
    )
  ),
  admin_notes TEXT,
  pour_date TIMESTAMPTZ,
  pour_date_confirmed_at TIMESTAMPTZ,
  is_unannounced BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (project_id, visit_code)
);

CREATE INDEX IF NOT EXISTS idx_visits_project ON visits (project_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits (status);
CREATE INDEX IF NOT EXISTS idx_visits_code_status ON visits (visit_code, status);
CREATE INDEX IF NOT EXISTS idx_visits_inspector ON visits (inspector_id);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visit select by project access" ON visits;
CREATE POLICY "Visit select by project access" ON visits
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = visits.project_id
        AND (p.owner_id = auth.uid() OR p.inspector_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Visit write by admin or inspector" ON visits;
CREATE POLICY "Visit write by admin or inspector" ON visits
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = visits.project_id AND p.inspector_id = auth.uid()
    )
  );

-- ── Tests (17 nested under visits) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL CHECK (test_number BETWEEN 1 AND 17),
  name TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN (
      'not_started', 'in_progress', 'submitted',
      'revision_requested', 'approved'
    )
  ),
  overall_result TEXT,
  condition TEXT,
  measurement TEXT,
  remarks TEXT,
  severity TEXT CHECK (severity IS NULL OR severity IN ('minor', 'moderate', 'critical')),
  is_na BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  submitted_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  admin_qa_note TEXT,
  revision_reason TEXT,
  payout_released BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (visit_id, test_number)
);

CREATE INDEX IF NOT EXISTS idx_tests_visit ON tests (visit_id);
CREATE INDEX IF NOT EXISTS idx_tests_project ON tests (project_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests (status);
CREATE INDEX IF NOT EXISTS idx_tests_submitted ON tests (status, submitted_at)
  WHERE status = 'submitted';

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Homeowners only see approved (or N/A) test payloads
DROP POLICY IF EXISTS "Test select gated" ON tests;
CREATE POLICY "Test select gated" ON tests
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tests.project_id AND p.inspector_id = auth.uid()
    )
    OR (
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = tests.project_id AND p.owner_id = auth.uid()
      )
      AND (tests.status = 'approved' OR tests.is_na = TRUE)
    )
  );

DROP POLICY IF EXISTS "Test write by admin or inspector" ON tests;
CREATE POLICY "Test write by admin or inspector" ON tests
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tests.project_id AND p.inspector_id = auth.uid()
    )
  );

-- ── Photos ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  captured_at TIMESTAMPTZ,
  is_camera_capture BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_test ON photos (test_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photo select via test access" ON photos;
CREATE POLICY "Photo select via test access" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests t
      WHERE t.id = photos.test_id
        AND (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = t.project_id AND p.inspector_id = auth.uid()
          )
          OR (
            EXISTS (
              SELECT 1 FROM projects p
              WHERE p.id = t.project_id AND p.owner_id = auth.uid()
            )
            AND (t.status = 'approved' OR t.is_na = TRUE)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Photo write by admin or inspector" ON photos;
CREATE POLICY "Photo write by admin or inspector" ON photos
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM tests t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = photos.test_id AND p.inspector_id = auth.uid()
    )
  );

-- Reject gallery uploads when flag is false (API / trigger guard)
CREATE OR REPLACE FUNCTION public.enforce_camera_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_camera_capture IS NOT TRUE THEN
    RAISE EXCEPTION 'Camera-only evidence required (is_camera_capture must be true)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_photos_camera_only ON photos;
CREATE TRIGGER trg_photos_camera_only
  BEFORE INSERT OR UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_camera_capture();

-- ── Corrections (send-back history) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_corrections_test ON corrections (test_id);

ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Corrections select" ON corrections;
CREATE POLICY "Corrections select" ON corrections
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM tests t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = corrections.test_id
        AND (p.inspector_id = auth.uid() OR p.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Corrections write admin" ON corrections;
CREATE POLICY "Corrections write admin" ON corrections
  FOR ALL USING (public.is_admin());

-- ── Progress helper (approved ÷ applicable × 100) ────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_project_progress(p_project_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  applicable INTEGER;
  approved_count INTEGER;
  pct INTEGER;
BEGIN
  SELECT COUNT(*) INTO applicable
  FROM tests
  WHERE project_id = p_project_id AND is_na = FALSE;

  IF applicable = 0 THEN
    pct := 0;
  ELSE
    SELECT COUNT(*) INTO approved_count
    FROM tests
    WHERE project_id = p_project_id AND is_na = FALSE AND status = 'approved';
    pct := ROUND((approved_count::NUMERIC / applicable) * 100)::INTEGER;
  END IF;

  UPDATE projects
  SET progress_pct = pct,
      total_progress = pct,
      updated_at = NOW()
  WHERE id = p_project_id;

  RETURN pct;
END;
$$;

-- ── Visit sequence lock (server-side) ────────────────────────────────────────
-- Visit order: 1A → 1B → 2A → 3A → 3B → 3C → 3D → 4A → 4B
CREATE OR REPLACE FUNCTION public.visit_sequence_index(code TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE code
    WHEN '1A' THEN 0
    WHEN '1B' THEN 1
    WHEN '2A' THEN 2
    WHEN '3A' THEN 3
    WHEN '3B' THEN 4
    WHEN '3C' THEN 5
    WHEN '3D' THEN 6
    WHEN '4A' THEN 7
    WHEN '4B' THEN 8
    ELSE -1
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_visit_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  prev_code TEXT;
  prev_ok BOOLEAN;
BEGIN
  -- Only when assigning / moving into assigned|in_progress from not_started
  IF NEW.status IN ('assigned', 'in_progress')
     AND COALESCE(OLD.status, 'not_started') = 'not_started'
     AND public.visit_sequence_index(NEW.visit_code) > 0 THEN

    SELECT v.visit_code INTO prev_code
    FROM (
      SELECT unnest(ARRAY['1A','1B','2A','3A','3B','3C','3D','4A','4B']) AS visit_code
    ) codes
    JOIN LATERAL (
      SELECT public.visit_sequence_index(codes.visit_code) AS idx
    ) x ON TRUE
    WHERE x.idx = public.visit_sequence_index(NEW.visit_code) - 1;

    SELECT
      (SELECT COUNT(*) FROM tests t
       JOIN visits v ON v.id = t.visit_id
       WHERE v.project_id = NEW.project_id
         AND v.visit_code = prev_code) = 0
      OR NOT EXISTS (
        SELECT 1 FROM tests t
        JOIN visits v ON v.id = t.visit_id
        WHERE v.project_id = NEW.project_id
          AND v.visit_code = prev_code
          AND t.is_na = FALSE
          AND t.status IS DISTINCT FROM 'approved'
      )
    INTO prev_ok;

    IF NOT prev_ok THEN
      RAISE EXCEPTION 'Visit sequence lock: approve Visit % before assigning Visit %',
        prev_code, NEW.visit_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_sequence ON visits;
CREATE TRIGGER trg_visit_sequence
  BEFORE INSERT OR UPDATE OF status ON visits
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visit_sequence();

-- ── Visit 3B submitted → bump project updated_at (queue signal) ──────────────
CREATE OR REPLACE FUNCTION public.flag_visit_3b_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NEW.status = 'submitted' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'submitted' THEN
    SELECT visit_code INTO v_code FROM visits WHERE id = NEW.visit_id;
    IF v_code = '3B' THEN
      UPDATE projects
      SET updated_at = NOW(),
          current_phase = 'Visit 3B — approve today (pour cannot wait)'
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tests_3b_alert ON tests;
CREATE TRIGGER trg_tests_3b_alert
  AFTER UPDATE OF status ON tests
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_visit_3b_submitted();

-- ── Backfill stub: after creating tables, sync from existing JSONB via app
--    (save any project once) or run a one-off script. Do not INSERT from SQL
--    blindly — photo URLs and workflow fields live in projects.data.

COMMENT ON TABLE visits IS 'SiteVerify 9 visits per project (1A–4B). Dual-written from app JSONB.';
COMMENT ON TABLE tests IS 'SiteVerify 17 tests. Homeowners RLS-gated to approved only.';
COMMENT ON TABLE photos IS 'Evidence photos; is_camera_capture enforced.';
COMMENT ON TABLE corrections IS 'Admin send-back reason history.';
COMMENT ON TABLE inspectors IS 'Inspector credentials + districts.';
