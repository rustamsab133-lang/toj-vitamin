import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateBannerAI } from '@/lib/agents/generateBannerAI';
import { BannerConfig } from '@/lib/types/banner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Инициализируем Admin-клиент с сервисным ключом для обхода RLS (Row-Level Security)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bannerConfig, caption, customImageBase64 } = body as {
      bannerConfig: BannerConfig;
      caption: string;
      customImageBase64?: string;
    };

    if ((!bannerConfig && !customImageBase64) || !caption) {
      return NextResponse.json(
        { success: false, error: 'Отсутствует конфигурация баннера или текст поста.' },
        { status: 400 }
      );
    }

    // 1. Загружаем настройки подключения из Supabase site_settings
    const { data: settings } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', ['instagram_business_account_id', 'instagram_access_token']);

    const instagramAccountId = settings?.find(s => s.key === 'instagram_business_account_id')?.value;
    const instagramAccessToken = settings?.find(s => s.key === 'instagram_access_token')?.value;

    if (!instagramAccountId || !instagramAccessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Интеграция с Instagram API не настроена. Пожалуйста, введите ID аккаунта и Токен доступа во вкладке «Настройки»!' 
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting publication process for Instagram Account ID: ${instagramAccountId}...`);

    // 2. Генерируем изображение баннера или используем готовый снимок
    let base64Data = customImageBase64;
    if (!base64Data) {
      console.log('🎨 Generating high-res banner on server...');
      base64Data = await generateBannerAI(bannerConfig);
    } else {
      console.log('📸 Using custom frontend snapshot (e.g. 3D WebGL Canvas)...');
    }
    
    // Преобразуем Base64 в Buffer
    const base64ImageBytes = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64ImageBytes, 'base64');

    // 3. Загружаем картинку в Supabase Storage (используем существующий бакет product-images в папку banners)
    const filename = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    const filePath = `banners/${filename}`;
    console.log(`📥 Uploading banner to Supabase Storage bucket 'product-images' (Admin client): ${filePath}...`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError.message);
      return NextResponse.json(
        { success: false, error: `Ошибка облачного хранилища: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Получаем публичную ссылку на картинку
    const { data: { publicUrl } } = supabaseAdmin.storage.from('product-images').getPublicUrl(filePath);
    console.log(`🔗 Public image URL: ${publicUrl}`);

    // 4. Meta Graph API Шаг А: Создание медиа-контейнера в Instagram
    console.log('📦 Creating Instagram Media Container via Meta API...');
    const containerUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media`;
    const containerResponse = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: publicUrl,
        caption: caption,
        access_token: instagramAccessToken,
      }),
    });

    const containerResult = await containerResponse.json();
    if (!containerResponse.ok || containerResult.error) {
      console.error('❌ Meta Container API Error:', containerResult);
      const apiError = containerResult.error?.message || 'Неизвестная ошибка Meta API';
      return NextResponse.json(
        { success: false, error: `Ошибка Meta API (Контейнер): ${apiError}` },
        { status: 400 }
      );
    }

    const creationId = containerResult.id;
    console.log(`✅ Media Container created successfully with ID: ${creationId}`);

    // 4.5 Опрашиваем статус контейнера в Meta (асинхронная обработка фото)
    console.log(`⏳ Waiting for Meta to process the image container (ID: ${creationId})...`);
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 15; // 15 попыток * 2 секунды = 30 секунд максимум
    
    while (!isReady && attempts < maxAttempts) {
      attempts++;
      console.log(`🔍 Checking container status (Attempt ${attempts}/${maxAttempts})...`);
      
      const statusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${instagramAccessToken}`;
      const statusResponse = await fetch(statusUrl);
      const statusResult = await statusResponse.json();
      
      if (statusResponse.ok && statusResult.status_code) {
        const statusCode = statusResult.status_code;
        console.log(`📦 Container status_code: ${statusCode}`);
        
        if (statusCode === 'FINISHED') {
          isReady = true;
        } else if (statusCode === 'ERROR') {
          return NextResponse.json(
            { success: false, error: `Ошибка Meta API (Обработка изображения): ${statusResult.status || 'Неизвестная ошибка обработки'}` },
            { status: 400 }
          );
        } else if (statusCode === 'EXPIRED') {
          return NextResponse.json(
            { success: false, error: 'Ошибка Meta API: Срок действия медиа-контейнера истек.' },
            { status: 400 }
          );
        }
      }
      
      if (!isReady) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!isReady) {
      return NextResponse.json(
        { success: false, error: 'Превышено время ожидания обработки изображения на серверах Meta (30 секунд).' },
        { status: 408 }
      );
    }

    // 5. Meta Graph API Шаг Б: Публикация контейнера
    console.log('📢 Publishing Media Container to feed...');
    const publishUrl = `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: instagramAccessToken,
      }),
    });

    const publishResult = await publishResponse.json();
    if (!publishResponse.ok || publishResult.error) {
      console.error('❌ Meta Publish API Error:', publishResult);
      const apiError = publishResult.error?.message || 'Неизвестная ошибка Meta API при публикации';
      return NextResponse.json(
        { success: false, error: `Ошибка Meta API (Публикация): ${apiError}` },
        { status: 400 }
      );
    }

    const postId = publishResult.id;
    console.log(`🎉 Post published successfully! Post ID: ${postId}`);

    // 6. Получаем ссылку на опубликованный пост (permalink)
    console.log('🔗 Resolving post permalink...');
    const permalinkUrl = `https://graph.facebook.com/v19.0/${postId}?fields=permalink&access_token=${instagramAccessToken}`;
    const permalinkResponse = await fetch(permalinkUrl);
    const permalinkResult = await permalinkResponse.json();
    
    const postLink = permalinkResult.permalink || `https://instagram.com/p/${postId}`;
    console.log(`🎯 Post link resolved: ${postLink}`);

    return NextResponse.json({
      success: true,
      postId: postId,
      postUrl: postLink,
      imageUrl: publicUrl,
    });

  } catch (error: any) {
    console.error('❌ Instagram publish error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
