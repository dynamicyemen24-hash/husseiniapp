-- ================================================================
-- Elias Pro — node token encryption column
-- ---------------------------------------------------------------
-- The platform must be able to call a registered EliasPro node later
-- (health probes, engine runs, work-order sync), so the shared bearer
-- token has to be recoverable — a plain SHA-256 hash is not enough.
--
-- The token is stored ENCRYPTED at rest (AES-256-GCM, server master key)
-- in `tokenEnc`, alongside the existing `tokenHash` fingerprint which is
-- used for rotation detection. The plaintext never leaves the server.
-- ================================================================

ALTER TABLE "elias_pro_nodes" ADD COLUMN IF NOT EXISTS "tokenEnc" text;
