ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS webhook_url varchar(500);
