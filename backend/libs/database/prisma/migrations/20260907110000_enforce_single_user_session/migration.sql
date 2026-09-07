-- Only one EIMS browser session remains valid for a user at a time.
-- Existing access tokens do not contain a session version and existing
-- refresh sessions are revoked so every user signs in again after deployment.
ALTER TABLE "public"."system_user"
    ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "public"."auth_refresh_sessions"
    ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 1;

UPDATE "public"."auth_refresh_sessions"
SET "revoked_at" = COALESCE("revoked_at", CURRENT_TIMESTAMP);
