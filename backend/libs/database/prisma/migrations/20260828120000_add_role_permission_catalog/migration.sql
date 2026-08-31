-- EIMS role and menu/function permission catalog.
CREATE TABLE "public"."system_roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "built_in" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT '1',
    "create_by" VARCHAR(50),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_roles_code_key"
    ON "public"."system_roles"("code");
CREATE INDEX "system_roles_status_idx"
    ON "public"."system_roles"("status");
CREATE INDEX "system_roles_sort_idx"
    ON "public"."system_roles"("sort");

CREATE TABLE "public"."system_permissions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'menu',
    "system_code" VARCHAR(50),
    "parent_code" VARCHAR(100),
    "route_path" VARCHAR(500),
    "description" VARCHAR(500),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(1) NOT NULL DEFAULT '1',
    "create_by" VARCHAR(50),
    "create_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_by" VARCHAR(50),
    "update_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_permissions_code_key"
    ON "public"."system_permissions"("code");
CREATE INDEX "system_permissions_system_code_idx"
    ON "public"."system_permissions"("system_code");
CREATE INDEX "system_permissions_type_idx"
    ON "public"."system_permissions"("type");
CREATE INDEX "system_permissions_status_idx"
    ON "public"."system_permissions"("status");
CREATE INDEX "system_permissions_sort_idx"
    ON "public"."system_permissions"("sort");

CREATE TABLE "public"."system_role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "system_role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE INDEX "system_role_permissions_permission_id_idx"
    ON "public"."system_role_permissions"("permission_id");

ALTER TABLE "public"."system_permissions"
    ADD CONSTRAINT "system_permissions_system_code_fkey"
    FOREIGN KEY ("system_code") REFERENCES "public"."external_systems"("code")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."system_role_permissions"
    ADD CONSTRAINT "system_role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "public"."system_roles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."system_role_permissions"
    ADD CONSTRAINT "system_role_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "public"."system_permissions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve any role codes already assigned to users before the catalog existed.
INSERT INTO "public"."system_roles" ("code", "name", "create_by")
SELECT DISTINCT BTRIM(role_code), BTRIM(role_code), 'migration'
FROM "public"."system_user" AS users
CROSS JOIN LATERAL unnest(users."roles") AS role_values(role_code)
WHERE BTRIM(role_code) <> ''
ON CONFLICT ("code") DO NOTHING;
