-- Bind EIMS access JWTs to a revocable server-side session.
ALTER TABLE "public"."auth_refresh_sessions"
    ADD COLUMN "access_token_hash" VARCHAR(64),
    ADD COLUMN "family_id" VARCHAR(64);

CREATE UNIQUE INDEX "auth_refresh_sessions_access_token_hash_key"
    ON "public"."auth_refresh_sessions"("access_token_hash");
CREATE INDEX "auth_refresh_sessions_family_id_idx"
    ON "public"."auth_refresh_sessions"("family_id");

-- Existing browser sessions have no recoverable access-token hash. They will
-- require a fresh login after this migration, while their refresh records can
-- still be rotated once by the new code.

-- OAuth2 access tokens are stored by hash so RFC 7009 revocation also covers
-- access tokens, without persisting bearer credentials in plaintext.
CREATE TABLE "public"."oauth2_access_tokens" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "family_id" VARCHAR(64),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth2_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth2_access_tokens_token_hash_key"
    ON "public"."oauth2_access_tokens"("token_hash");
CREATE INDEX "oauth2_access_tokens_client_id_idx"
    ON "public"."oauth2_access_tokens"("client_id");
CREATE INDEX "oauth2_access_tokens_user_id_idx"
    ON "public"."oauth2_access_tokens"("user_id");
CREATE INDEX "oauth2_access_tokens_expires_at_idx"
    ON "public"."oauth2_access_tokens"("expires_at");
CREATE INDEX "oauth2_access_tokens_family_id_idx"
    ON "public"."oauth2_access_tokens"("family_id");

ALTER TABLE "public"."oauth2_access_tokens"
    ADD CONSTRAINT "oauth2_access_tokens_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "public"."oauth2_clients"("client_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."oauth2_access_tokens"
    ADD CONSTRAINT "oauth2_access_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."system_user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Refresh-token rotation family. Existing rows remain compatible and are
-- treated as a legacy family until they are rotated.
ALTER TABLE "public"."oauth2_refresh_tokens"
    ADD COLUMN "family_id" VARCHAR(64);
CREATE INDEX "oauth2_refresh_tokens_family_id_idx"
    ON "public"."oauth2_refresh_tokens"("family_id");

-- Authorization transactions are bound to a browser-only nonce cookie. Old
-- pending transactions cannot be resumed because their original nonce was
-- never stored; the fixed value deliberately makes those rows unusable.
ALTER TABLE "public"."oauth2_authorization_requests"
    ADD COLUMN "browser_nonce_hash" VARCHAR(64);
UPDATE "public"."oauth2_authorization_requests"
SET "browser_nonce_hash" = repeat('0', 64)
WHERE "browser_nonce_hash" IS NULL;
ALTER TABLE "public"."oauth2_authorization_requests"
    ALTER COLUMN "browser_nonce_hash" SET NOT NULL;

-- Shared database-backed rate limiting for multiple backend instances.
CREATE TABLE "public"."security_rate_limit_buckets" (
    "bucket_key" VARCHAR(512) NOT NULL,
    "request_count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key")
);

CREATE INDEX "security_rate_limit_buckets_reset_at_idx"
    ON "public"."security_rate_limit_buckets"("reset_at");
