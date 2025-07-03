// PASTE THIS ENTIRE CODE BLOCK INTO: app/api/fetch-robots/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const type = searchParams.get('type') as 'robots' | 'page';

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const userAgent = 'Mozilla/5.0 (compatible; BotScanner/1.0; +https://bot-scanner-n4g8.vercel.app)';

  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': type === 'page' ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' : 'text/plain'
      },
      signal: AbortSignal.timeout(8000), // 8-second timeout
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status });
    }

    const content = await response.text();
    let responsePayload: any;

    if (type === 'page') {
      // For page analysis, include headers
      const relevantHeaders: Record<string, string> = {};
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().includes('robot')) {
          relevantHeaders[key.toLowerCase()] = value;
        }
      }
      responsePayload = { content, headers: relevantHeaders };
    } else {
      // For robots.txt, just wrap the content in a JSON object
      responsePayload = { content };
    }

    // ALWAYS return JSON
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error(`Proxy error for ${targetUrl}:`, error.message);
    const status = error.name === 'TimeoutError' ? 504 : 500;
    const message = error.name === 'TimeoutError' ? 'Gateway Timeout' : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  }
}