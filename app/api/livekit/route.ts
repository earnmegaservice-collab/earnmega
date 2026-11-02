import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username');
    const role = searchParams.get('role') || 'viewer';

    if (!room || !username) {
      return NextResponse.json({ error: 'Missing room or username' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      process.env.LIVEKIT_URL ||
      'wss://earnmega-mbwh7c26.livekit.cloud';

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET in environment variables' },
        { status: 500 }
      );
    }

    const isHost = role === 'host';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: username,
      ttl: '6h'
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl
    });
  } catch (err: any) {
    console.error('[LIVEKIT TOKEN ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate LiveKit token' },
      { status: 500 }
    );
  }
}
