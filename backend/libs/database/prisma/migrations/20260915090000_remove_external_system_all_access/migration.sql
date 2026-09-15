-- External systems now use explicit EIMS role authorization only.
-- Legacy all-open records are converted to deny-by-default before the mode column is removed.
UPDATE "public"."external_systems"
SET "allowed_roles" = ARRAY[]::TEXT[]
WHERE "access_mode" = 'all';

ALTER TABLE "public"."external_systems"
    DROP COLUMN "access_mode";
