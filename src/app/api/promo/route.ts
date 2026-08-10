import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const codeUpper = code.trim().toUpperCase();

    if (action === 'verify') {
      const { data, error } = await supabaseAdmin
        .from('promocodes')
        .select('*')
        .eq('code', codeUpper)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return NextResponse.json({ found: false });
      }

      return NextResponse.json({ found: true, promocode: data });

    } else if (action === 'increment') {
      // Fetch the current usage count first
      const { data: promo, error: getError } = await supabaseAdmin
        .from('promocodes')
        .select('usage_count')
        .eq('code', codeUpper)
        .maybeSingle();

      if (getError) throw getError;
      if (!promo) {
        return NextResponse.json({ error: 'Promocode not found' }, { status: 404 });
      }

      const newCount = (promo.usage_count || 0) + 1;
      const { error: updateError } = await supabaseAdmin
        .from('promocodes')
        .update({ usage_count: newCount })
        .eq('code', codeUpper);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, new_count: newCount });
    } else if (action === 'get_by_blogger') {
      const { username } = body;
      if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
      }

      // Fetch blogger profiles to find the matching promocode
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'blogger_profiles')
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settings?.value) {
        try {
          const profiles = JSON.parse(settings.value);
          const blogger = profiles.find((p: any) => p.username.toLowerCase().trim() === username.toLowerCase().trim());
          
          if (blogger && blogger.promocode) {
            // Fetch actual promocode data from promocodes table
            const { data: promo, error: promoError } = await supabaseAdmin
              .from('promocodes')
              .select('*')
              .eq('code', blogger.promocode.toUpperCase().trim())
              .eq('is_active', true)
              .maybeSingle();

            if (promoError) throw promoError;

            if (promo) {
              return NextResponse.json({ found: true, promocode: promo });
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse blogger profiles:', parseErr);
        }
      }

      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Promo API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error occurred' },
      { status: 500 }
    );
  }
}
