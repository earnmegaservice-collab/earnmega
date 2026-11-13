import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body || {};

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID for balance deduction.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.rpc('renew_pillar2_license_from_balance_rpc', {
      p_user_id: userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Insufficient verified affiliate balance (GH₵ 45.00 required).' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      new_balance: Number(data.new_balance ?? 0),
      pillar2_expires_at: data.pillar2_expires_at,
    });
  } catch (err: any) {
    console.error('Pillar 2 balance renewal error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error renewing license from balance.' },
      { status: 500 }
    );
  }
}
