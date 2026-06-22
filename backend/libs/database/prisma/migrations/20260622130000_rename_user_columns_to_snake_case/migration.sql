-- RenameColumns: system_user table columns from camelCase to snake_case
-- This migration uses ALTER TABLE RENAME COLUMN to preserve data

ALTER TABLE "system_user" RENAME COLUMN "userName" TO "user_name";
ALTER TABLE "system_user" RENAME COLUMN "realName" TO "real_name";
ALTER TABLE "system_user" RENAME COLUMN "createBy" TO "create_by";
ALTER TABLE "system_user" RENAME COLUMN "createTime" TO "create_time";
ALTER TABLE "system_user" RENAME COLUMN "updateBy" TO "update_by";
ALTER TABLE "system_user" RENAME COLUMN "updateTime" TO "update_time";

-- Rename the unique index to match the new column name
ALTER INDEX "system_user_userName_key" RENAME TO "system_user_user_name_key";
