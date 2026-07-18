-- FibroChat v0.5.2 profile/privacy data is stored inside users.document JSONB.
-- This migration adds indexes useful for Fibro ID and profile reads.
CREATE INDEX IF NOT EXISTS idx_users_document_fibro_id ON users ((upper(document->>'fibroId')));
CREATE INDEX IF NOT EXISTS idx_users_document_display_name ON users ((document->>'displayName'));
