import { NextResponse } from 'next/server';
import { getAdminClient, paywallErrorResponse, requireAuthedUser } from '../../../../lib/server/paywall';

// Renew Pillar 2 from the signed-in user's own verified affiliate balance (GH₵ 45.00).
// The account is taken from the Bearer token - a `userId` in the body is never trusted.
export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    const { data, error } = await admin.rpc('renew_pillar2_license_from_balance_rpc', {
      p_user_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
