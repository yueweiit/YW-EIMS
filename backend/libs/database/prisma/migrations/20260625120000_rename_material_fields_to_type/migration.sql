-- RenameMaterialFieldsToType

-- MoldMaterial table (already renamed to "type")
ALTER TABLE "mold"."type" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."type" RENAME COLUMN "material_name" TO "type_name";

-- MoldCode table
ALTER TABLE "mold"."mold_codes" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."mold_codes" RENAME COLUMN "material_name" TO "type_name";

-- Mold table
ALTER TABLE "mold"."molds" RENAME COLUMN "material_code" TO "type_code";
ALTER TABLE "mold"."molds" RENAME COLUMN "material_name" TO "type_name";
