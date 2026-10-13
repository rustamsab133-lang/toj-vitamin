import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return NextResponse.json({ error: 'Supabase не настроен.' }, { status: 503 });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/admin/login';
  const isSignInEndpoint = pathname === '/api/admin/auth/sign-in';
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname === '/api/admin' || pathname.startsWith('/api/admin/');

  if ((!isAdminRoute && !isAdminApi) || isLoginPage || isSignInEndpoint) return response;

  const claims = data?.claims;
  const email = String(claims?.email || '').toLowerCase();
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  const preserveAuthState = (target: NextResponse) => {
    response.cookies.getAll().forEach(({ name, value, ...options }) => target.cookies.set(name, value, options));
    response.headers.forEach((value, name) => target.headers.set(name, value));
    return target;
  };

  if (!claims) {
    if (isAdminApi) return preserveAuthState(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    return preserveAuthState(NextResponse.redirect(loginUrl));
  }

  if (!allowedEmails.has(email)) {
    if (isAdminApi) return preserveAuthState(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    return preserveAuthState(new NextResponse('Доступ запрещён.', { status: 403 }));
  }

  return response;
}
