-- The original DeepLinkERP portal row used the ERP homepage as its OAuth
-- launch URL. The homepage does not start the EIMS flow, while this server
-- endpoint creates the ERP state and redirects to EIMS.
UPDATE "public"."external_systems"
SET "sso_start_url" = regexp_replace("entry_url", '/+$', '') ||
    '/api/method/custom_filters.overrides.oauth.login_via_eims'
WHERE "code" = 'erp'
  AND "auth_mode" = 'oauth2'
  AND (
    "sso_start_url" IS NULL
    OR btrim("sso_start_url") = ''
    OR "sso_start_url" = "entry_url"
  );
