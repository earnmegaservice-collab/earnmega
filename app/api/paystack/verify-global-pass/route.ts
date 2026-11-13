import { NextResponse } from 'next/server';
import { paywallErrorResponse, processPillarPayment } from '../../../../lib/server/paywall';

// Pillar 1 (Global Chat, GH₵ 50.00). Verified live against Paystack; fails closed.
// The account is taken from the Bearer token only - a `userId` in the body is ignored.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processPillarPayment({ request, pillar: 1, reference: body?.reference });
    return NextResponse.json({
      ...result,
      has_paid_global_chat: Boolean(result.entitlements?.has_paid_global_chat),
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
