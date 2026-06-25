-- ProductCode: add color fields
ALTER TABLE "mold"."product_codes" ADD COLUMN "color_name" varchar(100) NOT NULL DEFAULT '';
ALTER TABLE "mold"."product_codes" ADD COLUMN "color_code" varchar(10) NOT NULL DEFAULT '';

-- Product: rename phone_name to phone_short_name
ALTER TABLE "mold"."products" RENAME COLUMN "phone_name" TO "phone_short_name";
