-- Job queue for async tasks
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  status varchar(50) DEFAULT 'pending',
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  error text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at) WHERE status IN ('pending', 'running');

-- Content version history
CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  title varchar(500) NOT NULL,
  summary text,
  blocks jsonb NOT NULL,
  tags text[],
  language varchar(10),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id, version_number DESC);
