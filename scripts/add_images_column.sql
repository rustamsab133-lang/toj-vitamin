-- Optional migration: Add 'images' array column to 'products' table in Supabase
-- If you wish to store image arrays directly in the database as well, run this in Supabase SQL Editor:

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[];

-- Comment
COMMENT ON COLUMN public.products.images IS 'Array of product image URLs in order: [front, back, nutritional_table, ...]';
