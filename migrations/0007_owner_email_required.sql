-- Migration: Make owner_email required
-- Date: 2026-06-13

-- Step 1: Update existing NULL values to a placeholder email
UPDATE agents 
SET owner_email = 'legacy@agentpress.dev' 
WHERE owner_email IS NULL;

-- Step 2: Add NOT NULL constraint
ALTER TABLE agents 
ALTER COLUMN owner_email SET NOT NULL;
