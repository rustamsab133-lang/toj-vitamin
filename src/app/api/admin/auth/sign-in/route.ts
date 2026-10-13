import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

function getAllowedEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

export async function POST(request: Request) {
  const allowedEmails = getAllowedEmails();
  if (!allowedEmails.size) return json({ error: 'Администратор не настроен.' }, 503);

  const supabase = createSupabaseClient();
  if (!supabase) return json({ error: 'Supabase не настроен.' }, 503);

  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return json({ error: 'Укажите email и пароль.' }, 400);
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return json({ error: 'Неверный email или пароль.' }, 401);

    const { data, error: claimsError } = await supabase.auth.getClaims();
    const signedInEmail = String(data?.claims?.email || '').toLowerCase();
    if (claimsError || !allowedEmails.has(signedInEmail)) {
      await supabase.auth.signOut();
      return json({ error: 'У этой учётной записи нет доступа.' }, 403);
    }

    return json({ success: true });
  } catch {
    return json({ error: 'Не удалось выполнить вход.' }, 400);
  }
}

export async function DELETE() {
  const supabase = createSupabaseClient();
  if (!supabase) return json({ error: 'Supabase не настроен.' }, 503);
  await supabase.auth.signOut();
  return json({ success: true });
}
