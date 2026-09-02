-- New OAuth clients require PKCE by default. Existing clients were created
-- before the provider enforced PKCE and remain compatible with their
-- server-side client_secret flow until they are explicitly upgraded.
ALTER TABLE "public"."oauth2_clients"
    ADD COLUMN "pkce_required" BOOLEAN;

UPDATE "public"."oauth2_clients"
SET "pkce_required" = false
WHERE "pkce_required" IS NULL;

ALTER TABLE "public"."oauth2_clients"
    ALTER COLUMN "pkce_required" SET DEFAULT true,
    ALTER COLUMN "pkce_required" SET NOT NULL;

-- The authorization transaction must also be able to store a legacy request
-- that has no PKCE values. PKCE values are still persisted and verified when
-- the client sends them.
ALTER TABLE "public"."oauth2_authorization_requests"
    ALTER COLUMN "code_challenge" DROP NOT NULL,
    ALTER COLUMN "code_challenge_method" DROP NOT NULL;
