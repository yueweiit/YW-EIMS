-- DeepLinkERP uses the same role-based portal access policy as the other
-- preset business systems. Clear any stale role list so access must be
-- explicitly granted from Role Management.
UPDATE "public"."external_systems"
SET "access_mode" = 'roles',
    "allowed_roles" = ARRAY[]::TEXT[]
WHERE "code" = 'erp'
  AND "access_mode" = 'all';
