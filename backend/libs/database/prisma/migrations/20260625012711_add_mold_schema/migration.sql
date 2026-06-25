-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mold";

-- AlterTable
ALTER TABLE "system_user" RENAME CONSTRAINT "User_pkey" TO "system_user_pkey";

-- CreateTable
CREATE TABLE "mold"."phone_code_sequence" (
    "id" SERIAL NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "phone_code_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."phone_models" (
    "id" SERIAL NOT NULL,
    "phone_code" VARCHAR(20) NOT NULL,
    "phone_name" VARCHAR(200) NOT NULL,
    "phone_short_name" VARCHAR(200),

    CONSTRAINT "phone_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."colors" (
    "id" SERIAL NOT NULL,
    "color_code" VARCHAR(10) NOT NULL,
    "color_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."material" (
    "id" SERIAL NOT NULL,
    "material_code" VARCHAR(10) NOT NULL,
    "material_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."mold_codes" (
    "id" SERIAL NOT NULL,
    "mold_code" VARCHAR(30) NOT NULL,
    "mold_type" VARCHAR(100) NOT NULL,
    "mold_name" VARCHAR(200) NOT NULL,
    "mold_prefix" VARCHAR(20) NOT NULL,
    "material_name" VARCHAR(50) NOT NULL,
    "material_code" VARCHAR(10) NOT NULL,

    CONSTRAINT "mold_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."molds" (
    "id" SERIAL NOT NULL,
    "mold_type" VARCHAR(100) NOT NULL,
    "mold_name" VARCHAR(200) NOT NULL,
    "mold_code" VARCHAR(30) NOT NULL,
    "phone_name" VARCHAR(200) NOT NULL,
    "phone_code" VARCHAR(20) NOT NULL,
    "material_code" VARCHAR(10) NOT NULL,
    "material_name" VARCHAR(50) NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "molds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."product_codes" (
    "id" SERIAL NOT NULL,
    "product_code" VARCHAR(20) NOT NULL,
    "product_type" VARCHAR(100) NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,

    CONSTRAINT "product_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mold"."products" (
    "id" SERIAL NOT NULL,
    "product_type" VARCHAR(100) NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "product_code" VARCHAR(20) NOT NULL,
    "phone_name" VARCHAR(200) NOT NULL,
    "phone_code" VARCHAR(20) NOT NULL,
    "color_name" VARCHAR(100) NOT NULL,
    "color_code" VARCHAR(10) NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_models_phone_code_key" ON "mold"."phone_models"("phone_code");

-- CreateIndex
CREATE UNIQUE INDEX "phone_models_phone_name_key" ON "mold"."phone_models"("phone_name");

-- CreateIndex
CREATE INDEX "phone_models_phone_name_idx" ON "mold"."phone_models"("phone_name");

-- CreateIndex
CREATE UNIQUE INDEX "colors_color_code_key" ON "mold"."colors"("color_code");

-- CreateIndex
CREATE UNIQUE INDEX "material_material_code_key" ON "mold"."material"("material_code");

-- CreateIndex
CREATE UNIQUE INDEX "mold_codes_mold_code_key" ON "mold"."mold_codes"("mold_code");

-- CreateIndex
CREATE INDEX "mold_codes_mold_type_idx" ON "mold"."mold_codes"("mold_type");

-- CreateIndex
CREATE UNIQUE INDEX "molds_item_code_key" ON "mold"."molds"("item_code");

-- CreateIndex
CREATE INDEX "molds_mold_code_idx" ON "mold"."molds"("mold_code");

-- CreateIndex
CREATE INDEX "molds_phone_code_idx" ON "mold"."molds"("phone_code");

-- CreateIndex
CREATE UNIQUE INDEX "molds_mold_code_phone_code_key" ON "mold"."molds"("mold_code", "phone_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_codes_product_code_key" ON "mold"."product_codes"("product_code");

-- CreateIndex
CREATE INDEX "product_codes_product_type_idx" ON "mold"."product_codes"("product_type");

-- CreateIndex
CREATE UNIQUE INDEX "products_item_code_key" ON "mold"."products"("item_code");

-- CreateIndex
CREATE INDEX "products_product_code_idx" ON "mold"."products"("product_code");

-- CreateIndex
CREATE INDEX "products_phone_code_idx" ON "mold"."products"("phone_code");

-- CreateIndex
CREATE INDEX "products_color_code_idx" ON "mold"."products"("color_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_phone_code_color_code_key" ON "mold"."products"("product_code", "phone_code", "color_code");
