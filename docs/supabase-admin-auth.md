# Supabase admin authentication setup

The admin sign-in uses Supabase Auth. Access is limited server-side by the `ADMIN_EMAILS` allowlist.

## Supabase Dashboard

1. Open the Supabase project configured for this app and go to **Authentication → Users**.
2. Create an admin user with email and password. Keep public sign-ups disabled unless another app flow requires them.
3. Verify the email before signing in.

## Vercel environment variables

Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured for the same Supabase project. The publishable key can be used instead of the legacy anon key.

Add a server-only variable:

```text
ADMIN_EMAILS=<admin email>[,<another admin email>]
```

Use the exact email on each Supabase Auth user. Do not prefix this variable with `NEXT_PUBLIC_`. Redeploy after saving the variables.

The Service Role key is not used for sign-in. Store it only as a server-side secret if the app needs privileged database operations; never expose it in browser code or tracked files.

## Protected routes

- `/admin/login` is public.
- `/admin/*` and `/api/admin/*` require a valid Supabase session and an email listed in `ADMIN_EMAILS`.
- The old shared password is no longer stored in browser storage.
