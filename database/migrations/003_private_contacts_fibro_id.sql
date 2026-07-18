BEGIN;
CREATE TABLE IF NOT EXISTS contacts (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS contacts_user_idx ON contacts ((document->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS contacts_pair_unique ON contacts ((document->>'userId'), (document->>'contactUserId'));
CREATE UNIQUE INDEX IF NOT EXISTS users_fibro_id_unique ON users (upper(document->>'fibroId')) WHERE document ? 'fibroId';
INSERT INTO schema_migrations(version) VALUES ('003_private_contacts_fibro_id') ON CONFLICT DO NOTHING;
COMMIT;
