/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
CREATE TABLE IF NOT EXISTS agent_api_keys (
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

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_agent_status
  ON agent_api_keys(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_prefix
  ON agent_api_keys(key_prefix);

INSERT INTO agent_api_keys (agent_id, name, key_hash, key_prefix, status, created_at)
SELECT id, 'Default key', api_key_hash, api_key_prefix, 'active', created_at
FROM agents
WHERE api_key_hash IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;
