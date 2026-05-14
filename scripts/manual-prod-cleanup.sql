-- manual-prod-cleanup.sql
-- One-time production database cleanup for DocTrackr.
-- Run ONCE after deploying the Task #5 / Task #8 code to a fresh server,
-- OR when migrating an existing installation that still has the old schema.
--
-- What this does:
--   1. Drops the `notes` column from students, employees, checklist_items
--      (removed from the Drizzle schema in Task #5; the automated migration
--       was aborted to avoid data loss, so this must be run manually)
--   2. Removes 6 deprecated employee document types and all of their
--      associated checklist items
--
-- How to run (Docker Compose):
--   docker compose exec db psql -U doctrackr doctrackr < scripts/manual-prod-cleanup.sql
--
-- How to run (direct psql):
--   psql "$DATABASE_URL" -f scripts/manual-prod-cleanup.sql
--
-- This script is idempotent — safe to run more than once (IF EXISTS guards).

BEGIN;

-- ── 1. Drop notes columns ──────────────────────────────────────────────────────

ALTER TABLE students       DROP COLUMN IF EXISTS notes;
ALTER TABLE employees      DROP COLUMN IF EXISTS notes;
ALTER TABLE checklist_items DROP COLUMN IF EXISTS notes;

-- ── 2. Remove deprecated employee document types ───────────────────────────────
-- Delete checklist items first (foreign key constraint)

DELETE FROM checklist_items
WHERE document_type_id IN (
  SELECT id FROM document_types
  WHERE name IN (
    'Resume',
    'Diploma',
    'W-2 Form',
    '3 Reference Letters',
    'DOH Approval Request',
    'Supporting Children with Special Needs'
  )
);

DELETE FROM document_types
WHERE name IN (
  'Resume',
  'Diploma',
  'W-2 Form',
  '3 Reference Letters',
  'DOH Approval Request',
  'Supporting Children with Special Needs'
);

COMMIT;

-- Verify
SELECT 'students.notes removed' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='students' AND column_name='notes'
);

SELECT 'employees.notes removed' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='employees' AND column_name='notes'
);

SELECT 'checklist_items.notes removed' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='checklist_items' AND column_name='notes'
);

SELECT 'deprecated doc types removed' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM document_types
  WHERE name IN (
    'Resume','Diploma','W-2 Form',
    '3 Reference Letters','DOH Approval Request',
    'Supporting Children with Special Needs'
  )
);
