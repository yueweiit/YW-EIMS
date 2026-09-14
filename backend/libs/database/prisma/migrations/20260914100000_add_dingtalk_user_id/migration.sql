-- Store the DingTalk userId separately from the unionId login subject.
ALTER TABLE "public"."system_user"
    ADD COLUMN "ding_talk_user_id" VARCHAR(200);

CREATE UNIQUE INDEX "system_user_ding_talk_user_id_key"
    ON "public"."system_user"("ding_talk_user_id");
