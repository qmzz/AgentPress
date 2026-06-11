ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS trust_level varchar(30) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id),
  reporter_name varchar(120),
  reporter_email varchar(255),
  reason varchar(80) NOT NULL,
  details text,
  status report_status DEFAULT 'open',
  action_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports(created_at DESC);
