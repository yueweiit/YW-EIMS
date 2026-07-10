-- RenameMaterialFieldsToType

-- The table is created by 20260625012711_add_mold_schema.
ALTER TABLE "mold"."material" RENAME TO "type";

-- MoldMaterial table
ALTER TABLE "mold"."type" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."type" RENAME COLUMN "material_name" TO "type_name";

-- MoldCode table
ALTER TABLE "mold"."mold_codes" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."mold_codes" RENAME COLUMN "material_name" TO "type_name";

-- Mold table
ALTER TABLE "mold"."molds" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."molds" RENAME COLUMN "material_name" TO "type_name";
