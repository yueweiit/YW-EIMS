-- EIMS only maps the target account. Target-system roles are managed by the
-- target system itself and are not administered or returned by EIMS.
ALTER TABLE "public"."oauth2_user_bindings"
DROP COLUMN "app_roles";
