-- EIMS application refresh sessions
CREATE TABLE "public"."auth_refresh_sessions" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_refresh_sessions_token_hash_key"
    ON "public"."auth_refresh_sessions"("token_hash");
CREATE INDEX "auth_refresh_sessions_user_id_idx"
    ON "public"."auth_refresh_sessions"("user_id");
CREATE INDEX "auth_refresh_sessions_expires_at_idx"
    ON "public"."auth_refresh_sessions"("expires_at");

ALTER TABLE "public"."auth_refresh_sessions"
    ADD CONSTRAINT "auth_refresh_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."system_user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-side OAuth authorization transaction
CREATE TABLE "public"."oauth2_authorization_requests" (
    "id" SERIAL NOT NULL,
    "transaction_id" VARCHAR(128) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "redirect_uri" VARCHAR(2000) NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "state" VARCHAR(512) NOT NULL,
    "code_challenge" VARCHAR(128) NOT NULL,
    "code_challenge_method" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth2_authorization_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth2_authorization_requests_transaction_id_key"
    ON "public"."oauth2_authorization_requests"("transaction_id");
CREATE INDEX "oauth2_authorization_requests_client_id_idx"
    ON "public"."oauth2_authorization_requests"("client_id");
CREATE INDEX "oauth2_authorization_requests_expires_at_idx"
    ON "public"."oauth2_authorization_requests"("expires_at");

ALTER TABLE "public"."oauth2_authorization_requests"
    ADD CONSTRAINT "oauth2_authorization_requests_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "public"."oauth2_clients"("client_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
