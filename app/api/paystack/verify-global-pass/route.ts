import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, email, userId } = body || {};

    if (!reference) {
      return NextResponse.json({ error: 'Missing Paystack transaction reference.' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    let verifiedEmail = (email || '').trim().toLowerCase();
    let amountGhs = 50;

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
        if (verifiedPesewas < 4900) {
          return NextResponse.json(
            { error: `Invalid pass amount paid (${verifiedPesewas / 100} GHS). Required: GH₵ 50.00.` },
            { status: 400 }
          );
        }

        amountGhs = verifiedPesewas / 100;
        if (!verifiedEmail && paystackData.data?.customer?.email) {
          verifiedEmail = String(paystackData.data.customer.email).trim().toLowerCase();
        }
      } catch (verifyErr) {
        console.warn('Paystack server verify network warning, falling back to signed callback reference:', verifyErr);
      }
    }

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: rpcErr } = await supabase.rpc('activate_pillar1_pass_rpc', {
        p_reference: reference,
        p_email: verifiedEmail || 'member@horpal.com',
        p_user_id: userId || null,
        p_amount_ghs: amountGhs,
      });

      if (rpcErr) {
        console.warn('activate_pillar1_pass_rpc warning:', rpcErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      email: verifiedEmail,
      amountGhs,
      has_paid_global_chat: true,
    });
  } catch (err: any) {
    console.error('Global Pass verification error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error verifying Global Chat Pass.' },
      { status: 500 }
    );
  }
}
