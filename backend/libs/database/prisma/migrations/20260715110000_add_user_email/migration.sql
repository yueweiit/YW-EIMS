ALTER TABLE "public"."system_user"
ADD COLUMN "email" VARCHAR(200);

CREATE UNIQUE INDEX "system_user_email_key"
ON "public"."system_user"("email");
