-- CreateTable
CREATE TABLE "public"."oauth2_user_bindings" (
    "id" SERIAL NOT NULL,
    "sso_user_id" INTEGER NOT NULL,
    "client_id" VARCHAR(128) NOT NULL,
    "app_user_id" INTEGER NOT NULL,
    "app_username" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth2_user_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_user_bindings_sso_user_id_client_id_key" ON "public"."oauth2_user_bindings"("sso_user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth2_user_bindings_client_id_app_user_id_key" ON "public"."oauth2_user_bindings"("client_id", "app_user_id");

-- CreateIndex
CREATE INDEX "oauth2_user_bindings_sso_user_id_idx" ON "public"."oauth2_user_bindings"("sso_user_id");

-- CreateIndex
CREATE INDEX "oauth2_user_bindings_client_id_idx" ON "public"."oauth2_user_bindings"("client_id");

-- AddForeignKey
ALTER TABLE "public"."oauth2_user_bindings" ADD CONSTRAINT "oauth2_user_bindings_sso_user_id_fkey" FOREIGN KEY ("sso_user_id") REFERENCES "public"."system_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oauth2_user_bindings" ADD CONSTRAINT "oauth2_user_bindings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."oauth2_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
