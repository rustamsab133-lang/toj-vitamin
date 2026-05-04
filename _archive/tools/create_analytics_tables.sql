
-- 1. Table for real-time user actions (Client + Server side)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    event_name TEXT NOT NULL,
    user_id TEXT, -- Optional: for logged in users
    session_id TEXT, -- For tracking sessions
    page_path TEXT,
    event_data JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    ip_address_hash TEXT -- Anonymized IP for location/deduplication
);

-- Index for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);

-- 2. Table for Marketing Agent snapshots (Daily stats from Meta/Google)
CREATE TABLE IF NOT EXISTS public.marketing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    meta_spend DECIMAL(10, 2) DEFAULT 0,
    meta_impressions INTEGER DEFAULT 0,
    meta_clicks INTEGER DEFAULT 0,
    ga4_users INTEGER DEFAULT 0,
    ga4_conversions INTEGER DEFAULT 0,
    total_whatsapp_leads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS (Security)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated and anon (service role will handle exports)
CREATE POLICY "Enable insert for all users" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for service role only" ON public.analytics_events FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON public.marketing_logs FOR ALL USING (auth.role() = 'service_role');
