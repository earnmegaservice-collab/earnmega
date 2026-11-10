import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('magic-hour-event-signature');
    const timestamp = req.headers.get('magic-hour-event-timestamp');
    const secret = process.env.MAGIC_HOUR_WEBHOOK_SECRET;

    if (!signature || !timestamp || !secret) {
      return NextResponse.json({ error: 'Missing headers or secret' }, { status: 400 });
    }

    // Verify timestamp (300 seconds window)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
       return NextResponse.json({ error: 'Webhook timestamp expired' }, { status: 400 });
    }

    const rawBody = await req.text();
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log('Received valid Magic Hour webhook:', event.type);

    // Process event based on event.type (video.started, video.completed, image.completed, etc)
    // Here we just return 200 OK

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error processing Magic Hour webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
