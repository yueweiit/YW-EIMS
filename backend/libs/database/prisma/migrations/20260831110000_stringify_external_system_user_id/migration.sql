-- Preserve existing numeric IDs while allowing opaque external account identifiers.
ALTER TABLE "public"."oauth2_user_bindings"
ALTER COLUMN "app_user_id" TYPE VARCHAR(255)
USING "app_user_id"::text;
