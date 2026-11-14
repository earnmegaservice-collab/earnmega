import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Admin Keys');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('room_name');
    const hostUserId = searchParams.get('host_user_id');

    if (roomName) {
      const { data } = await adminSupabase
        .from('active_live_streams')
        .select('*')
        .eq('room_name', roomName)
        .maybeSingle();
      return NextResponse.json({ success: true, stream: data || null });
    }

    if (hostUserId) {
      const { data } = await adminSupabase
        .from('active_live_streams')
        .select('*')
        .eq('host_user_id', hostUserId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return NextResponse.json({ success: true, stream: data || null });
    }

    // Also mark streams with no heartbeat for > 2 minutes as ended if they were abandoned
    const staleCutoff = new Date(Date.now() - 120 * 1000).toISOString();
    await adminSupabase
      .from('active_live_streams')
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq('is_live', true)
      .lt('last_heartbeat_at', staleCutoff);

    const { data: activeStreams } = await adminSupabase
      .from('active_live_streams')
      .select('*')
      .eq('is_live', true)
      .order('started_at', { ascending: false });

    return NextResponse.json({
      success: true,
      streams: activeStreams || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query active streams' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminSupabase = getAdminSupabase();
    const body = await request.json();
    const { action } = body;

    if (action === 'START' || action === 'HEARTBEAT') {
      const {
        room_name,
        host_user_id,
        host_username,
        host_email,
        host_avatar,
        stream_title,
        viewer_count,
        coins_earned,
      } = body;

      if (!room_name || !host_user_id) {
        return NextResponse.json(
          { success: false, error: 'Missing room_name or host_user_id' },
          { status: 400 }
        );
      }

      // Check if global disable_live_streams is active when starting a new stream
      if (action === 'START') {
        const { data: settings } = await adminSupabase
          .from('platform_settings')
          .select('disable_live_streams, lock_pillar1, maintenance_mode')
          .eq('id', 1)
          .maybeSingle();

        if (settings?.disable_live_streams || settings?.lock_pillar1 || settings?.maintenance_mode) {
          return NextResponse.json(
            {
              success: false,
              blocked: true,
              error: '📵 Live streaming is temporarily disabled by the Administrator.',
            },
            { status: 403 }
          );
        }
      }

      // If HEARTBEAT, first check if admin already force-terminated this stream!
      if (action === 'HEARTBEAT') {
        const { data: existing } = await adminSupabase
          .from('active_live_streams')
          .select('is_live, admin_terminated, admin_warning_message')
          .eq('room_name', room_name)
          .maybeSingle();

        if (existing && (existing.admin_terminated || existing.is_live === false)) {
          return NextResponse.json({
            success: true,
            terminated: true,
            warningMessage: existing.admin_warning_message || null,
          });
        }
      }

      // Resolve email/username/avatar from profiles if missing
      let resolvedEmail = host_email || null;
      let resolvedUsername = host_username || 'Creator';
      let resolvedAvatar = host_avatar || null;

      if (!resolvedEmail || resolvedUsername === 'Creator') {
        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('username, email, avatar_url')
          .eq('id', host_user_id)
          .maybeSingle();
        if (prof) {
          resolvedEmail = resolvedEmail || prof.email || null;
          resolvedUsername =
            host_username && host_username !== 'Creator'
              ? host_username
              : prof.username || (prof.email ? prof.email.split('@')[0] : 'Creator');
          resolvedAvatar = resolvedAvatar || prof.avatar_url || null;
        }
      }

      const nowIso = new Date().toISOString();
      const upsertPayload: Record<string, any> = {
        room_name,
        host_user_id,
        host_username: resolvedUsername,
        host_email: resolvedEmail,
        host_avatar: resolvedAvatar,
        stream_title: stream_title || 'Live on EarnMega 🔥',
        viewer_count: typeof viewer_count === 'number' ? Math.max(1, viewer_count) : 1,
        coins_earned: typeof coins_earned === 'number' ? Math.max(0, coins_earned) : 0,
        is_live: true,
        last_heartbeat_at: nowIso,
      };

      if (action === 'START') {
        upsertPayload.started_at = nowIso;
        upsertPayload.ended_at = null;
        upsertPayload.admin_terminated = false;
        upsertPayload.admin_warning_message = null;
      }

      const { data: streamRow, error } = await adminSupabase
        .from('active_live_streams')
        .upsert(upsertPayload, { onConflict: 'room_name' })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        stream: streamRow,
        terminated: Boolean(streamRow?.admin_terminated || streamRow?.is_live === false),
        warningMessage: streamRow?.admin_warning_message || null,
      });
    }

    if (action === 'STOP') {
      const { room_name, host_user_id } = body;
      const nowIso = new Date().toISOString();

      if (room_name) {
        await adminSupabase
          .from('active_live_streams')
          .update({ is_live: false, ended_at: nowIso })
          .eq('room_name', room_name);
      } else if (host_user_id) {
        await adminSupabase
          .from('active_live_streams')
          .update({ is_live: false, ended_at: nowIso })
          .eq('host_user_id', host_user_id)
          .eq('is_live', true);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'CLEAR_WARNING') {
      const { room_name } = body;
      if (room_name) {
        await adminSupabase
          .from('active_live_streams')
          .update({ admin_warning_message: null })
          .eq('room_name', room_name);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update active live stream' },
      { status: 500 }
    );
  }
}
