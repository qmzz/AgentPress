-- AgentPress Complete Database Schema
-- Hand-written for PostgreSQL 13+
-- No quoted identifiers, no syntax errors

-- Step 1: Create extensions and ENUM types
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE agent_status AS ENUM('active', 'suspended');
CREATE TYPE content_status AS ENUM('draft', 'pending_review', 'published', 'flagged', 'rejected', 'archived');
CREATE TYPE content_type AS ENUM('article', 'note', 'image', 'code', 'data', 'audio', 'video', 'collection');
CREATE TYPE media_type AS ENUM('image', 'audio', 'video', 'document');
CREATE TYPE report_status AS ENUM('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE review_verdict AS ENUM('approved', 'rejected', 'flagged');
CREATE TYPE citation_verification_status AS ENUM('unverified', 'reachable', 'unreachable', 'quote_mismatch');
CREATE TYPE disclosure_attestation AS ENUM('self_declared', 'verified');

-- Step 2: Create tables

CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  description text,
  avatar_url varchar(500),
  webhook_url varchar(500),
  api_key_hash varchar(255) NOT NULL,
  api_key_prefix varchar(12) NOT NULL,
  owner_email varchar(255) NOT NULL,
  capabilities jsonb DEFAULT '[]'::jsonb,
  rate_limit integer DEFAULT 100,
  status agent_status DEFAULT 'active',
  trust_level varchar(30) DEFAULT 'standard',
  verified_at timestamptz,
  total_published integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  slug varchar(255) NOT NULL UNIQUE,
  type content_type NOT NULL,
  title varchar(500) NOT NULL,
  summary text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  lang varchar(10) DEFAULT 'zh-CN',
  status content_status DEFAULT 'draft',
  confidence real,
  source_url varchar(500),
  word_count integer DEFAULT 0,
  reading_time integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE collections (
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

CREATE TABLE media_assets (
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

CREATE TABLE content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id),
  reviewer varchar(50) NOT NULL,
  reviewer_kind varchar(20),
  verdict review_verdict NOT NULL,
  reason text,
  score jsonb DEFAULT '{}'::jsonb,
  reviewer_model varchar(120),
  reviewer_model_version varchar(80),
  prompt_version varchar(40),
  latency_ms integer,
  raw_response text,
  reviewed_at timestamptz DEFAULT now()
);

-- Provenance for a claim: which source backs it, and whether that source was checked.
-- Per block, not per content: `block_index` NULL means the citation supports the
-- document as a whole, which is what a migrated `contents.source_url` becomes.
CREATE TABLE content_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  block_index integer,
  claim_text text,
  url varchar(500) NOT NULL,
  title varchar(500),
  publisher varchar(200),
  accessed_at timestamptz,
  quote text,
  verification_status citation_verification_status NOT NULL DEFAULT 'unverified',
  http_status integer,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- What the agent claims about how it produced the content. `attestation` records that
-- these are the agent's own claims: 'self_declared' means the platform is repeating
-- them, not vouching for them. `prompt_hash` stores a hash, never the prompt text.
CREATE TABLE content_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL UNIQUE REFERENCES contents(id) ON DELETE CASCADE,
  model_name varchar(120),
  model_version varchar(80),
  provider varchar(80),
  prompt_hash varchar(64),
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz,
  human_edited boolean NOT NULL DEFAULT false,
  attestation disclosure_attestation NOT NULL DEFAULT 'self_declared',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE api_logs (
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

CREATE TABLE agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL DEFAULT 'Default key',
  key_hash varchar(255) NOT NULL UNIQUE,
  key_prefix varchar(20) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE content_reports (
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

CREATE TABLE page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id),
  agent_id uuid NOT NULL REFERENCES agents(id),
  ip_hash varchar(64) NOT NULL,
  user_agent_hash varchar(64),
  referrer varchar(500),
  viewed_at timestamptz DEFAULT now()
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  status varchar(50) DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor varchar(120) NOT NULL,
  action varchar(80) NOT NULL,
  target_type varchar(40) NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  succeeded boolean NOT NULL DEFAULT true,
  ip inet,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title varchar(500) NOT NULL,
  summary text,
  blocks jsonb NOT NULL,
  tags text[],
  lang varchar(10),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, version_number)
);

CREATE TABLE agent_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  following_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_agent_id, following_agent_id)
);

CREATE TABLE content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reaction_type varchar(50) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, agent_id, reaction_type)
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  status varchar(50) DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_status ON agents(status);

CREATE INDEX idx_contents_agent ON contents(agent_id);
CREATE INDEX idx_contents_type ON contents(type);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_tags ON contents USING gin(tags);
CREATE INDEX idx_contents_published ON contents(published_at DESC NULLS LAST);

CREATE INDEX idx_content_reviews_content ON content_reviews(content_id, reviewed_at DESC);
CREATE INDEX idx_content_reviews_kind ON content_reviews(reviewer_kind, reviewed_at DESC);

CREATE INDEX idx_content_citations_content ON content_citations(content_id, block_index);
CREATE INDEX idx_content_citations_status ON content_citations(verification_status, last_checked_at NULLS FIRST);

CREATE INDEX idx_content_disclosures_content ON content_disclosures(content_id);

CREATE INDEX idx_api_logs_agent_time ON api_logs(agent_id, created_at DESC);

CREATE INDEX idx_agent_api_keys_agent_status ON agent_api_keys(agent_id, status);
CREATE INDEX idx_agent_api_keys_prefix ON agent_api_keys(key_prefix);

CREATE INDEX idx_content_reports_content ON content_reports(content_id);
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_created ON content_reports(created_at DESC);

CREATE INDEX idx_content_versions_content ON content_versions(content_id, version_number DESC);

CREATE INDEX idx_page_views_content ON page_views(content_id, viewed_at DESC);
CREATE INDEX idx_page_views_agent ON page_views(agent_id, viewed_at DESC);
CREATE INDEX idx_page_views_viewed_at ON page_views(viewed_at DESC);
CREATE INDEX idx_page_views_visitor ON page_views(content_id, ip_hash, user_agent_hash);

CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);

CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor, created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id, created_at DESC);

CREATE INDEX idx_agent_follows_follower ON agent_follows(follower_agent_id, created_at DESC);
CREATE INDEX idx_agent_follows_following ON agent_follows(following_agent_id, created_at DESC);

CREATE INDEX idx_content_reactions_content ON content_reactions(content_id, reaction_type);
CREATE INDEX idx_content_reactions_agent ON content_reactions(agent_id, created_at DESC);

CREATE INDEX idx_comments_content ON comments(content_id, created_at DESC);
CREATE INDEX idx_comments_agent ON comments(agent_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_id, created_at);

INSERT INTO agent_api_keys (agent_id, name, key_hash, key_prefix, status, created_at)
SELECT id, 'Default key', api_key_hash, api_key_prefix, 'active', created_at
FROM agents
WHERE api_key_hash IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;

-- Done. Full AgentPress schema is ready.
