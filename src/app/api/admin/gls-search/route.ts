import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const searchUrl = `https://gls.store/catalog/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch from GLS');
    const html = await response.text();

    // Regex to find product items in search results
    // We want: Name, Detail Link, and Thumbnail
    const results: any[] = [];
    const itemRegex = /<div[^>]*class="item_block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;
    
    // More robust parsing: find all links with class dark_link and their surrounding images
    // Based on reality: 
    // <a href="..." class="dark_link ..."><span>NAME</span></a>
    // <img src="..." />
    
    const productMatches = Array.from(html.matchAll(/<div[^>]*class="item_block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi));
    
    // Let's use a simpler approach: extract all product links and their first image
    const links = Array.from(html.matchAll(/<a[^>]*href="(\/catalog\/[^"]+)"[^>]*class="dark_link[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/gi));
    
    for (const link of links) {
        const detailUrl = link[1];
        const name = link[2].trim();
        
        // Find the image for this product (it's usually before or after the name)
        // For simplicity in the search results, we can just return the name and detail URL
        // and fetch the actual image when selected, OR try to find the thumbnail now.
        
        results.push({
            name,
            detailUrl: `https://gls.store${detailUrl}`,
            // We'll extract the high-res image on the client side or via another call
        });
    }

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error('GLS Search Error:', error);
    return NextResponse.json({ error: 'Failed to search GLS' }, { status: 500 });
  }
}
