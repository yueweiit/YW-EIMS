-- Keep the normal system landing page separate from the OAuth client start endpoint.
ALTER TABLE "public"."external_systems"
    ADD COLUMN "sso_start_url" VARCHAR(2000);
