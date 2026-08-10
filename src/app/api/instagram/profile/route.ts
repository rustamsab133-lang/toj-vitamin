import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function fetchInstagramProfile(accountId: string, accessToken: string) {
  const url = `https://graph.facebook.com/v19.0/${accountId}?fields=username,name,profile_picture_url&access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Неизвестная ошибка Meta API');
  }
  return {
    username: data.username as string,
    name: data.name as string,
    profilePictureUrl: data.profile_picture_url as string,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. Загружаем настройки из Supabase site_settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['instagram_business_account_id', 'instagram_access_token']);

    const instagramAccountId = settings?.find(s => s.key === 'instagram_business_account_id')?.value;
    const instagramAccessToken = settings?.find(s => s.key === 'instagram_access_token')?.value;

    if (!instagramAccountId || !instagramAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Настройки интеграции не найдены в базе данных.'
      }, { status: 200 });
    }

    const profile = await fetchInstagramProfile(instagramAccountId, instagramAccessToken);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Instagram profile GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Ошибка соединения с Meta API' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instagramAccountId, instagramAccessToken } = body as {
      instagramAccountId: string;
      instagramAccessToken: string;
    };

    if (!instagramAccountId || !instagramAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Пожалуйста, укажите ID аккаунта и токен доступа.'
      }, { status: 400 });
    }

    const profile = await fetchInstagramProfile(instagramAccountId, instagramAccessToken);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Instagram profile POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Не удалось получить данные аккаунта из Meta API.' });
  }
}
