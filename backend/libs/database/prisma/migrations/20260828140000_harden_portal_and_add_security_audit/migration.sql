-- Harden external-system access semantics. Empty allowed_roles no longer means allow all.
ALTER TABLE "public"."external_systems"
    ADD COLUMN "access_mode" VARCHAR(20) NOT NULL DEFAULT 'roles';

-- OIDC nonce is bound to the authorization transaction and resulting code.
ALTER TABLE "public"."oauth2_authorization_requests"
    ADD COLUMN "nonce" VARCHAR(255);

ALTER TABLE "public"."oauth2_authorization_codes"
    ADD COLUMN "nonce" VARCHAR(255);

CREATE TABLE "public"."security_audit_logs" (
    "id" SERIAL NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "result" VARCHAR(20) NOT NULL DEFAULT 'success',
    "user_id" INTEGER,
    "user_name" VARCHAR(100),
    "client_id" VARCHAR(128),
    "system_code" VARCHAR(50),
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_audit_logs_event_created_at_idx"
    ON "public"."security_audit_logs"("event", "created_at");
CREATE INDEX "security_audit_logs_user_id_created_at_idx"
    ON "public"."security_audit_logs"("user_id", "created_at");
CREATE INDEX "security_audit_logs_client_id_created_at_idx"
    ON "public"."security_audit_logs"("client_id", "created_at");
