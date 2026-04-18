-- ==============================================================================
-- СИСТЕМНЫЙ АРХИТЕКТУРНЫЙ ЩИТ (Supabase Row Level Security)
-- ==============================================================================
-- ВНИМАНИЕ: Выполните этот скрипт в разделе "SQL Editor" в вашем Supabase.
-- Этот скрипт закрывает базу данных от изменения клиентами (хакерами браузеров),
-- разрешая им только "читатать" (SELECT) каталог и настройки.
-- Изменять данные (INSERT/UPDATE) сможет только сервер (Service Role) или админ.
-- ==============================================================================

-- 1. Таблица Products (Каталог товаров)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);

-- 2. Таблица Site Settings (Настройки сайта)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
CREATE POLICY "Allow public read access to site_settings" ON public.site_settings FOR SELECT USING (true);

-- 3. Викторина: Категории
ALTER TABLE public.quiz_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to quiz_categories" ON public.quiz_categories;
CREATE POLICY "Allow public read access to quiz_categories" ON public.quiz_categories FOR SELECT USING (true);

-- 4. Викторина: Опции (Ответы)
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to quiz_options" ON public.quiz_options;
CREATE POLICY "Allow public read access to quiz_options" ON public.quiz_options FOR SELECT USING (true);

-- 5. Викторина: Синергия
ALTER TABLE public.quiz_synergies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to quiz_synergies" ON public.quiz_synergies;
CREATE POLICY "Allow public read access to quiz_synergies" ON public.quiz_synergies FOR SELECT USING (true);

-- 6. Синергия Товаров
ALTER TABLE public.product_synergies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to product_synergies" ON public.product_synergies;
CREATE POLICY "Allow public read access to product_synergies" ON public.product_synergies FOR SELECT USING (true);

-- Итог: Теперь база данных защищена от подмены цен и описаний прямо из браузера.
