BEGIN;
CREATE TABLE IF NOT EXISTS groups (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS groups_owner_idx ON groups ((document->>'ownerId'));
CREATE TABLE IF NOT EXISTS group_messages (id text PRIMARY KEY, document jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS group_messages_group_idx ON group_messages ((document->>'groupId'));
INSERT INTO collection_versions(collection,version,updated_at) VALUES('groups',0,now()) ON CONFLICT(collection) DO NOTHING;
INSERT INTO collection_versions(collection,version,updated_at) VALUES('groupMessages',0,now()) ON CONFLICT(collection) DO NOTHING;
INSERT INTO schema_migrations(version) VALUES ('007_groups') ON CONFLICT DO NOTHING;
COMMIT;
