-- 保留每个 EIMS 用户在同一应用的一条绑定，允许多人共享外部账号。
BEGIN;
CREATE INDEX "oauth2_user_bindings_client_id_app_user_id_idx"
ON "public"."oauth2_user_bindings"("client_id", "app_user_id");
DROP INDEX "public"."oauth2_user_bindings_client_id_app_user_id_key";
COMMIT;
