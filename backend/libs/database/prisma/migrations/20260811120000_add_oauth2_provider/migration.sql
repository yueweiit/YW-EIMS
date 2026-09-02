-- CreateTable
CREATE TABLE "public"."oauth2_clients" (
    "id" SERIAL NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "client_secret" VARCHAR(256) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "redirect_uris" TEXT[] NOT NULL DEFAULT '{}',
    "scopes" TEXT[] NOT NULL DEFAULT '{openid,profile,email}',
    "status" TEXT NOT NULL DEFAULT '1',
    "create_by" VARCHAR(50),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth2_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth2_authorization_codes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(256) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "redirect_uri" VARCHAR(2000) NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "code_challenge" VARCHAR(256),
    "code_challenge_method" VARCHAR(10),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth2_authorization_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth2_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(256) NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth2_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_clients_client_id_key" ON "public"."oauth2_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_authorization_codes_code_key" ON "public"."oauth2_authorization_codes"("code");

-- CreateIndex
CREATE INDEX "oauth2_authorization_codes_client_id_idx" ON "public"."oauth2_authorization_codes"("client_id");

-- CreateIndex
CREATE INDEX "oauth2_authorization_codes_user_id_idx" ON "public"."oauth2_authorization_codes"("user_id");

-- CreateIndex
CREATE INDEX "oauth2_authorization_codes_expires_at_idx" ON "public"."oauth2_authorization_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_refresh_tokens_token_hash_key" ON "public"."oauth2_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "oauth2_refresh_tokens_client_id_idx" ON "public"."oauth2_refresh_tokens"("client_id");

-- CreateIndex
CREATE INDEX "oauth2_refresh_tokens_user_id_idx" ON "public"."oauth2_refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "oauth2_refresh_tokens_expires_at_idx" ON "public"."oauth2_refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "public"."oauth2_authorization_codes" ADD CONSTRAINT "oauth2_authorization_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth2_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oauth2_authorization_codes" ADD CONSTRAINT "oauth2_authorization_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oauth2_refresh_tokens" ADD CONSTRAINT "oauth2_refresh_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth2_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oauth2_refresh_tokens" ADD CONSTRAINT "oauth2_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
