-- Extend notetaker_folders for richer Playbooks UX

ALTER TABLE IF EXISTS notetaker_folders
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'folder',
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_notetaker_folders_favorite
  ON notetaker_folders(profile_id, is_favorite);
