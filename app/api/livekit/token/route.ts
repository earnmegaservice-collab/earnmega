import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function generateLiveKitToken(params: {
    room: string | null;
    username: string | null;
    userId?: string | null;
    avatar?: string | null;
    canPublishOverride?: boolean;
}) {
    const { room, username, userId, avatar, canPublishOverride } = params;

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" parameter' }, { status: 400 });
    }
    const participantName = username || userId || `user_${Math.random().toString(36).slice(2, 8)}`;
    const participantIdentity = userId || username || participantName;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        console.error('[LiveKit Token API] Missing LiveKit environment variables:', {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
            hasWsUrl: !!wsUrl,
        });
        return NextResponse.json(
            { error: 'LiveKit server credentials are not configured properly' },
            { status: 500 }
        );
    }

    try {
        const metadata = JSON.stringify({
            userId: participantIdentity,
            username: participantName,
            avatar: avatar || '',
        });

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantIdentity,
            name: participantName,
            metadata,
            ttl: '6h',
        });

        const isCallRoom =
            room.startsWith('call_') ||
            room.startsWith('dm_') ||
            room.startsWith('group_') ||
            canPublishOverride !== false;

        at.addGrant({
            room,
            roomJoin: true,
            canPublish: isCallRoom ? true : Boolean(canPublishOverride),
            canSubscribe: true,
            canPublishData: true,
        });

        const token = await at.toJwt();
        return NextResponse.json({
            token,
            serverUrl: wsUrl,
            wsUrl,
            url: wsUrl,
            room,
            identity: participantIdentity,
            name: participantName,
        });
    } catch (err: any) {
        console.error('[LiveKit Token API] Error generating JWT:', err);
        return NextResponse.json(
            { error: err?.message || 'Failed to generate LiveKit token' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const room = sp.get('room') || sp.get('room_id') || sp.get('roomName');
    const username = sp.get('username') || sp.get('name');
    const userId = sp.get('userId') || sp.get('identity') || username;
    const avatar = sp.get('avatar') || sp.get('avatarUrl');

    return generateLiveKitToken({
        room,
        username,
        userId,
        avatar,
        canPublishOverride: true,
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const room = body.room || body.room_id || body.roomName || null;
        const username = body.username || body.name || null;
        const userId = body.userId || body.identity || username || null;
        const avatar = body.avatar || body.avatarUrl || null;

        return generateLiveKitToken({
            room,
            username,
            userId,
            avatar,
            canPublishOverride: true,
        });
    } catch (err: any) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
