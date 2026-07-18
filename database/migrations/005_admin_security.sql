-- FibroChat v0.6.0 stores administration/security fields inside user and audit JSONB documents.
-- Existing generic document tables require no destructive schema changes.
CREATE INDEX IF NOT EXISTS audit_log_updated_at_idx ON audit_log(updated_at DESC);
CREATE INDEX IF NOT EXISTS sessions_updated_at_idx ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS invites_updated_at_idx ON invites(updated_at DESC);
