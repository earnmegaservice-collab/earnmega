import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

    // Verify with Paystack API
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const amountGHS = data.data.amount / 100;
    const metadata = data.data.metadata || {};
    const userId = metadata.user_id;

    if (!userId || metadata.payment_type !== 'WALLET_DEPOSIT') {
        // Just return success if it's not a wallet deposit to avoid errors on client, webhook handles other stuff
        return NextResponse.json({ success: true, status: 'ignored_by_deposit_verifier' });
    }

    // Idempotency check against wallet_transactions
    const { data: existingTx } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference', reference)
      .in('status', ['completed', 'verified', 'VERIFIED'])
      .single();

    if (existingTx) {
      return NextResponse.json({ status: 'already_processed', success: true }, { status: 200 });
    }

    // Fulfill deposit
    const { data: prof } = await supabase.from('profiles').select('available_balance_ghs, affiliate_balance').eq('id', userId).single();

    if (prof) {
      const currentBal = Number(prof.available_balance_ghs || prof.affiliate_balance || 0);

      const { error: updateError } = await supabase.from('profiles').update({
        available_balance_ghs: currentBal + amountGHS,
        affiliate_balance: currentBal + amountGHS
      }).eq('id', userId);

      if (updateError) throw updateError;

      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        reference: reference,
        type: 'deposit',
        amount: amountGHS,
        status: 'completed',
        created_at: new Date().toISOString()
      });

      try {
        await supabase.from('wallet_deposits').insert({
          user_id: userId,
          reference: reference,
          amount: amountGHS,
          amount_ghs: amountGHS,
          status: 'VERIFIED',
          created_at: new Date().toISOString()
        });
      } catch (_) {}
    }

    return NextResponse.json({ success: true, amount: amountGHS });
  } catch (error: any) {
    console.error('Error verifying deposit payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
