import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_service_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: Request) {
  try {
    const { reference, email, userId } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 1. Verify with Paystack API when secret key is present
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    let verifiedAmountGHS = 50;

    if (paystackSecretKey && paystackSecretKey !== 'sk_test_placeholder') {
      try {
        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          }
        );
        const data = await response.json();
        if (!data.status || data.data?.status !== 'success') {
          return NextResponse.json({ error: 'Paystack payment verification failed' }, { status: 400 });
        }
        verifiedAmountGHS = (data.data?.amount || 5000) / 100;
      } catch (verifyErr) {
        console.error('Paystack API network error in verify-global-pass:', verifyErr);
        return NextResponse.json({ error: 'Paystack verification error' }, { status: 400 });
      }
    }

    // 2. Insert or update global_chat_passes record
    const { data: passData, error: passErr } = await supabase
      .from('global_chat_passes')
      .upsert(
        {
          paystack_reference: reference,
          email: email || null,
          amount_ghs: verifiedAmountGHS,
          claimed_by_user_id: userId || null,
        },
        { onConflict: 'paystack_reference' }
      )
      .select()
      .single();

    if (passErr) {
      console.error('Failed to record global chat pass:', passErr);
    }

    // 3. If userId is provided, mark user profile as paid
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          has_paid_global_chat: true,
          global_chat_paystack_ref: reference,
          is_paid: true,
        })
        .eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      reference,
      pass: passData,
    });
  } catch (err: any) {
    console.error('verify-global-pass exception:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
