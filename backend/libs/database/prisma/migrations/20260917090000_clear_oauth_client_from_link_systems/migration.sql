-- 普通入口不应继续关联 OAuth2 应用；保留 OAuth2 应用和账号绑定记录，便于后续重新配置。
UPDATE "public"."external_systems"
SET "oauth_client_id" = NULL,
    "update_time" = CURRENT_TIMESTAMP
WHERE "auth_mode" = 'link'
  AND "oauth_client_id" IS NOT NULL;
