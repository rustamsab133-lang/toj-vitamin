import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detailUrl = searchParams.get('url');

  if (!detailUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch from GLS');
    const html = await response.text();

    // Regex to find the original high-res gallery link
    // <a class="product-detail-gallery__link ... " href="[ORIGINAL_URL]" ...
    const highResMatch = html.match(/class="product-detail-gallery__link[^"]*"[^>]*href="([^"]+)"/);
    if (highResMatch) {
       const finalUrl = highResMatch[1].startsWith('http') ? highResMatch[1] : `https://gls.store${highResMatch[1]}`;
       return NextResponse.json({ highResUrl: finalUrl });
    }

    // Fallback: look for ANY iblock link in the gallery area
    const fallbackMatch = html.match(/\/upload\/iblock\/[^"]+/);
    if (fallbackMatch) {
        return NextResponse.json({ highResUrl: `https://gls.store${fallbackMatch[0]}` });
    }

    return NextResponse.json({ error: 'Could not find high-res image' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to extract high-res image' }, { status: 500 });
  }
}
