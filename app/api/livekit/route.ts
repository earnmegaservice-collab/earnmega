import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const room = sp.get('room') || sp.get('room_id') || sp.get('roomName');
    const username = sp.get('username') || sp.get('name');
    const userId = sp.get('userId') || sp.get('identity') || username;
    const avatar = sp.get('avatar') || sp.get('avatarUrl');
    const isCreatorParam = sp.get('isCreator');

    if (!room) {
        return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json({ error: 'Server misconfigured: missing LiveKit credentials' }, { status: 500 });
    }

    const fallbackId = `user_${Math.random().toString(36).slice(2, 8)}`;
    const participantIdentity = userId || username || fallbackId;
    const participantName = username || userId || participantIdentity;

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

    // All 1-on-1 and Group call rooms (and any request where isCreator is not explicitly "false") get full publish permissions
    const isCallRoom = room.startsWith('call_') || room.startsWith('dm_') || room.startsWith('group_') || isCreatorParam === null;
    const canPublish = isCreatorParam === 'true' || isCallRoom;

    at.addGrant({
        room,
        roomJoin: true,
        canPublish,
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
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const room = body.room || body.room_id || body.roomName;
        const username = body.username || body.name;
        const userId = body.userId || body.identity || username;
        const avatar = body.avatar || body.avatarUrl;

        if (!room) {
            return NextResponse.json({ error: 'Missing "room" parameter' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return NextResponse.json({ error: 'Server misconfigured: missing LiveKit credentials' }, { status: 500 });
        }

        const participantIdentity = userId || username || `user_${Math.random().toString(36).slice(2, 8)}`;
        const participantName = username || participantIdentity;

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantIdentity,
            name: participantName,
            metadata: JSON.stringify({
                userId: participantIdentity,
                username: participantName,
                avatar: avatar || '',
            }),
            ttl: '6h',
        });

        at.addGrant({
            room,
            roomJoin: true,
            canPublish: true,
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
        return NextResponse.json({ error: err?.message || 'Failed to generate token' }, { status: 500 });
    }
}
