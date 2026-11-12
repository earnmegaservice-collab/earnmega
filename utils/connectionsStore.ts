import { supabase } from './supabase';

export const AI_FRIENDS_BOT_ID = '00000000-0000-0000-0000-000000000001';
export const SUPPORT_BOT_ID = '00000000-0000-0000-0000-000000000002';

export const CONNECTION_REQ_PREFIX = '[CONNECTION_REQUEST:';

export interface ConnectionRequestItem {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'declined';
    is_spark?: boolean;
    created_at: string;
    senderProfile?: {
        id: string;
        username: string;
        name: string;
        full_name?: string;
        avatar_url?: string;
        bio?: string;
        age?: number;
        country?: string;
        location?: string;
        interests?: string[];
        profile_images?: string[];
        publicImages?: string[];
        is_verified?: boolean;
        is_premium?: boolean;
        is_vip?: boolean;
        subscription_tier?: string;
        coins_gifted?: number;
        created_at?: string;
    };
}

/**
 * Phase 5: Strict Real Badge Verification Helpers
 * Only renders PREMIUM or VIP when the user's actual database profile has a verified active upgrade.
 */
export function isRealVip(profile: any): boolean {
    if (!profile) return false;
    if (profile.is_bot || profile.id === AI_FRIENDS_BOT_ID || profile.id === SUPPORT_BOT_ID) return false;
    const dbSubTier = String(profile.subscription_tier || '').toLowerCase();
    return Boolean(profile.is_vip === true || dbSubTier === 'vip');
}

export function isRealPremium(profile: any): boolean {
    if (!profile) return false;
    if (profile.is_bot || profile.id === AI_FRIENDS_BOT_ID || profile.id === SUPPORT_BOT_ID) return false;
    const dbSubTier = String(profile.subscription_tier || '').toLowerCase();
    return Boolean(profile.is_premium === true || dbSubTier === 'premium');
}

export function isRealPremiumOrVip(profile: any): boolean {
    return isRealVip(profile) || isRealPremium(profile);
}

export function getRealSubscriptionTier(profile: any): 'FREE' | 'VIP' | 'PREMIUM' {
    if (isRealVip(profile)) return 'VIP';
    if (isRealPremium(profile)) return 'PREMIUM';
    return 'FREE';
}

export function isRealVerified(profile: any): boolean {
    if (!profile) return false;
    if (profile.id === AI_FRIENDS_BOT_ID) return true;
    return Boolean(profile.is_verified === true || profile.facial_verified === true);
}

/**
 * Helper to check if a message content string is an internal connection request control row
 */
export function isConnectionRequestControlMessage(content?: string | null, messageType?: string | null): boolean {
    if (messageType === 'connection_request') return true;
    if (!content || typeof content !== 'string') return false;
    return content.startsWith(CONNECTION_REQ_PREFIX);
}

export function parseConnectionRequestStatus(content?: string | null): 'pending' | 'accepted' | 'declined' | null {
    if (!content || !content.startsWith(CONNECTION_REQ_PREFIX)) return null;
    const inner = content.slice(CONNECTION_REQ_PREFIX.length).replace(']', '').trim().toLowerCase();
    if (inner === 'spark_pending' || inner === 'pending') {
        return 'pending';
    }
    if (inner === 'accepted' || inner === 'declined') {
        return inner;
    }
    return null;
}

export function isSparkConnectionRequestControl(content?: string | null): boolean {
    if (!content || !content.startsWith(CONNECTION_REQ_PREFIX)) return false;
    const inner = content.slice(CONNECTION_REQ_PREFIX.length).replace(']', '').trim().toLowerCase();
    return inner === 'spark_pending';
}

/**
 * Helper to insert a strictly-scoped per-user notification into public.notifications
 * Handles both live schema (recipient_id, sender_id, message, read) and migration schema (user_id, actor_id, content, is_read)
 */
export async function insertScopedNotification(params: {
    recipientId: string;
    senderId: string;
    type: string;
    message: string;
}) {
    const { recipientId, senderId, type, message } = params;
    if (!recipientId || recipientId === senderId) return;

    try {
        // First try live DB schema columns: recipient_id, sender_id, type, message, read
        const { error: err1 } = await supabase.from('notifications').insert({
            recipient_id: recipientId,
            sender_id: senderId,
            type,
            message,
            read: false,
        });

        if (err1) {
            // Fallback to migration schema columns: user_id, actor_id, type, content, is_read
            await supabase.from('notifications').insert({
                user_id: recipientId,
                actor_id: senderId,
                type,
                content: message,
                is_read: false,
            });
        }
    } catch {
        // Non-blocking notification insert
    }
}

/**
 * Broadcasts a real-time event to a user's personal inbox channel
 */
async function broadcastToUserInbox(targetUserId: string, event: string, payload: any) {
    try {
        const channel = supabase.channel(`user_inbox_${targetUserId}`);
        await new Promise<void>((resolve) => {
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, 1500);

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    await channel.send({
                        type: 'broadcast',
                        event,
                        payload,
                    });
                    setTimeout(() => {
                        supabase.removeChannel(channel);
                    }, 300);
                    resolve();
                }
            });
        });
    } catch {
        // Ignore broadcast errors
    }
}

/**
 * Fetches all connection states for currentUserId:
 * - acceptedUserIds: Set of human user IDs where status === 'accepted'
 * - incomingRequests: Array of pending requests where receiver_id === currentUserId
 * - outgoingPendingIds: Set of user IDs where sender_id === currentUserId and status === 'pending'
 * - connectionTimestamps: Map of partnerId -> timestamp of connection activity
 */
export async function fetchUserConnectionsAndRequests(currentUserId: string): Promise<{
    acceptedUserIds: Set<string>;
    incomingRequests: ConnectionRequestItem[];
    outgoingPendingIds: Set<string>;
    connectionTimestamps: Map<string, number>;
}> {
    const acceptedUserIds = new Set<string>();
    const outgoingPendingIds = new Set<string>();
    const connectionTimestamps = new Map<string, number>();
    // Keyed by `${sender_id}_${receiver_id}` -> latest state
    const pairRecords = new Map<
        string,
        {
            id: string;
            sender_id: string;
            receiver_id: string;
            status: 'pending' | 'accepted' | 'declined';
            is_spark?: boolean;
            created_at: string;
        }
    >();

    if (!currentUserId) {
        return { acceptedUserIds, incomingRequests: [], outgoingPendingIds, connectionTimestamps };
    }

    // 1. Try querying dedicated `chat_requests` table if present
    try {
        let crData: any[] | null = null;
        const { data: crWithSpark, error: crSparkError } = await supabase
            .from('chat_requests')
            .select('id, sender_id, receiver_id, status, is_spark, created_at, updated_at')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .order('created_at', { ascending: true });

        if (!crSparkError && Array.isArray(crWithSpark)) {
            crData = crWithSpark;
        } else {
            const { data: crFallback, error: crError } = await supabase
                .from('chat_requests')
                .select('id, sender_id, receiver_id, status, created_at, updated_at')
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                .order('created_at', { ascending: true });
            if (!crError && Array.isArray(crFallback)) {
                crData = crFallback;
            }
        }

        if (Array.isArray(crData)) {
            for (const row of crData) {
                if (!row.sender_id || !row.receiver_id) continue;
                const key = `${row.sender_id}_${row.receiver_id}`;
                pairRecords.set(key, {
                    id: row.id,
                    sender_id: row.sender_id,
                    receiver_id: row.receiver_id,
                    status: row.status as 'pending' | 'accepted' | 'declined',
                    is_spark: Boolean(row.is_spark),
                    created_at: row.updated_at || row.created_at,
                });
            }
        }
    } catch {
        // Table may not exist yet in PostgREST cache; fallback below handles it seamlessly
    }

    // 2. Also query `[CONNECTION_REQUEST:...]` records in `messages` table
    try {
        const { data: msgData, error: msgError } = await supabase
            .from('messages')
            .select('id, sender_id, receiver_id, content, created_at')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .like('content', `${CONNECTION_REQ_PREFIX}%`)
            .order('created_at', { ascending: true });

        if (!msgError && Array.isArray(msgData)) {
            for (const row of msgData) {
                if (!row.sender_id || !row.receiver_id) continue;
                const parsedStatus = parseConnectionRequestStatus(row.content);
                if (!parsedStatus) continue;
                const isSparkMsg = isSparkConnectionRequestControl(row.content);
                const key = `${row.sender_id}_${row.receiver_id}`;
                const existing = pairRecords.get(key);
                if (!existing || new Date(row.created_at).getTime() >= new Date(existing.created_at).getTime()) {
                    pairRecords.set(key, {
                        id: row.id,
                        sender_id: row.sender_id,
                        receiver_id: row.receiver_id,
                        status: parsedStatus,
                        is_spark: Boolean(isSparkMsg || existing?.is_spark),
                        created_at: row.created_at,
                    });
                } else if (isSparkMsg && existing) {
                    existing.is_spark = true;
                }
            }
        }
    } catch {
        // Ignore
    }

    // 3. Reconcile directional pairs into unified user-pair relationship states
    // Group by unordered pair of users
    const userPairs = new Map<
        string,
        Array<{
            id: string;
            sender_id: string;
            receiver_id: string;
            status: 'pending' | 'accepted' | 'declined';
            is_spark?: boolean;
            created_at: string;
        }>
    >();

    for (const rec of pairRecords.values()) {
        const otherId = rec.sender_id === currentUserId ? rec.receiver_id : rec.sender_id;
        if (!otherId || otherId === currentUserId || otherId === AI_FRIENDS_BOT_ID || otherId === SUPPORT_BOT_ID) {
            continue;
        }
        const list = userPairs.get(otherId) || [];
        list.push(rec);
        userPairs.set(otherId, list);
    }

    const pendingIncomingRaw: Array<{
        id: string;
        sender_id: string;
        receiver_id: string;
        status: 'pending' | 'accepted' | 'declined';
        is_spark?: boolean;
        created_at: string;
    }> = [];

    for (const [otherId, records] of userPairs.entries()) {
        // Sort chronologically
        records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const latest = records[records.length - 1];

        // If any active record is 'accepted' and the latest isn't 'declined' after it
        const hasAccepted = records.some((r) => r.status === 'accepted') && latest.status !== 'declined';
        // Smart Mutual Match check: if both users have pending requests to each other
        const sentPending = records.find((r) => r.sender_id === currentUserId && r.status === 'pending');
        const receivedPending = records.find((r) => r.receiver_id === currentUserId && r.status === 'pending');

        if (hasAccepted || (sentPending && receivedPending)) {
            acceptedUserIds.add(otherId);
            connectionTimestamps.set(otherId, new Date(latest.created_at).getTime());
            continue;
        }

        if (latest.status === 'pending') {
            if (latest.receiver_id === currentUserId) {
                pendingIncomingRaw.push(latest);
            } else if (latest.sender_id === currentUserId) {
                outgoingPendingIds.add(otherId);
            }
        }
    }

    // 4. Hydrate sender profiles for all incoming pending requests so mandatory Profile Inspection works
    let incomingRequests: ConnectionRequestItem[] = [];
    if (pendingIncomingRaw.length > 0) {
        const senderIds = Array.from(new Set(pendingIncomingRaw.map((r) => r.sender_id)));
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', senderIds);

        const profileMap = new Map<string, any>();
        if (Array.isArray(profilesData)) {
            for (const p of profilesData) {
                profileMap.set(p.id, p);
            }
        }

        incomingRequests = pendingIncomingRaw
            .map((req) => {
                const p = profileMap.get(req.sender_id);
                const displayName = p?.username || p?.full_name || p?.name || 'User';
                return {
                    ...req,
                    senderProfile: {
                        id: req.sender_id,
                        username: p?.username || displayName,
                        name: displayName,
                        full_name: p?.full_name || displayName,
                        avatar_url: p?.avatar_url || '',
                        bio: p?.bio || 'Wants to connect with you on EarnMega ❤️',
                        age: p?.age,
                        country: p?.country || p?.location_country || p?.location || '',
                        location: p?.location || p?.country || p?.location_country || '',
                        interests: Array.isArray(p?.interests) ? p.interests : [],
                        profile_images: Array.isArray(p?.profile_images)
                            ? p.profile_images
                            : Array.isArray(p?.publicImages)
                            ? p.publicImages
                            : p?.avatar_url
                            ? [p.avatar_url]
                            : [],
                        publicImages: Array.isArray(p?.publicImages)
                            ? p.publicImages
                            : Array.isArray(p?.profile_images)
                            ? p.profile_images
                            : [],
                        is_verified: isRealVerified(p),
                        is_premium: isRealPremium(p),
                        is_vip: isRealVip(p),
                        subscription_tier: getRealSubscriptionTier(p),
                        coins_gifted: p?.coins_gifted || 0,
                        created_at: p?.created_at,
                    },
                };
            })
            .sort((a, b) => {
                // Pin Spark requests to the very top of Connection Requests
                if (a.is_spark && !b.is_spark) return -1;
                if (!a.is_spark && b.is_spark) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }

    return {
        acceptedUserIds,
        incomingRequests,
        outgoingPendingIds,
        connectionTimestamps,
    };
}

/**
 * Phase 2: Send a Love / Spark Connection Request (with Smart Mutual Match upgrade)
 */
export async function sendLoveRequest(params: {
    currentUserId: string;
    currentUsername: string;
    currentUserAvatar?: string;
    targetUserId: string;
    targetUsername: string;
    isSpark?: boolean;
}): Promise<{
    status: 'sent' | 'already_sent' | 'mutual_match' | 'already_connected';
    requestId?: string;
    isSpark?: boolean;
}> {
    const { currentUserId, currentUsername, currentUserAvatar, targetUserId, isSpark = false } = params;

    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        throw new Error('Invalid user IDs for connection request');
    }

    // Check current relationship state
    const { acceptedUserIds, incomingRequests, outgoingPendingIds } =
        await fetchUserConnectionsAndRequests(currentUserId);

    if (acceptedUserIds.has(targetUserId)) {
        return { status: 'already_connected' };
    }

    // Smart Mutual Match: Did targetUser already send a pending Love request to currentUser?
    const existingIncoming = incomingRequests.find((r) => r.sender_id === targetUserId);
    if (existingIncoming) {
        await acceptLoveRequest({
            requestId: existingIncoming.id,
            senderId: targetUserId,
            receiverId: currentUserId,
            receiverUsername: currentUsername,
            receiverAvatar: currentUserAvatar,
            isMutualMatch: true,
        });
        return { status: 'mutual_match', requestId: existingIncoming.id, isSpark };
    }

    if (outgoingPendingIds.has(targetUserId) && !isSpark) {
        return { status: 'already_sent' };
    }

    let createdId = `${currentUserId}_${targetUserId}_${Date.now()}`;

    // 1. Try upserting in `chat_requests` table (with is_spark support)
    try {
        const { data: crRow, error: crErr } = await supabase
            .from('chat_requests')
            .upsert(
                {
                    sender_id: currentUserId,
                    receiver_id: targetUserId,
                    status: 'pending',
                    is_spark: isSpark,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'sender_id,receiver_id' }
            )
            .select('id')
            .single();

        if (!crErr && crRow?.id) {
            createdId = crRow.id;
        } else if (crErr) {
            // Fallback without is_spark column if not yet migrated
            const { data: crFallback } = await supabase
                .from('chat_requests')
                .upsert(
                    {
                        sender_id: currentUserId,
                        receiver_id: targetUserId,
                        status: 'pending',
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'sender_id,receiver_id' }
                )
                .select('id')
                .single();
            if (crFallback?.id) createdId = crFallback.id;
        }
    } catch {
        // Fallback below
    }

    // 2. Also persist in `messages` as `[CONNECTION_REQUEST:spark_pending]` or `[CONNECTION_REQUEST:pending]`
    try {
        await supabase
            .from('messages')
            .delete()
            .eq('sender_id', currentUserId)
            .eq('receiver_id', targetUserId)
            .like('content', `${CONNECTION_REQ_PREFIX}%`);

        const controlTag = isSpark
            ? `${CONNECTION_REQ_PREFIX}spark_pending]`
            : `${CONNECTION_REQ_PREFIX}pending]`;

        const { data: msgRow } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUserId,
                receiver_id: targetUserId,
                content: controlTag,
                status: 'sent',
                is_read: false,
            })
            .select('id')
            .single();

        if (msgRow?.id) {
            createdId = msgRow.id;
        }
    } catch {
        // Ignore
    }

    // 3. Create scoped notification for receiver
    await insertScopedNotification({
        recipientId: targetUserId,
        senderId: currentUserId,
        type: isSpark ? 'SPARK_REQUEST' : 'LOVE_REQUEST',
        message: isSpark
            ? `⚡ @${currentUsername || 'Someone'} spent a Spark on you!`
            : `@${currentUsername || 'Someone'} sent you a Love request! ❤️ Tap to view their profile.`,
    });

    // 4. Broadcast real-time event to receiver's inbox channel
    await broadcastToUserInbox(targetUserId, 'connection_request', {
        id: createdId,
        sender_id: currentUserId,
        receiver_id: targetUserId,
        sender_name: currentUsername,
        sender_avatar: currentUserAvatar,
        status: 'pending',
        is_spark: isSpark,
        created_at: new Date().toISOString(),
    });

    return { status: 'sent', requestId: createdId, isSpark };
}

/**
 * Phase 3: Accept a Love / Connection Request
 * - Updates request status to 'accepted' in Supabase
 * - Broadcasts via Supabase Realtime to both sender and receiver
 * - Sends private notification to the sender: "@[username] accepted your Love request! Tap to chat."
 */
export async function acceptLoveRequest(params: {
    requestId?: string;
    senderId: string;
    receiverId: string;
    receiverUsername: string;
    receiverAvatar?: string;
    isMutualMatch?: boolean;
}): Promise<void> {
    const { senderId, receiverId, receiverUsername, receiverAvatar, isMutualMatch } = params;
    if (!senderId || !receiverId) return;

    const nowIso = new Date().toISOString();

    // 1. Update `chat_requests` table if present
    try {
        await supabase
            .from('chat_requests')
            .update({ status: 'accepted', updated_at: nowIso })
            .or(
                `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            );
    } catch {
        // Fallback below
    }

    // 2. Update/insert `[CONNECTION_REQUEST:accepted]` in `messages` table
    try {
        // Remove previous pending/declined request markers between this pair
        await supabase
            .from('messages')
            .delete()
            .or(
                `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            )
            .like('content', `${CONNECTION_REQ_PREFIX}%`);

        await supabase.from('messages').insert({
            sender_id: senderId,
            receiver_id: receiverId,
            content: `${CONNECTION_REQ_PREFIX}accepted]`,
            status: 'delivered',
            is_read: true,
        });
    } catch {
        // Ignore
    }

    // 3. Send private notification strictly to the sender
    const notifMessage = isMutualMatch
        ? `It's a Match with @${receiverUsername || 'Someone'}! 🎉 Tap to chat.`
        : `@${receiverUsername || 'Someone'} accepted your Love request! Tap to chat.`;

    await insertScopedNotification({
        recipientId: senderId,
        senderId: receiverId,
        type: 'LOVE_ACCEPTED',
        message: notifMessage,
    });

    // 4. Broadcast via Supabase Realtime to both sender and receiver so both Chat Lists unlock the 1-on-1 DM immediately
    const payload = {
        sender_id: senderId,
        receiver_id: receiverId,
        accepter_name: receiverUsername,
        accepter_avatar: receiverAvatar,
        status: 'accepted',
        is_mutual_match: Boolean(isMutualMatch),
        updated_at: nowIso,
    };

    await Promise.all([
        broadcastToUserInbox(senderId, 'connection_accepted', payload),
        broadcastToUserInbox(receiverId, 'connection_accepted', payload),
    ]);
}

/**
 * Phase 3: Decline a Love / Connection Request
 * - Deletes or marks the request 'declined' in Supabase
 * - Immediately removes the request from receiver's Chat List without creating any chat room
 */
export async function declineLoveRequest(params: {
    requestId?: string;
    senderId: string;
    receiverId: string;
}): Promise<void> {
    const { senderId, receiverId } = params;
    if (!senderId || !receiverId) return;

    // 1. Update/delete in `chat_requests` table if present
    try {
        await supabase
            .from('chat_requests')
            .update({ status: 'declined', updated_at: new Date().toISOString() })
            .or(
                `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            );
    } catch {
        // Fallback below
    }

    // 2. Delete pending request rows in `messages` table
    try {
        await supabase
            .from('messages')
            .delete()
            .or(
                `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            )
            .like('content', `${CONNECTION_REQ_PREFIX}%`);
    } catch {
        // Ignore
    }

    // 3. Notify sender's client state silently so button resets cleanly if needed
    await broadcastToUserInbox(senderId, 'connection_declined', {
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'declined',
    });
}
