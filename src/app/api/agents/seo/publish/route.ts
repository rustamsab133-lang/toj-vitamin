import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Google Indexing API ─────────────────────────────────────────────────────
async function pingGoogleIndexing(articleSlug: string): Promise<boolean> {
  try {
    const { google } = await import('googleapis');

    // Use JWT (Service Account) instead of OAuth2
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/indexing']
    });

    const indexing = google.indexing('v3');
    const url = `https://www.toj-vitamin.tj/journal/${articleSlug}`;

    await indexing.urlNotifications.publish({
      auth,
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    });

    console.log(`✅ Google Indexing pinged (Service Account): ${url}`);
    return true;
  } catch (err: any) {
    console.error('Indexing API error:', err.message);
    return false;
  }
}

// ─── POST: Publish a draft ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { articleId } = await req.json();

    if (!articleId) {
      return NextResponse.json({ error: 'articleId обязателен' }, { status: 400 });
    }

    // Mark as published
    const { data: article, error } = await supabase
      .from('journal_articles')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq('id', articleId)
      .select('slug, title_ru')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ping Google Indexing API
    const indexed = await pingGoogleIndexing(article.slug);

    return NextResponse.json({
      success: true,
      article: {
        slug: article.slug,
        title: article.title_ru,
      },
      indexed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: Remove a draft ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { articleId } = await req.json();

    if (!articleId) {
      return NextResponse.json({ error: 'articleId обязателен' }, { status: 400 });
    }

    const { error } = await supabase
      .from('journal_articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
