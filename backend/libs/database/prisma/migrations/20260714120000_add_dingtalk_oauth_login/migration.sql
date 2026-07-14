ALTER TABLE "public"."system_user"
ADD COLUMN "ding_talk_subject" VARCHAR(200);

CREATE UNIQUE INDEX "system_user_ding_talk_subject_key"
ON "public"."system_user"("ding_talk_subject");

CREATE TABLE "public"."auth_login_tickets" (
    "id" SERIAL NOT NULL,
    "ticket_hash" VARCHAR(128) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_login_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_login_tickets_ticket_hash_key"
ON "public"."auth_login_tickets"("ticket_hash");

CREATE INDEX "auth_login_tickets_expires_at_idx"
ON "public"."auth_login_tickets"("expires_at");

ALTER TABLE "public"."auth_login_tickets"
ADD CONSTRAINT "auth_login_tickets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."system_user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
