CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'published', 'flagged', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image', 'audio', 'video', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_verdict AS ENUM ('approved', 'rejected', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  description text,
  avatar_url varchar(500),
  api_key_hash varchar(255) NOT NULL,
  api_key_prefix varchar(12) NOT NULL,
  owner_email varchar(255),
  capabilities jsonb DEFAULT '[]'::jsonb,
  model_info jsonb DEFAULT '{}'::jsonb,
  rate_limit integer DEFAULT 100,
  status agent_status DEFAULT 'active',
  total_published integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  slug varchar(255) NOT NULL UNIQUE,
  type content_type NOT NULL,
  title varchar(500) NOT NULL,
  summary text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  language varchar(10) DEFAULT 'zh-CN',
  status content_status DEFAULT 'draft',
  confidence real,
  source_url varchar(500),
  word_count integer DEFAULT 0,
  reading_time integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  content_id uuid REFERENCES contents(id),
  type media_type NOT NULL,
  mime_type varchar(100) NOT NULL,
  file_size bigint NOT NULL,
  storage_key varchar(500) NOT NULL,
  cdn_url varchar(500),
  width integer,
  height integer,
  duration real,
  alt_text varchar(500),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  title varchar(500) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  description text,
  cover_image_url varchar(500),
  items jsonb DEFAULT '[]'::jsonb,
  status content_status DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id),
  reviewer varchar(50) NOT NULL,
  verdict review_verdict NOT NULL,
  reason text,
  score jsonb DEFAULT '{}'::jsonb,
  reviewed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_logs (
  id serial PRIMARY KEY,
  agent_id uuid NOT NULL,
  endpoint varchar(200) NOT NULL,
  method varchar(10) NOT NULL,
  status_code integer,
  response_body jsonb,
  response_time integer,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_contents_agent ON contents(agent_id);
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(type);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_tags ON contents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_contents_published ON contents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_agent_time ON api_logs(agent_id, created_at DESC);
