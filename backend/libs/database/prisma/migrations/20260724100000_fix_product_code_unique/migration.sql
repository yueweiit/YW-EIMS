-- Drop the old unique constraint on product_code alone
ALTER TABLE mold.product_codes DROP CONSTRAINT IF EXISTS product_codes_product_code_key;

-- Add composite unique: same product_code can have multiple colors
ALTER TABLE mold.product_codes ADD CONSTRAINT product_codes_product_code_color_code_key UNIQUE (product_code, color_code);
