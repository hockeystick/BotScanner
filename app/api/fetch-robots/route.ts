// PASTE THIS ENTIRE CODE BLOCK INTO: app/api/fetch-robots/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Updated, polite User-Agent with your live URL
  const userAgent = 'Mozilla/5.0 (compatible; BotScanner/1.0; +https://bot-scanner-n4g8.vercel.app)';

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(8000), // 8-second timeout
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status });
    }

    const content = await response.text();
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error.message);
    if (error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Gateway Timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}