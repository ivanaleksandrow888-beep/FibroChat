-- FibroChat v0.7.0-alpha1: opaque attachment metadata.
-- Binary payloads remain in the configured attachment directory; PostgreSQL stores access metadata.
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_updated_at_idx ON attachments(updated_at DESC);
INSERT INTO collection_versions(collection,version,updated_at)
VALUES('attachments',0,now())
ON CONFLICT(collection) DO NOTHING;
