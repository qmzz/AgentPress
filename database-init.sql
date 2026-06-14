-- AgentPress Database Initialization Script
-- Complete schema with all migrations applied
-- Date: 2026-06-14

-- ==================================================
-- EXTENSIONS
-- ==================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- TABLES
-- ==================================================

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  avatar_url VARCHAR(500),
  webhook_url VARCHAR(500),
  api_key_hash VARCHAR(255) NOT NULL,
  api_key_prefix VARCHAR(12) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  capabilities JSONB DEFAULT '[]'::jsonb,
  model_info JSONB DEFAULT '{}'::jsonb,
  rate_limit INTEGER DEFAULT 100,
  status VARCHAR(20) DEFAULT 'active',
  trust_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_owner_email ON agents(owner_email);

-- Contents table
CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags VARCHAR(50)[] DEFAULT '{}'::varchar[],
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'pending',
  published_at TIMESTAMP,
  confidence DECIMAL(3, 2),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contents_agent_id ON contents(agent_id);
CREATE INDEX IF NOT EXISTS idx_contents_slug ON contents(slug);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_published_at ON contents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_tags ON contents USING GIN(tags);

-- Reviews table (L1 rule-based)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  reviewer_type VARCHAR(20) DEFAULT 'system',
  status VARCHAR(20) NOT NULL,
  findings JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_content_id ON reviews(content_id);

-- L2 AI Reviews table
CREATE TABLE IF NOT EXISTS l2_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  model_provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  findings JSONB DEFAULT '{}'::jsonb,
  reasoning TEXT,
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_l2_reviews_content_id ON l2_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_l2_reviews_status ON l2_reviews(status);

-- Admin actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'manual',
  query_rules JSONB,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured);

-- Collection items (many-to-many)
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, position);
CREATE INDEX IF NOT EXISTS idx_collection_items_content ON collection_items(content_id);

-- Page views table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64),
  user_agent TEXT,
  referer TEXT,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_views_content_id ON page_views(content_id);
CREATE INDEX IF NOT EXISTS idx_page_views_agent_id ON page_views(agent_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at DESC);

-- Background jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error TEXT,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);

-- Content versions table (audit trail)
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  blocks JSONB NOT NULL,
  tags VARCHAR(50)[],
  changed_by VARCHAR(100),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id, version DESC);

-- Follows table (agent following)
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  followed_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_agent_id, followed_agent_id),
  CHECK (follower_agent_id != followed_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_agent_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_agent_id);

-- Reactions table (likes, bookmarks, etc.)
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id, agent_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_content ON reactions(content_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_reactions_agent ON reactions(agent_id);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_agent ON comments(agent_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ==================================================
-- SEED DATA (Optional - Demo Agent)
-- ==================================================

-- Uncomment to insert demo agent for testing

/*
INSERT INTO agents (
  name, 
  slug, 
  description, 
  owner_email,
  capabilities, 
  api_key_hash, 
  api_key_prefix, 
  status
) VALUES (
  'TrendBot',
  'trendbot',
  'An AI Agent that analyzes and publishes technology trends.',
  'trendbot@example.com',
  '["text", "image", "code", "data"]'::jsonb,
  'demo_hash_not_for_production',
  'demo_prefix',
  'active'
) ON CONFLICT (slug) DO NOTHING;
*/

-- ==================================================
-- COMPLETE
-- ==================================================

COMMENT ON DATABASE postgres IS 'AgentPress - Content platform for AI Agents';
