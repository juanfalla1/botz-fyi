CREATE TABLE IF NOT EXISTS job_hunter_jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  company TEXT,
  url TEXT NOT NULL UNIQUE,
  source TEXT,
  location TEXT,
  full_job_text TEXT,
  english_required BOOLEAN,
  english_preferred BOOLEAN,
  bilingual_required BOOLEAN,
  canada_allowed BOOLEAN,
  remote BOOLEAN,
  active BOOLEAN,
  role_match INTEGER,
  decision TEXT,
  validation_reason TEXT,
  validation_evidence JSONB DEFAULT '[]'::jsonb,
  english_certification JSONB DEFAULT '{}'::jsonb,
  extraction_status TEXT,
  status TEXT NOT NULL DEFAULT 'FOUND' CHECK (status IN (
    'FOUND',
    'REJECTED',
    'VALIDATED',
    'READY_TO_APPLY',
    'NEEDS_REVIEW',
    'APPLIED',
    'ERROR'
  )),
  found_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_hunter_jobs_status ON job_hunter_jobs (status);
CREATE INDEX IF NOT EXISTS idx_job_hunter_jobs_found_at ON job_hunter_jobs (found_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_hunter_jobs_ready ON job_hunter_jobs (status, validated_at DESC)
  WHERE status = 'READY_TO_APPLY';

CREATE OR REPLACE FUNCTION set_job_hunter_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_hunter_jobs_updated_at ON job_hunter_jobs;
CREATE TRIGGER trg_job_hunter_jobs_updated_at
BEFORE UPDATE ON job_hunter_jobs
FOR EACH ROW
EXECUTE FUNCTION set_job_hunter_jobs_updated_at();
