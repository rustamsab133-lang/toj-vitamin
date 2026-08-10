-- 1. Добавляем UTM-колонки в таблицу orders, если их там еще нет
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign text;

-- 2. Создаем таблицу профилей блогеров
CREATE TABLE IF NOT EXISTS public.blogger_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    username text NOT NULL UNIQUE,
    promocode_code text,
    fixed_fee numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Создаем таблицу для сгенерированных ссылок
CREATE TABLE IF NOT EXISTS public.blogger_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blogger_username text NOT NULL,
    url text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Настраиваем права доступа (RLS - Row Level Security)
ALTER TABLE public.blogger_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogger_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL for blogger_profiles" ON public.blogger_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL for blogger_links" ON public.blogger_links FOR ALL USING (true) WITH CHECK (true);

-- Создаем индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON public.orders(utm_source);
CREATE INDEX IF NOT EXISTS idx_blogger_links_username ON public.blogger_links(blogger_username);
