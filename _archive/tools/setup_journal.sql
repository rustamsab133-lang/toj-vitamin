-- Создание таблицы для статей журнала
CREATE TABLE IF NOT EXISTS journal_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title_ru TEXT NOT NULL,
    excerpt_ru TEXT,
    content_ru TEXT NOT NULL,
    image_url TEXT,
    author_name TEXT DEFAULT 'Green Leaf Sciences',
    author_role TEXT DEFAULT 'Expert Team',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Индекс для быстрого поиска по slug
CREATE INDEX IF NOT EXISTS idx_journal_slug ON journal_articles(slug);

-- Вставка первой экспертной статьи о синергии
INSERT INTO journal_articles (
    slug, 
    title_ru, 
    excerpt_ru, 
    content_ru, 
    image_url, 
    is_published
) VALUES (
    'synergy-guide-2024',
    'Синергия нутрицевтиков: Полный гид по эффективным связкам 2024',
    'Почему некоторые витамины не работают без пары? Разбираем научные основы синергии на примере Омега-3, Магния и Витамина D3.',
    '<h2>Почему синергия важна?</h2><p>В мире нутрициологии 1+1 не всегда равно 2. Иногда это 5, а иногда 0. Синергия — это когда два вещества усиливают действие друг друга, позволяя организму усвоить максимум пользы.</p><h3>1. Омега-3 + Витамин D3</h3><p>Витамин D3 является жирорастворимым. Без качественных жиров (таких как Омега-3) его усвоение снижается на 40-60%. Эта связка — база для иммунитета и здоровья сосудов.</p><h3>2. Магний + Витамины группы B</h3><p>Магний — "минерал спокойствия", но для его проникновения внутрь клетки необходим витамин B6. Именно поэтому большинство качественных препаратов объединяют их в одну капсулу.</p><h3>3. Железо + Витамин С</h3><p>Витамин С восстанавливает железо до биодоступной формы, предотвращая его окисление в ЖКТ. Без этой пары борьба с анемией может длиться годами без результата.</p><p>В нашем маркетплейсе мы внедрили "One-Click Synergy", чтобы вы могли получать научно обоснованные связки одним нажатием.</p>',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=1200',
    true
) ON CONFLICT (slug) DO NOTHING;
