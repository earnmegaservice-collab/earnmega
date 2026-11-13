import { NextResponse } from 'next/server';
import { paywallErrorResponse, processPillarPayment } from '../../../../lib/server/paywall';

// Pillar 3 (Earnmega AI Studio: GH₵ 50 weekly / GH₵ 100 monthly / GH₵ 200 annual).
// The tier is derived from the amount Paystack actually charged - never from the client.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processPillarPayment({ request, pillar: 3, reference: body?.reference });
    const e: any = result.entitlements || {};
    return NextResponse.json({
      ...result,
      has_paid_pillar3: Boolean(e.has_paid_pillar3),
      pillar3_tier: e.pillar3_tier || result.planTier,
      pillar3_expires_at: e.pillar3_expires_at || null,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
