BEGIN;
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id text PRIMARY KEY,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique
  ON push_subscriptions ((document->>'endpoint'));
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions ((document->>'userId'));
INSERT INTO schema_migrations(version) VALUES ('002_web_push') ON CONFLICT DO NOTHING;
COMMIT;
