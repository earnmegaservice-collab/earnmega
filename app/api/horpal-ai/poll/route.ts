import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'image'; // image or video
    const apiKey = process.env.MAGIC_HOUR_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing Magic Hour API configuration.' }, { status: 500 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing Job ID' }, { status: 400 });
    }

    const endpoint = type === 'video'
      ? `https://api.magichour.ai/v1/video-projects/${id}`
      : `https://api.magichour.ai/v1/image-projects/${id}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
       const errorData = await response.json().catch(() => null);
       console.error("Magic Hour Polling error:", errorData || response.statusText);
       return NextResponse.json({ error: 'Failed to poll content' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
       status: data.status,
       url: data.downloads?.[0]?.url || null,
       error: data.error || null
    });

  } catch (error) {
    console.error('Error polling horpal-ai:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
