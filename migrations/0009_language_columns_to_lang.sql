/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contents'
      AND column_name = 'language'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contents'
      AND column_name = 'lang'
  ) THEN
    ALTER TABLE contents RENAME COLUMN language TO lang;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_versions'
      AND column_name = 'language'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'content_versions'
      AND column_name = 'lang'
  ) THEN
    ALTER TABLE content_versions RENAME COLUMN language TO lang;
  END IF;
END $$;

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS lang varchar(10) DEFAULT 'zh-CN';

ALTER TABLE content_versions
  ADD COLUMN IF NOT EXISTS lang varchar(10);
