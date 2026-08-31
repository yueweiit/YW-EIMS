-- Add target-application roles to SSO account bindings.
ALTER TABLE "public"."oauth2_user_bindings"
    ADD COLUMN "app_roles" TEXT[] NOT NULL DEFAULT '{}';

-- EIMS portal system catalog.
CREATE TABLE "public"."external_systems" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon" VARCHAR(100) NOT NULL DEFAULT 'mdi:application-outline',
    "color" VARCHAR(20) NOT NULL DEFAULT '#2080f0',
    "entry_url" VARCHAR(2000) NOT NULL,
    "auth_mode" VARCHAR(20) NOT NULL DEFAULT 'link',
    "allowed_roles" TEXT[] NOT NULL DEFAULT '{}',
    "category" VARCHAR(50) NOT NULL DEFAULT '业务系统',
    "help_url" VARCHAR(2000),
    "feedback_url" VARCHAR(2000),
    "contact" VARCHAR(200),
    "oauth_client_id" VARCHAR(128),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT '1',
    "create_by" VARCHAR(50),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_systems_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_systems_code_key"
    ON "public"."external_systems"("code");
CREATE UNIQUE INDEX "external_systems_oauth_client_id_key"
    ON "public"."external_systems"("oauth_client_id");
CREATE INDEX "external_systems_status_idx"
    ON "public"."external_systems"("status");
CREATE INDEX "external_systems_sort_idx"
    ON "public"."external_systems"("sort");

ALTER TABLE "public"."external_systems"
    ADD CONSTRAINT "external_systems_oauth_client_id_fkey"
    FOREIGN KEY ("oauth_client_id") REFERENCES "public"."oauth2_clients"("client_id")
    ON DELETE SET NULL ON UPDATE CASCADE;
