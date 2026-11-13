import { NextResponse } from 'next/server';
import { PaywallError, paywallErrorResponse, processPillarPayment } from '../../../../lib/server/paywall';

// PHASE 6 - "Paid via Paystack but account still locked? Enter Paystack Reference".
// Verifies the reference live against Paystack, confirms the exact amount AND pillar metadata,
// refuses references already claimed by another user (or used for another pillar), then binds it
// to the signed-in account (Bearer token) for that single pillar.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pillar = Number(body?.pillar);
    if (pillar !== 1 && pillar !== 2 && pillar !== 3) {
      throw new PaywallError(400, 'Please choose which pillar this payment was for (1, 2 or 3).');
    }
    const result = await processPillarPayment({
      request,
      pillar,
      reference: body?.reference,
      requireAuth: true,
      strictMetadata: true,
    });
    return NextResponse.json(result);
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
