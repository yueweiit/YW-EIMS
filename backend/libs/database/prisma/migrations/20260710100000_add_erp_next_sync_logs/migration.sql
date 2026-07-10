CREATE TABLE "oa"."erp_next_sync_logs" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_code" VARCHAR(100) NOT NULL,
    "entity_name" VARCHAR(200),
    "item_group" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "request_payload" JSONB,
    "response_data" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_tried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_next_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "erp_next_sync_logs_entity_type_idx" ON "oa"."erp_next_sync_logs"("entity_type");
CREATE INDEX "erp_next_sync_logs_status_idx" ON "oa"."erp_next_sync_logs"("status");
CREATE INDEX "erp_next_sync_logs_entity_code_idx" ON "oa"."erp_next_sync_logs"("entity_code");
