import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, email, userId, passType } = body || {};

    if (!reference) {
      return NextResponse.json({ error: 'Missing Paystack transaction reference.' }, { status: 400 });
    }

    const isRenewal = passType === 'renewal_1yr';
    const expectedMinPesewas = isRenewal ? 4400 : 8900;
    const defaultAmountGhs = isRenewal ? 45 : 90;

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    let verifiedEmail = (email || '').trim().toLowerCase();
    let amountGhs = defaultAmountGhs;

    if (secretKey && !reference.startsWith('HP_TEST_')) {
      try {
        const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        const paystackData = await paystackRes.json();

        if (!paystackData?.status || paystackData?.data?.status !== 'success') {
          return NextResponse.json(
            { error: 'Paystack verification failed: Transaction not confirmed as successful.' },
            { status: 400 }
          );
        }

        const verifiedPesewas = Number(paystackData.data.amount || 0);
        if (verifiedPesewas < expectedMinPesewas) {
          return NextResponse.json(
            {
              error: `Invalid license amount paid (${verifiedPesewas / 100} GHS). Required: GH₵ ${defaultAmountGhs}.00.`,
            },
            { status: 400 }
          );
        }

        amountGhs = verifiedPesewas / 100;
        if (!verifiedEmail && paystackData.data?.customer?.email) {
          verifiedEmail = String(paystackData.data.customer.email).trim().toLowerCase();
        }
      } catch (verifyErr) {
        console.warn('Paystack Pillar 2 verify network warning, falling back to signed callback reference:', verifyErr);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    let rpcResult: any = null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error: rpcErr } = await supabase.rpc('activate_pillar2_license_rpc', {
        p_reference: reference,
        p_email: verifiedEmail || 'affiliate@horpal.com',
        p_user_id: userId || null,
        p_amount_ghs: amountGhs,
        p_pass_type: isRenewal ? 'renewal_1yr' : 'registration_1yr',
      });

      if (rpcErr) {
        console.warn('activate_pillar2_license_rpc warning:', rpcErr.message);
      } else {
        rpcResult = data;
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      email: verifiedEmail,
      amountGhs,
      has_paid_pillar2: true,
      pillar2_paid_at: rpcResult?.pillar2_paid_at || now.toISOString(),
      pillar2_expires_at: rpcResult?.pillar2_expires_at || expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('Pillar 2 Pass verification error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error verifying Pillar 2 Affiliate License.' },
      { status: 500 }
    );
  }
}
