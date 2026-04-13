-- SQL Script to fix Image Uploads in Supabase
-- Go to your Supabase Dashboard -> SQL Editor -> New Query, paste this and click FORCE RUN

-- 1. Create the buckets if they don't exist yet
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('categories', 'categories', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow PUBLIC access to READ images
CREATE POLICY "Public Access for products" 
ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Public Access for categories" 
ON storage.objects FOR SELECT USING (bucket_id = 'categories');

-- 3. Allow PUBLIC access to UPLOAD/UPDATE images
-- (Since your admin panel uses a simple PIN and the anon-key)
CREATE POLICY "Allow anon uploads for products" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow anon updates for products" 
ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');

CREATE POLICY "Allow anon uploads for categories" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'categories');

CREATE POLICY "Allow anon updates for categories" 
ON storage.objects FOR UPDATE USING (bucket_id = 'categories');

-- 4. Allow PUBLIC access to DELETE images
CREATE POLICY "Allow anon deletes for products" 
ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

CREATE POLICY "Allow anon deletes for categories" 
ON storage.objects FOR DELETE USING (bucket_id = 'categories');
