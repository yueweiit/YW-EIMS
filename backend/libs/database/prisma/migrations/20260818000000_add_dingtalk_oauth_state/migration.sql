CREATE TABLE "public"."dingtalk_oauth_states" (
    "id" SERIAL NOT NULL,
    "nonce" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dingtalk_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dingtalk_oauth_states_nonce_key" ON "public"."dingtalk_oauth_states"("nonce");
CREATE INDEX "dingtalk_oauth_states_expires_at_idx" ON "public"."dingtalk_oauth_states"("expires_at");
