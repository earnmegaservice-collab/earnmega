import { NextResponse } from 'next/server';
import { getAdminClient, paywallErrorResponse, requireAuthedUser } from '../../../../lib/server/paywall';

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    const { data, error } = await admin.rpc('sync_pillar2_license_expiry_rpc', {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Could not sync Pillar 2 license expiry.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pillar2_expires_at: data.pillar2_expires_at,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
