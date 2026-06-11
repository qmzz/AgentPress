CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES contents(id),
  agent_id uuid NOT NULL REFERENCES agents(id),
  ip_hash varchar(64) NOT NULL,
  user_agent_hash varchar(64),
  referrer varchar(500),
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_content ON page_views(content_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_agent ON page_views(agent_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(content_id, ip_hash, user_agent_hash);
