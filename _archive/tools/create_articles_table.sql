-- ==============================================================================
-- СОЗДАНИЕ ТАБЛИЦЫ СТАТЕЙ (JOURNAL ARTICLES)
-- ==============================================================================

-- 1. Создаем таблицу
CREATE TABLE IF NOT EXISTS public.journal_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title_ru TEXT NOT NULL,
    title_tj TEXT NOT NULL,
    excerpt_ru TEXT,
    excerpt_tj TEXT,
    content_ru TEXT NOT NULL,
    content_tj TEXT NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'Наука',
    author TEXT DEFAULT 'Green Leaf Sciences',
    read_time_min INTEGER DEFAULT 5,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Включаем защиту (RLS)
ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;

-- 3. Разрешаем всем читать опубликованные статьи
DROP POLICY IF EXISTS "Allow public read access to articles" ON public.journal_articles;
CREATE POLICY "Allow public read access to articles" ON public.journal_articles 
FOR SELECT USING (is_published = true);

-- 4. Добавляем комментарий
COMMENT ON TABLE public.journal_articles IS 'Статьи и научные публикации для блога Журнал';
