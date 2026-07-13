BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_versions (
  collection text PRIMARY KEY,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_unique ON users (lower(document->>'nickname'));
CREATE UNIQUE INDEX IF NOT EXISTS users_single_super_admin ON users ((document->>'role')) WHERE document->>'role' = 'super_admin';
CREATE INDEX IF NOT EXISTS users_status_idx ON users ((document->>'status'));
CREATE INDEX IF NOT EXISTS users_role_idx ON users ((document->>'role'));

CREATE TABLE IF NOT EXISTS invites (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS invites_code_unique ON invites ((document->>'code'));
CREATE TABLE IF NOT EXISTS messages (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages ((document->>'senderId'));
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages ((document->>'recipientId'));
CREATE TABLE IF NOT EXISTS audit_log (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS support_tickets (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS devices (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS devices_user_idx ON devices ((document->>'userId'));
CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions ((document->>'userId'));
CREATE TABLE IF NOT EXISTS device_approvals (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS device_approvals_token_idx ON device_approvals ((document->>'tokenHash'));
CREATE TABLE IF NOT EXISTS network_config (key text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS cluster_nodes (
  node_id text PRIMARY KEY,
  region text NOT NULL,
  public_url text,
  status text NOT NULL DEFAULT 'online',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO schema_migrations(version) VALUES ('001_initial') ON CONFLICT DO NOTHING;
COMMIT;
