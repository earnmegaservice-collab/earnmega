import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

const MASTER_ADMINS = [
  'horpalservice@gmail.com',
  'geestablish@gmail.com',
  'earnmegaservice@gmail.com',
];

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Server misconfiguration: Missing Supabase Admin Keys');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/admin/action
 * Publicly readable enforcement snapshot used by `useAdminRealtimeEnforcement()` 5-second background polling.
 * Returns `platform_settings` (id = 1) and, if `userId` is provided, the user's enforcement/entitlement columns.
 */
export async function GET(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const { data: settingsRow } = await adminSupabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    let profileRow = null;
    if (userId && /^[0-9a-fA-F-]{36}$/.test(userId.trim())) {
      const { data: prof } = await adminSupabase
        .from('profiles')
        .select(
          'id, email, username, is_banned, is_suspended, status, is_wallet_frozen, has_paid_global_chat, global_chat_paystack_ref, is_paid, subscription_tier, is_pro, is_premium, subscription_started_at, subscription_expires_at, has_paid_pillar2, is_pillar2_paid, pillar2_paystack_ref, pillar2_paid_at, pillar2_expires_at, license_activated_at, license_expires_at, has_paid_pillar3, pillar3_paystack_ref, pillar3_tier, pillar3_started_at, pillar3_expires_at, updated_at'
        )
        .eq('id', userId.trim())
        .maybeSingle();
      profileRow = prof || null;
    }

    return NextResponse.json(
      {
        success: true,
        settings: settingsRow || {
          id: 1,
          maintenance_mode: false,
          maintenance_message: 'Earnmega is undergoing a scheduled system upgrade. Back shortly!',
          freeze_p1_withdrawals: false,
          freeze_p2_withdrawals: false,
          disable_live_streams: false,
          disable_new_signups: false,
          lock_pillar1: false,
          lock_pillar2: false,
          lock_pillar3: false,
          p1_entry_price_ghs: 50,
          p2_entry_price_ghs: 90,
          p2_renewal_price_ghs: 45,
          p3_weekly_price_ghs: 50,
          p3_pro_price_ghs: 100,
          p3_premium_price_ghs: 200,
          global_announcement_banner: '',
        },
        profile: profileRow,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to read enforcement state' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const resendApiKey =
      process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY_MAIN ||
      process.env.RESEND_API_KEY_AFFILIATE;

    const body = await request.json();
    const { action, payload = {} } = body;

    // Allow in-app user live report submissions without requiring master admin token
    if (action === 'SUBMIT_LIVE_REPORT') {
      const { Platform, Report_Type, Reason, Details, Reported_User, Reported_By, Stream_ID, Timestamp } = payload;
      const resend = resendApiKey ? new Resend(resendApiKey) : null;

      try {
        await adminSupabase.from('reports').insert([
          {
            content_type: 'live',
            reason: Reason,
            details: Details,
            reported_user_id: Reported_User,
            reporter_id: Reported_By,
          },
        ]);
      } catch (_) {}

      if (resend && process.env.ADMIN_CONTACT_EMAIL) {
        await resend.emails.send({
          from: 'trust-pipeline@resend.dev',
          to: process.env.ADMIN_CONTACT_EMAIL || 'earnmegaservice@gmail.com',
          subject: `[HorPal Trust & Safety] Live Report against ${Reported_User}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fff; padding: 20px; border: 1px solid #27272a; border-radius: 8px;">
              <h2 style="color: #fbbf24; text-align: center; text-transform: uppercase;">🚨 NEW LIVE REPORT</h2>
              <div style="background-color: #18181b; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p><strong>Reported User:</strong> ${Reported_User}</p>
                <p><strong>Reason:</strong> ${Reason}</p>
                <p><strong>Details:</strong> ${Details}</p>
                <p><strong>Reported By:</strong> ${Reported_By}</p>
                <p><strong>Stream ID:</strong> ${Stream_ID}</p>
                <p><strong>Timestamp:</strong> ${Timestamp}</p>
                <p><strong>Platform:</strong> ${Platform} (${Report_Type})</p>
              </div>
            </div>
          `,
        });
      }
      return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    }

    // Verify Admin Authorization
    const authHeader = request.headers.get('Authorization');
    const commandHeader = request.headers.get('x-admin-command-key');
    let isAuthorized = commandHeader === 'geemings-command-x9v2-authorized';

    if (!isAuthorized && authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const {
          data: { user },
        } = await adminSupabase.auth.getUser(token);
        if (user?.email && MASTER_ADMINS.includes(user.email.toLowerCase().trim())) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // -------------------------------------------------------------------------
    // PHASE 1 & 2: PLATFORM SETTINGS & KILL SWITCHES
    // -------------------------------------------------------------------------
    if (action === 'FETCH_PLATFORM_SETTINGS') {
      const { data: settings } = await adminSupabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      return NextResponse.json({ success: true, settings });
    }

    if (action === 'UPDATE_PLATFORM_SETTINGS' || action === 'GLOBAL_KILL_SWITCH') {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const allowedBooleanKeys = [
        'maintenance_mode',
        'freeze_p1_withdrawals',
        'freeze_p2_withdrawals',
        'disable_live_streams',
        'disable_new_signups',
        'lock_pillar1',
        'lock_pillar2',
        'lock_pillar3',
      ];
      const allowedNumericKeys = [
        'p1_entry_price_ghs',
        'p2_entry_price_ghs',
        'p2_renewal_price_ghs',
        'p3_weekly_price_ghs',
        'p3_pro_price_ghs',
        'p3_premium_price_ghs',
      ];
      const allowedStringKeys = ['maintenance_message', 'global_announcement_banner'];

      for (const k of allowedBooleanKeys) {
        if (typeof payload[k] === 'boolean') updates[k] = payload[k];
      }
      for (const k of allowedNumericKeys) {
        if (payload[k] !== undefined && Number.isFinite(Number(payload[k]))) {
          updates[k] = Number(payload[k]);
        }
      }
      for (const k of allowedStringKeys) {
        if (typeof payload[k] === 'string') updates[k] = payload[k];
      }

      // Support single switch key + value format: { switchKey: 'maintenance_mode', value: true }
      if (typeof payload.switchKey === 'string' && allowedBooleanKeys.includes(payload.switchKey)) {
        updates[payload.switchKey] = Boolean(payload.value);
      }

      const { data: updatedSettings, error } = await adminSupabase
        .from('platform_settings')
        .upsert({ id: 1, ...updates }, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'PLATFORM_SETTINGS_UPDATED',
          payload: { settings: updatedSettings, timestamp: Date.now() },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, settings: updatedSettings });
    }

    // -------------------------------------------------------------------------
    // OVERWATCH STATS
    // -------------------------------------------------------------------------
    if (action === 'FETCH_ALL_STATS') {
      const staleCutoff = new Date(Date.now() - 120 * 1000).toISOString();
      await adminSupabase
        .from('active_live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('is_live', true)
        .lt('last_heartbeat_at', staleCutoff);

      const [
        { count: users },
        { count: p1Paid },
        { count: p2Active },
        { count: p3Active },
        { count: liveActive },
        { data: coinsData },
        { data: revData },
        { count: pendingP2 },
        { data: settingsRow },
      ] = await Promise.all([
        adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
        adminSupabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('has_paid_global_chat', true),
        adminSupabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('has_paid_pillar2', true),
        adminSupabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('has_paid_pillar3', true),
        adminSupabase
          .from('active_live_streams')
          .select('*', { count: 'exact', head: true })
          .eq('is_live', true),
        adminSupabase.from('profiles').select('coin_balance, coins'),
        adminSupabase.from('profiles').select('available_balance_ghs, affiliate_balance'),
        adminSupabase
          .from('pillar2_payout_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'processing']),
        adminSupabase.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
      ]);

      const coins = (coinsData || []).reduce(
        (acc, row: any) => acc + Math.max(Number(row.coin_balance || 0), Number(row.coins || 0)),
        0
      );
      const rev = (revData || []).reduce(
        (acc, row: any) =>
          acc + Math.max(Number(row.affiliate_balance || 0), Number(row.available_balance_ghs || 0)),
        0
      );

      return NextResponse.json({
        success: true,
        stats: {
          users: users || 0,
          p1Paid: p1Paid || 0,
          p2Active: p2Active || 0,
          p3Active: p3Active || 0,
          live: liveActive || 0,
          coins,
          rev,
          pending: pendingP2 || 0,
        },
        settings: settingsRow || null,
      });
    }

    // -------------------------------------------------------------------------
    // PHASE 4: LIVE RADAR SURVEILLANCE (ACTIVE STREAMS, GHOST WATCH, WARN, TERMINATE)
    // -------------------------------------------------------------------------
    if (action === 'FETCH_ACTIVE_STREAMS') {
      const staleCutoff = new Date(Date.now() - 120 * 1000).toISOString();
      await adminSupabase
        .from('active_live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('is_live', true)
        .lt('last_heartbeat_at', staleCutoff);

      const { data: activeRows } = await adminSupabase
        .from('active_live_streams')
        .select('*')
        .eq('is_live', true)
        .order('started_at', { ascending: false });

      // Also check legacy live_streams table for any live streams not yet in active_live_streams
      const { data: legacyRows } = await adminSupabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .neq('status', 'ended')
        .order('created_at', { ascending: false })
        .limit(25);

      const byRoom = new Map<string, any>();
      for (const row of activeRows || []) {
        byRoom.set(row.room_name, row);
      }

      for (const leg of legacyRows || []) {
        const rName = leg.livekit_room_name || leg.room_id || `live_${leg.host_id}`;
        if (!byRoom.has(rName) && !leg.admin_terminated) {
          byRoom.set(rName, {
            id: leg.id,
            room_name: rName,
            host_user_id: leg.host_id,
            host_username: leg.host_username || 'Creator',
            host_email: null,
            host_avatar: leg.host_avatar || null,
            stream_title: leg.title || 'Live on EarnMega 🔥',
            viewer_count: leg.viewer_count || 1,
            coins_earned: leg.total_coins_earned || 0,
            is_live: true,
            started_at: leg.started_at || leg.created_at || new Date().toISOString(),
          });
        }
      }

      const combined = Array.from(byRoom.values());
      const hostIds = Array.from(new Set(combined.map((s) => s.host_user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      if (hostIds.length > 0) {
        const { data: profs } = await adminSupabase
          .from('profiles')
          .select('id, username, full_name, email, avatar_url')
          .in('id', hostIds);
        for (const p of profs || []) {
          profileMap[p.id] = p;
        }
      }

      const enriched = combined.map((s) => {
        const prof = profileMap[s.host_user_id] || {};
        return {
          ...s,
          host_username: s.host_username || prof.username || 'Creator',
          host_full_name: prof.full_name || s.host_username || prof.username || 'Creator',
          host_email: s.host_email || prof.email || 'N/A',
          host_avatar: s.host_avatar || prof.avatar_url || null,
        };
      });

      return NextResponse.json({ success: true, streams: enriched });
    }

    if (action === 'GHOST_WATCH_TOKEN') {
      const { roomName } = payload;
      if (!roomName || typeof roomName !== 'string') {
        return NextResponse.json({ success: false, error: 'Missing roomName' }, { status: 400 });
      }
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
      if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json(
          { success: false, error: 'LiveKit credentials not configured' },
          { status: 500 }
        );
      }

      const ghostIdentity = `ghost_admin_${Date.now()}`;
      const at = new AccessToken(apiKey, apiSecret, {
        identity: ghostIdentity,
        name: 'Admin Ghost Observer',
        ttl: '4h',
      });
      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        hidden: true,
      });
      const token = await at.toJwt();
      return NextResponse.json({
        success: true,
        token,
        wsUrl,
        roomName,
        identity: ghostIdentity,
      });
    }

    if (action === 'BEAM_STREAMER_WARNING') {
      const { streamId, roomName, hostUserId, message } = payload;
      if (!message || typeof message !== 'string') {
        return NextResponse.json({ success: false, error: 'Warning message is required' }, { status: 400 });
      }

      if (roomName) {
        await adminSupabase
          .from('active_live_streams')
          .update({ admin_warning_message: message })
          .eq('room_name', roomName);
      } else if (streamId) {
        await adminSupabase
          .from('active_live_streams')
          .update({ admin_warning_message: message })
          .eq('id', streamId);
      }

      if (hostUserId) {
        await adminSupabase
          .from('live_streams')
          .update({ admin_warning_message: message })
          .eq('host_id', hostUserId)
          .eq('is_live', true);
      }

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'STREAMER_WARNING',
          payload: {
            streamId,
            roomName,
            hostUserId,
            message,
            timestamp: Date.now(),
          },
        });
      } catch (_) {}

      return NextResponse.json({ success: true });
    }

    if (action === 'FORCE_TERMINATE_STREAM' || action === 'KILL_STREAM') {
      const { streamId, roomName, hostId, hostUserId } = payload;
      const targetHostId = hostUserId || hostId;
      const nowIso = new Date().toISOString();

      if (roomName) {
        await adminSupabase
          .from('active_live_streams')
          .update({ is_live: false, admin_terminated: true, ended_at: nowIso })
          .eq('room_name', roomName);
      }
      if (streamId) {
        await adminSupabase
          .from('active_live_streams')
          .update({ is_live: false, admin_terminated: true, ended_at: nowIso })
          .eq('id', streamId);
        await adminSupabase
          .from('live_streams')
          .update({ is_live: false, status: 'ended', admin_terminated: true, ended_at: nowIso })
          .eq('id', streamId);
      }
      if (targetHostId) {
        await adminSupabase
          .from('active_live_streams')
          .update({ is_live: false, admin_terminated: true, ended_at: nowIso })
          .eq('host_user_id', targetHostId);
        await adminSupabase
          .from('live_streams')
          .update({ is_live: false, status: 'ended', admin_terminated: true, ended_at: nowIso })
          .eq('host_id', targetHostId);
      }

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'FORCE_TERMINATE_STREAM',
          payload: {
            streamId,
            roomName,
            hostUserId: targetHostId,
            timestamp: Date.now(),
          },
        });
      } catch (_) {}

      return NextResponse.json({ success: true });
    }

    // -------------------------------------------------------------------------
    // PHASE 5: GROUP CHAT LOCKING & MANAGEMENT
    // -------------------------------------------------------------------------
    if (action === 'FETCH_GROUPS') {
      const [
        { data: chatGroups },
        { data: groupsTbl },
        { data: roomsTbl },
        { data: convsTbl },
      ] = await Promise.all([
        adminSupabase.from('chat_groups').select('*').order('created_at', { ascending: false }).limit(50),
        adminSupabase.from('groups').select('*').order('created_at', { ascending: false }).limit(50),
        adminSupabase.from('rooms').select('*').order('created_at', { ascending: false }).limit(50),
        adminSupabase
          .from('conversations')
          .select('*')
          .eq('is_group', true)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const groupMap = new Map<string, any>();
      const registerGroup = (g: any, sourceTable: string) => {
        if (!g || !g.id) return;
        const existing = groupMap.get(g.id);
        groupMap.set(g.id, {
          ...(existing || {}),
          ...g,
          id: g.id,
          name: g.name || existing?.name || 'Unnamed Group',
          is_locked: Boolean(g.is_locked || existing?.is_locked || g.only_admins_can_send || g.only_admins_message),
          locked_reason:
            g.locked_reason ||
            existing?.locked_reason ||
            '🔒 This group chat has been locked by the Administrator. Only Admins can post right now.',
          created_by: g.created_by || existing?.created_by || null,
          creator_username: g.creator_username || existing?.creator_username || null,
          source_table: existing?.source_table || sourceTable,
        });
      };

      (chatGroups || []).forEach((g) => registerGroup(g, 'chat_groups'));
      (groupsTbl || []).forEach((g) => registerGroup(g, 'groups'));
      (roomsTbl || []).forEach((g) => registerGroup(g, 'rooms'));
      (convsTbl || []).forEach((g) => registerGroup(g, 'conversations'));

      const allGroups = Array.from(groupMap.values());
      const creatorIds = Array.from(
        new Set(
          allGroups
            .map((g) => String(g.created_by || '').trim())
            .filter((id) => /^[0-9a-fA-F-]{36}$/.test(id))
        )
      );

      const profileById: Record<string, any> = {};
      if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await adminSupabase
          .from('profiles')
          .select('id, username, full_name, email')
          .in('id', creatorIds);
        for (const p of creatorProfiles || []) {
          profileById[p.id] = p;
        }
      }

      // Also lookup group_members for any group still missing a creator
      const groupIds = allGroups.map((g) => g.id);
      const adminMemberByGroup: Record<string, string> = {};
      if (groupIds.length > 0) {
        const { data: gMembers } = await adminSupabase
          .from('group_members')
          .select('group_id, user_id, role')
          .in('group_id', groupIds);
        const memberUserIds = Array.from(
          new Set((gMembers || []).map((m: any) => m.user_id).filter(Boolean))
        );
        if (memberUserIds.length > 0) {
          const { data: mProfs } = await adminSupabase
            .from('profiles')
            .select('id, username, full_name, email')
            .in('id', memberUserIds);
          for (const p of mProfs || []) {
            profileById[p.id] = p;
          }
        }
        for (const m of gMembers || []) {
          const prof = profileById[m.user_id];
          const uname =
            prof?.username ||
            prof?.full_name ||
            (prof?.email ? prof.email.split('@')[0] : null);
          if (uname && (!adminMemberByGroup[m.group_id] || m.role === 'admin')) {
            adminMemberByGroup[m.group_id] = uname;
          }
        }
      }

      const enrichedGroups = allGroups.map((g) => {
        const prof = g.created_by ? profileById[String(g.created_by)] : null;
        const resolvedUsername =
          (g.creator_username && g.creator_username !== 'Unknown' ? g.creator_username : null) ||
          prof?.username ||
          prof?.full_name ||
          (prof?.email ? prof.email.split('@')[0] : null) ||
          adminMemberByGroup[g.id] ||
          'Admin';

        return {
          ...g,
          creator_username: String(resolvedUsername).replace(/^@+/, ''),
        };
      });

      return NextResponse.json({ success: true, groups: enrichedGroups });
    }

    if (action === 'TOGGLE_GROUP_LOCK' || action === 'LOCK_GROUP') {
      const { groupId, isLocked, lockedReason } = payload;
      if (!groupId || typeof groupId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
      }

      let nextLocked = typeof isLocked === 'boolean' ? isLocked : true;
      if (typeof isLocked !== 'boolean') {
        const { data: curr } = await adminSupabase
          .from('chat_groups')
          .select('is_locked')
          .eq('id', groupId)
          .maybeSingle();
        if (curr && typeof curr.is_locked === 'boolean') {
          nextLocked = !curr.is_locked;
        }
      }

      const reasonText = nextLocked
        ? lockedReason ||
          '🔒 This group chat has been locked by the Administrator. Only Admins can post right now.'
        : null;

      await Promise.allSettled([
        adminSupabase
          .from('chat_groups')
          .update({
            is_locked: nextLocked,
            locked_reason: reasonText,
            only_admins_can_send: nextLocked,
            only_admins_message: nextLocked,
          })
          .eq('id', groupId),
        adminSupabase
          .from('groups')
          .update({ is_locked: nextLocked, locked_reason: reasonText })
          .eq('id', groupId),
        adminSupabase
          .from('rooms')
          .update({
            is_locked: nextLocked,
            locked_reason: reasonText,
            only_admins_can_send: nextLocked,
            only_admins_message: nextLocked,
          })
          .eq('id', groupId),
        adminSupabase
          .from('conversations')
          .update({
            is_locked: nextLocked,
            locked_reason: reasonText,
            only_admins_can_send: nextLocked,
            only_admins_message: nextLocked,
          })
          .eq('id', groupId),
      ]);

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'GROUP_LOCK_UPDATED',
          payload: {
            groupId,
            is_locked: nextLocked,
            locked_reason: reasonText,
            timestamp: Date.now(),
          },
        });
      } catch (_) {}

      return NextResponse.json({
        success: true,
        groupId,
        is_locked: nextLocked,
        locked_reason: reasonText,
      });
    }

    if (action === 'DELETE_GROUP') {
      const { groupId } = payload;
      if (!groupId || typeof groupId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
      }

      await Promise.allSettled([
        adminSupabase.from('messages').delete().eq('group_id', groupId),
        adminSupabase.from('messages').delete().eq('room_id', groupId),
        adminSupabase.from('group_members').delete().eq('group_id', groupId),
        adminSupabase.from('room_participants').delete().eq('room_id', groupId),
        adminSupabase.from('conversation_participants').delete().eq('conversation_id', groupId),
        adminSupabase.from('group_invites').delete().eq('group_id', groupId),
        adminSupabase.from('group_join_requests').delete().eq('group_id', groupId),
        adminSupabase.from('polls').delete().eq('group_id', groupId),
      ]);

      await Promise.allSettled([
        adminSupabase.from('chat_groups').delete().eq('id', groupId),
        adminSupabase.from('groups').delete().eq('id', groupId),
        adminSupabase.from('rooms').delete().eq('id', groupId),
        adminSupabase.from('conversations').delete().eq('id', groupId),
      ]);

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'GROUP_DELETED',
          payload: { groupId, timestamp: Date.now() },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, deletedGroupId: groupId });
    }

    if (action === 'CLEAR_GROUP_MESSAGES') {
      const { groupId } = payload;
      if (!groupId || typeof groupId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
      }

      await Promise.allSettled([
        adminSupabase.from('messages').delete().eq('group_id', groupId),
        adminSupabase.from('messages').delete().eq('room_id', groupId),
      ]);

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'GROUP_MESSAGES_CLEARED',
          payload: { groupId, timestamp: Date.now() },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, groupId });
    }

    if (action === 'INSPECT_GROUP_MESSAGES') {
      const { groupId } = payload;
      if (!groupId || typeof groupId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid groupId' }, { status: 400 });
      }

      const { data: msgs, error: msgErr } = await adminSupabase
        .from('messages')
        .select('*')
        .or(`group_id.eq.${groupId},room_id.eq.${groupId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (msgErr) {
        return NextResponse.json({ success: false, error: msgErr.message }, { status: 500 });
      }

      const senderIds = Array.from(
        new Set((msgs || []).map((m: any) => m.sender_id).filter(Boolean))
      );
      const senderMap: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: senderProfs } = await adminSupabase
          .from('profiles')
          .select('id, username, full_name, email, avatar_url')
          .in('id', senderIds);
        for (const p of senderProfs || []) {
          senderMap[p.id] = p;
        }
      }

      const enrichedMessages = (msgs || []).map((m: any) => {
        const prof = senderMap[m.sender_id] || {};
        return {
          ...m,
          sender_username:
            m.sender_name || prof.username || prof.full_name || (prof.email ? prof.email.split('@')[0] : 'User'),
          sender_email: prof.email || null,
          sender_avatar: m.sender_avatar || prof.avatar_url || null,
        };
      });

      return NextResponse.json({ success: true, messages: enrichedMessages });
    }

    if (action === 'DELETE_SINGLE_GROUP_MESSAGE') {
      const { messageId } = payload;
      if (!messageId || typeof messageId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid messageId' }, { status: 400 });
      }
      await adminSupabase.from('messages').delete().eq('id', messageId);
      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    // -------------------------------------------------------------------------
    // PHASE 7: FULL 3-PILLAR LICENSE ENFORCER & MASTER USER VAULT
    // -------------------------------------------------------------------------
    if (action === 'FETCH_USERS_VAULT') {
      const { searchTerm = '', filter = 'ALL', limit = 100 } = payload;
      let q = adminSupabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Number(limit) || 100);

      const trimmed = String(searchTerm || '').trim();
      if (trimmed) {
        if (/^[0-9a-fA-F-]{36}$/.test(trimmed)) {
          q = q.eq('id', trimmed);
        } else {
          q = q.or(
            `username.ilike.%${trimmed}%,email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%,affiliate_code.ilike.%${trimmed}%`
          );
        }
      } else {
        if (filter === 'P1_PAID') q = q.eq('has_paid_global_chat', true);
        if (filter === 'P1_UNPAID') q = q.eq('has_paid_global_chat', false);
        if (filter === 'P2_PAID' || filter === 'P2_AFFILIATES') q = q.eq('has_paid_pillar2', true);
        if (filter === 'P2_UNPAID') q = q.eq('has_paid_pillar2', false);
        if (filter === 'P3_PAID') q = q.eq('has_paid_pillar3', true);
        if (filter === 'P3_UNPAID') q = q.eq('has_paid_pillar3', false);
        if (filter === 'FROZEN') q = q.eq('is_wallet_frozen', true);
        if (filter === 'BANNED') q = q.or('is_banned.eq.true,is_suspended.eq.true,status.eq.suspended');
      }

      const { data: users, error } = await q;
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, users: users || [] });
    }

    if (action === 'ADMIN_SET_PILLAR_ACCESS') {
      const { userId, pillar, mode } = payload;
      if (!userId || typeof userId !== 'string' || ![1, 2, 3].includes(Number(pillar)) || !mode) {
        return NextResponse.json(
          { success: false, error: 'Invalid ADMIN_SET_PILLAR_ACCESS payload' },
          { status: 400 }
        );
      }

      const { data: prof } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!prof) {
        return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
      }

      const userEmail = String(prof.email || prof.pillar2_email || '').trim().toLowerCase();
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      let updates: Record<string, any> = { updated_at: nowIso };

      if (Number(pillar) === 1) {
        if (mode === 'grant_free') {
          const ref = `ADMIN_P1_PASS_${nowMs}`;
          updates = {
            ...updates,
            has_paid_global_chat: true,
            is_paid: true,
            global_chat_paystack_ref: ref,
            subscription_tier: 'free',
            is_pro: false,
            is_premium: false,
            subscription_started_at: nowIso,
            subscription_expires_at: null,
          };
          await adminSupabase.from('global_chat_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: 50,
              claimed_by_user_id: userId,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'grant_pro') {
          const ref = `ADMIN_P1_PRO_${nowMs}`;
          const expIso = new Date(nowMs + 30 * 86400000).toISOString();
          updates = {
            ...updates,
            has_paid_global_chat: true,
            is_paid: true,
            global_chat_paystack_ref: ref,
            subscription_tier: 'pro',
            is_pro: true,
            is_premium: false,
            subscription_started_at: nowIso,
            subscription_expires_at: expIso,
          };
          await adminSupabase.from('global_chat_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: 100,
              claimed_by_user_id: userId,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'grant_premium') {
          const ref = `ADMIN_P1_PRM_${nowMs}`;
          const expIso = new Date(nowMs + 365 * 86400000).toISOString();
          updates = {
            ...updates,
            has_paid_global_chat: true,
            is_paid: true,
            global_chat_paystack_ref: ref,
            subscription_tier: 'premium',
            is_pro: true,
            is_premium: true,
            subscription_started_at: nowIso,
            subscription_expires_at: expIso,
          };
          await adminSupabase.from('global_chat_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: 200,
              claimed_by_user_id: userId,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'revoke') {
          updates = {
            ...updates,
            has_paid_global_chat: false,
            is_paid: false,
            global_chat_paystack_ref: null,
            subscription_tier: 'free',
            is_pro: false,
            is_premium: false,
            subscription_started_at: null,
            subscription_expires_at: null,
          };
          await adminSupabase.from('global_chat_passes').delete().eq('claimed_by_user_id', userId);
          if (userEmail) {
            await adminSupabase.from('global_chat_passes').delete().ilike('email', userEmail);
          }
        }
      } else if (Number(pillar) === 2) {
        if (mode === 'grant_1yr') {
          const ref = `ADMIN_P2_1YR_${nowMs}`;
          const expIso = new Date(nowMs + 365 * 86400000).toISOString();
          updates = {
            ...updates,
            has_paid_pillar2: true,
            is_pillar2_paid: true,
            pillar2_paystack_ref: ref,
            pillar2_paid_at: nowIso,
            pillar2_expires_at: expIso,
            license_activated_at: nowIso,
            license_expires_at: expIso,
          };
          await adminSupabase.from('pillar2_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: 90,
              pass_type: 'registration_1yr',
              claimed_by_user_id: userId,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'extend_1yr') {
          const curExp = prof.pillar2_expires_at ? new Date(prof.pillar2_expires_at).getTime() : 0;
          const baseMs = prof.has_paid_pillar2 && curExp > nowMs ? curExp : nowMs;
          const expIso = new Date(baseMs + 365 * 86400000).toISOString();
          const ref = prof.pillar2_paystack_ref || `ADMIN_P2_EXT_${nowMs}`;
          updates = {
            ...updates,
            has_paid_pillar2: true,
            is_pillar2_paid: true,
            pillar2_paystack_ref: ref,
            pillar2_paid_at: prof.pillar2_paid_at || nowIso,
            pillar2_expires_at: expIso,
            license_activated_at: prof.license_activated_at || nowIso,
            license_expires_at: expIso,
          };
          await adminSupabase.from('pillar2_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: 90,
              pass_type: 'registration_1yr',
              claimed_by_user_id: userId,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'force_expire_renewal') {
          const expiredIso = new Date(nowMs - 60000).toISOString();
          const ref = prof.pillar2_paystack_ref || `ADMIN_P2_EXPIRED_${nowMs}`;
          updates = {
            ...updates,
            has_paid_pillar2: false,
            is_pillar2_paid: false,
            pillar2_paystack_ref: ref,
            pillar2_expires_at: expiredIso,
            license_expires_at: expiredIso,
          };
          await adminSupabase.from('pillar2_passes').delete().eq('claimed_by_user_id', userId);
          if (userEmail) {
            await adminSupabase.from('pillar2_passes').delete().ilike('email', userEmail);
          }
        } else if (mode === 'revoke') {
          updates = {
            ...updates,
            has_paid_pillar2: false,
            is_pillar2_paid: false,
            pillar2_paystack_ref: null,
            pillar2_paid_at: null,
            pillar2_expires_at: null,
            license_activated_at: null,
            license_expires_at: null,
          };
          await adminSupabase.from('pillar2_passes').delete().eq('claimed_by_user_id', userId);
          if (userEmail) {
            await adminSupabase.from('pillar2_passes').delete().ilike('email', userEmail);
          }
        }
      } else if (Number(pillar) === 3) {
        if (mode === 'grant_weekly' || mode === 'grant_pro' || mode === 'grant_premium') {
          const days = mode === 'grant_weekly' ? 7 : mode === 'grant_pro' ? 30 : 365;
          const tier = mode === 'grant_weekly' ? 'weekly' : mode === 'grant_pro' ? 'pro' : 'premium';
          const amt = mode === 'grant_weekly' ? 50 : mode === 'grant_pro' ? 100 : 200;
          const ref = `ADMIN_P3_${tier.toUpperCase()}_${nowMs}`;
          const curExp = prof.pillar3_expires_at ? new Date(prof.pillar3_expires_at).getTime() : 0;
          const baseMs = prof.has_paid_pillar3 && curExp > nowMs ? curExp : nowMs;
          const expIso = new Date(baseMs + days * 86400000).toISOString();

          updates = {
            ...updates,
            has_paid_pillar3: true,
            pillar3_tier: tier,
            pillar3_paystack_ref: ref,
            pillar3_started_at: prof.pillar3_started_at || nowIso,
            pillar3_expires_at: expIso,
          };
          await adminSupabase.from('pillar3_passes').upsert(
            {
              paystack_reference: ref,
              email: userEmail || `user_${userId}@earnmega.com`,
              amount_ghs: amt,
              plan_tier: tier,
              duration_days: days,
              user_id: userId,
              claimed_by_user_id: userId,
              claimed: true,
            },
            { onConflict: 'paystack_reference' }
          );
        } else if (mode === 'revoke') {
          const expiredIso = new Date(nowMs - 60000).toISOString();
          updates = {
            ...updates,
            has_paid_pillar3: false,
            pillar3_tier: 'none',
            pillar3_paystack_ref: null,
            pillar3_expires_at: expiredIso,
          };
          await adminSupabase.from('pillar3_passes').delete().eq('user_id', userId);
          await adminSupabase.from('pillar3_passes').delete().eq('claimed_by_user_id', userId);
          if (userEmail) {
            await adminSupabase.from('pillar3_passes').delete().ilike('email', userEmail);
          }
        }
      }

      const { data: updatedUser, error: updErr } = await adminSupabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .single();

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'USER_ENFORCEMENT_UPDATED',
          payload: {
            userId,
            pillar: Number(pillar),
            mode,
            profile: updatedUser,
            timestamp: Date.now(),
          },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    // -------------------------------------------------------------------------
    // EXISTING ADMIN ACTIONS (WARNINGS, BALANCES, BANS, PAYOUTS, CONTESTS)
    // -------------------------------------------------------------------------
    if (action === 'SEND_WARNING_EMAIL') {
      const { email, warningText, reason, strikeCount } = payload;

      if (resend) {
        await resend.emails.send({
          from: 'HorPal Trust & Safety <safety@horpal.com>',
          to: email,
          bcc: 'horpalservice@gmail.com',
          subject: '[URGENT] Official HorPal Administrative Warning',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050811; color: #fff; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
              <h2 style="color: #ef4444; text-align: center; text-transform: uppercase;">⚠️ Official Warning Strike</h2>
              <p>This is an official administrative warning regarding your HorPal account.</p>
              <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Message:</strong> ${warningText}</p>
                <p><strong>Total Strikes:</strong> ${strikeCount}</p>
              </div>
              <p>Failure to comply with HorPal Community Guidelines may result in immediate account suspension or financial freeze.</p>
              <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
                HorPal Trust & Safety Team<br/>
                If you believe this was an error, please contact horpalservice@gmail.com
              </p>
            </div>
          `,
        });
      }
      return NextResponse.json({ success: true, message: 'Warning email sent' });
    }

    if (action === 'SEND_PAYOUT_OTP') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      if (resend) {
        await resend.emails.send({
          from: 'HorPal Admin Ops <admin@horpal.com>',
          to: 'horpalservice@gmail.com',
          subject: `Admin Payout OTP: ${otp}`,
          html: `
            <h2>Friday Payout Authorization</h2>
            <p>Your one-time password to approve payouts is: <strong style="font-size: 24px;">${otp}</strong></p>
          `,
        });
      }
      return NextResponse.json({ success: true, otp, message: 'OTP dispatched' });
    }

    if (action === 'ADMIN_ALERT') {
      const { message, level = 'info' } = payload;
      if (resend) {
        await resend.emails.send({
          from: 'HorPal System Alerts <alerts@horpal.com>',
          to: 'horpalservice@gmail.com',
          subject: `[Admin Alert - ${level.toUpperCase()}] New System Event`,
          html: `<p><strong>Alert:</strong> ${message}</p>`,
        });
      }
      return NextResponse.json({ success: true, message: 'Alert sent' });
    }

    if (action === 'UPDATE_USER_ROLES') {
      const { userId, updates } = payload;
      const { data, error } = await adminSupabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'USER_ENFORCEMENT_UPDATED',
          payload: { userId, profile: data, timestamp: Date.now() },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: data });
    }

    if (action === 'UPDATE_USER_BALANCE') {
      const { userId, type, actionType, amount } = payload;
      if (!userId || typeof userId !== 'string' || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid balance request' });
      }

      const { data: user } = await adminSupabase.from('profiles').select('*').eq('id', userId).single();
      if (!user) return NextResponse.json({ success: false, error: 'User not found' });

      const updates: any = { updated_at: new Date().toISOString() };
      if (type === 'ghs') {
        const curGhs = Math.max(Number(user.affiliate_balance || 0), Number(user.available_balance_ghs || 0));
        const nextGhs = actionType === 'add' ? curGhs + amount : Math.max(0, curGhs - amount);
        updates.available_balance_ghs = nextGhs;
        updates.affiliate_balance = nextGhs;
      } else if (type === 'coins') {
        const curCoins = Math.max(Number(user.coin_balance || 0), Number(user.coins || 0));
        const nextCoins = actionType === 'add' ? curCoins + amount : Math.max(0, curCoins - amount);
        updates.coin_balance = nextCoins;
        updates.coins = nextCoins;
      }

      const { data, error } = await adminSupabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;

      try {
        await adminSupabase.from('wallet_transactions').insert([
          {
            user_id: userId,
            type: type === 'ghs' ? 'ADMIN_GHS_ADJUST' : 'ADMIN_COIN_ADJUST',
            status: 'completed',
            amount_ghs: type === 'ghs' ? (actionType === 'add' ? amount : -amount) : null,
            coin_amount: type === 'coins' ? (actionType === 'add' ? amount : -amount) : null,
            description: `Admin balance override: ${actionType} ${amount} ${type}`,
          },
        ]);
      } catch (_) {}

      return NextResponse.json({ success: true, user: data });
    }

    if (action === 'BAN_USER') {
      const { userId } = payload;
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid userId' });
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update({
          is_banned: true,
          is_suspended: true,
          status: 'suspended',
          is_wallet_frozen: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'ACCOUNT_SUSPENDED',
          payload: { target: userId, is_banned: true, profile: updatedUser },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'UNBAN_USER') {
      const { userId } = payload;
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid userId' });
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update({
          is_banned: false,
          is_suspended: false,
          status: 'active',
          is_wallet_frozen: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'ACCOUNT_RESTORED',
          payload: { target: userId, profile: updatedUser },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'SUSPEND_USER') {
      const { userId } = payload;
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid userId' });
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update({
          is_suspended: true,
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'ACCOUNT_SUSPENDED',
          payload: { target: userId, is_suspended: true, profile: updatedUser },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'UNSUSPEND_USER') {
      const { userId } = payload;
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid userId' });
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update({
          is_suspended: false,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'ACCOUNT_RESTORED',
          payload: { target: userId, profile: updatedUser },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'FREEZE_WALLET') {
      const { userId, isFrozen } = payload;
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid userId' });
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update({ is_wallet_frozen: Boolean(isFrozen), updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .maybeSingle();
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'UPDATE_LICENSE') {
      const { userId, type } = payload;
      if (!userId || typeof userId !== 'string' || !type) {
        return NextResponse.json({ success: false, error: 'Invalid request' });
      }
      const { data: existingProf } = await adminSupabase
        .from('profiles')
        .select('pillar2_paystack_ref')
        .eq('id', userId)
        .maybeSingle();
      let updates: any = { updated_at: new Date().toISOString() };
      if (type === 'expire') {
        const expiredIso = new Date(Date.now() - 60000).toISOString();
        updates = {
          ...updates,
          has_paid_pillar2: false,
          is_pillar2_paid: false,
          pillar2_paystack_ref: existingProf?.pillar2_paystack_ref || `ADMIN_EXPIRED_${Date.now()}`,
          pillar2_expires_at: expiredIso,
          license_expires_at: expiredIso,
        };
      } else if (type === 'extend') {
        const extendedIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        updates = {
          ...updates,
          has_paid_pillar2: true,
          is_pillar2_paid: true,
          pillar2_expires_at: extendedIso,
          license_expires_at: extendedIso,
          pillar2_paystack_ref: existingProf?.pillar2_paystack_ref || `ADMIN_EXTEND_${Date.now()}`,
        };
      }
      const { data: updatedUser } = await adminSupabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      try {
        await adminSupabase.channel('horpal_godmode_command').send({
          type: 'broadcast',
          event: 'USER_ENFORCEMENT_UPDATED',
          payload: { userId, pillar: 2, mode: type, profile: updatedUser, timestamp: Date.now() },
        });
      } catch (_) {}

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === 'GOD_VOICE_WARNING') {
      const { target, level, message } = payload;
      if (!target || !level || !message) {
        return NextResponse.json({ success: false, error: 'Invalid payload' });
      }

      if (
        target &&
        target !== 'ALL' &&
        target !== 'PILLAR_1' &&
        target !== 'PILLAR_2' &&
        !target.includes('@') &&
        /^[0-9a-fA-F-]{36}$/.test(target)
      ) {
        try {
          await adminSupabase.from('notifications').insert([
            {
              recipient_id: target,
              type: 'GOD_VOICE_WARNING',
              message: message,
              read: false,
            },
          ]);
        } catch (_) {}
      }

      await adminSupabase.channel('horpal_godmode_command').send({
        type: 'broadcast',
        event: 'GOD_VOICE_WARNING',
        payload: { target, level, message, timestamp: Date.now() },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'GET_SUBSCRIPTION_ALERTS') {
      const { data: alerts } = await adminSupabase
        .from('admin_subscription_alerts')
        .select('*')
        .order('expired_at', { ascending: false });
      return NextResponse.json({ success: true, alerts: alerts || [] });
    }

    if (action === 'FORCE_DOWNGRADE_USER') {
      const { userId, alertId } = payload;
      if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' });

      await adminSupabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          is_pro: false,
          is_premium: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (alertId) {
        await adminSupabase
          .from('admin_subscription_alerts')
          .update({
            admin_acknowledged: true,
            action_taken: 'force_downgraded_by_admin',
          })
          .eq('id', alertId);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'MANAGE_PILLAR3_ACCESS') {
      const { userId, alertId, mode, days } = payload;
      if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' });

      if (mode === 'revoke') {
        const { error: revErr } = await adminSupabase
          .from('profiles')
          .update({
            has_paid_pillar3: false,
            pillar3_tier: 'none',
            pillar3_paystack_ref: null,
            pillar3_expires_at: new Date(Date.now() - 60000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (revErr) return NextResponse.json({ success: false, error: revErr.message });
      } else if (mode === 'extend') {
        const addDays = [7, 30, 365].includes(Number(days)) ? Number(days) : 0;
        if (!addDays) return NextResponse.json({ success: false, error: 'Invalid days (7, 30 or 365)' });

        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('has_paid_pillar3, pillar3_expires_at, pillar3_started_at, pillar3_paystack_ref')
          .eq('id', userId)
          .maybeSingle();

        const nowMs = Date.now();
        const curExp = prof?.pillar3_expires_at ? new Date(prof.pillar3_expires_at).getTime() : 0;
        const baseMs = prof?.has_paid_pillar3 && curExp > nowMs ? curExp : nowMs;
        const newExp = new Date(baseMs + addDays * 86400000).toISOString();
        const tier = addDays === 7 ? 'weekly' : addDays === 30 ? 'pro' : 'premium';

        const { error: extErr } = await adminSupabase
          .from('profiles')
          .update({
            has_paid_pillar3: true,
            pillar3_tier: tier,
            pillar3_started_at: prof?.pillar3_started_at || new Date(nowMs).toISOString(),
            pillar3_expires_at: newExp,
            pillar3_paystack_ref: prof?.pillar3_paystack_ref || `ADMIN_EXTEND_${nowMs}`,
            updated_at: new Date(nowMs).toISOString(),
          })
          .eq('id', userId);
        if (extErr) return NextResponse.json({ success: false, error: extErr.message });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid mode' });
      }

      if (alertId) {
        await adminSupabase
          .from('admin_subscription_alerts')
          .update({
            admin_acknowledged: true,
            action_taken: mode === 'revoke' ? 'pillar3_revoked_by_admin' : 'pillar3_extended_by_admin',
          })
          .eq('id', alertId);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'BULK_FORCE_DOWNGRADE') {
      const { userIds, alertIds } = payload;
      if (Array.isArray(userIds) && userIds.length > 0) {
        await adminSupabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            is_pro: false,
            is_premium: false,
            updated_at: new Date().toISOString(),
          })
          .in('id', userIds);
      }

      if (Array.isArray(alertIds) && alertIds.length > 0) {
        await adminSupabase
          .from('admin_subscription_alerts')
          .update({
            admin_acknowledged: true,
            action_taken: 'bulk_downgraded_by_admin',
          })
          .in('id', alertIds);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'FETCH_P2_PAYOUT_REQUESTS') {
      const { data, error } = await adminSupabase
        .from('pillar2_payout_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, requests: data || [] });
    }

    if (action === 'UPDATE_P2_PAYOUT_STATUS') {
      const { requestId, status, adminNote } = payload || {};
      if (!requestId || !['processing', 'paid', 'rejected'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid payout update payload' }, { status: 400 });
      }
      const { data: rpcData, error: rpcErr } = await adminSupabase.rpc('admin_update_pillar2_payout_rpc', {
        p_request_id: requestId,
        p_next_status: status,
        p_admin_note: typeof adminNote === 'string' && adminNote.trim() ? adminNote.trim() : null,
      });
      if (rpcErr || !rpcData?.success) {
        return NextResponse.json(
          { success: false, error: rpcErr?.message || rpcData?.error || 'Failed to update payout status' },
          { status: 400 }
        );
      }
      const updatedReq = rpcData.request;
      if (updatedReq?.user_id) {
        const titleMap: Record<string, string> = {
          processing: `🔵 Payout Processing: GH₵ ${Number(updatedReq.amount_ghs || 0).toFixed(2)}`,
          paid: `🟢 Payout Settled: GH₵ ${Number(updatedReq.amount_ghs || 0).toFixed(2)}`,
          rejected: `🔴 Payout Declined & Refunded: GH₵ ${Number(updatedReq.amount_ghs || 0).toFixed(2)}`,
        };
        try {
          await adminSupabase.from('affiliate_notifications').insert({
            user_id: updatedReq.user_id,
            title: titleMap[status] || 'Payout Status Updated',
            subtitle: updatedReq.admin_status_note || `Updated by Admin (${status})`,
            amount_ghs: status === 'rejected' ? Number(updatedReq.amount_ghs || 0) : 0,
            read: false,
          });
        } catch (_) {}
      }
      return NextResponse.json({
        success: true,
        request: updatedReq,
        affiliate_balance: rpcData.affiliate_balance,
        affiliate_withdrawn: rpcData.affiliate_withdrawn,
      });
    }

    if (action === 'FETCH_P2_CONTEST_SUBMISSIONS') {
      const { data, error } = await adminSupabase
        .from('pillar2_contest_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, submissions: data || [] });
    }

    if (action === 'UPDATE_P2_CONTEST_STATUS') {
      const { submissionId, status, adminNote } = payload || {};
      if (!submissionId || !['pending_review', 'processing', 'approved_winner', 'rejected'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid contest status update payload' }, { status: 400 });
      }
      const defaultNotes: Record<string, string> = {
        pending_review: 'Queued for Admin review',
        processing: 'Verification in progress by Admin team',
        approved_winner: 'Congratulations! Verified & Approved Contest Winner',
        rejected: 'Declined — did not meet contest qualification requirements',
      };
      const nextNote = typeof adminNote === 'string' && adminNote.trim() ? adminNote.trim() : defaultNotes[status];
      const { data: updatedSub, error: subErr } = await adminSupabase
        .from('pillar2_contest_submissions')
        .update({
          status,
          admin_note: nextNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select('*')
        .single();
      if (subErr || !updatedSub) {
        return NextResponse.json({ success: false, error: subErr?.message || 'Failed to update submission' }, { status: 400 });
      }
      if (updatedSub.user_id) {
        const titleMap: Record<string, string> = {
          processing: `🔄 Contest Entry Processing: ${updatedSub.contest_title}`,
          approved_winner: `🏆 Approved Winner! ${updatedSub.contest_title}`,
          rejected: `❌ Contest Entry Declined: ${updatedSub.contest_title}`,
          pending_review: `⏳ Contest Entry Under Review: ${updatedSub.contest_title}`,
        };
        try {
          await adminSupabase.from('affiliate_notifications').insert({
            user_id: updatedSub.user_id,
            title: titleMap[status] || 'Contest Status Updated',
            subtitle: nextNote,
            amount_ghs: 0,
            read: false,
          });
        } catch (_) {}
      }
      return NextResponse.json({ success: true, submission: updatedSub });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin API Action Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
