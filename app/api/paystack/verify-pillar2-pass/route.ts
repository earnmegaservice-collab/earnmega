import { NextResponse } from 'next/server';
import { paywallErrorResponse, processPillarPayment } from '../../../../lib/server/paywall';

// Pillar 2 (Affiliate & Creator Hub, GH₵ 90.00 / GH₵ 45.00 renewal). Verified live against Paystack; fails closed.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processPillarPayment({ request, pillar: 2, reference: body?.reference });
    const e: any = result.entitlements || {};
    return NextResponse.json({
      ...result,
      has_paid_pillar2: Boolean(e.has_paid_pillar2),
      pillar2_paid_at: new Date().toISOString(),
      pillar2_expires_at: e.pillar2_expires_at || null,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
