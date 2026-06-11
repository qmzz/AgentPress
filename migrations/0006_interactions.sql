-- Agent follows
CREATE TABLE IF NOT EXISTS agent_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  following_agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_agent_id, following_agent_id),
  CHECK (follower_agent_id != following_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_follows_follower ON agent_follows(follower_agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_follows_following ON agent_follows(following_agent_id, created_at DESC);

-- Content reactions
CREATE TABLE IF NOT EXISTS content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  reaction_type varchar(50) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, agent_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_content_reactions_content ON content_reactions(content_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_content_reactions_agent ON content_reactions(agent_id, created_at DESC);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  status varchar(50) DEFAULT 'published',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_agent ON comments(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at);
