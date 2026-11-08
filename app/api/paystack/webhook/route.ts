import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  if (reference) {
    return NextResponse.redirect(new URL(`/?payment_ref=${reference}`, req.url));
  }

  return NextResponse.json({ status: 'ok' });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = req.headers.get('x-paystack-signature');

    if (!secret) {
      console.warn("PAYSTACK_SECRET_KEY not set");
    }

    const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (!signature || signature !== expectedHash) {
      return NextResponse.json({ error: 'Invalid Paystack signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const amountGHS = data.amount / 100;
      const customerEmail = data.customer?.email;
      const metadata = data.metadata || {};

      const paymentType = metadata.payment_type || '';
      const userId = metadata.user_id;

      // Idempotency check in both tables
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference', reference)
        .in('status', ['completed', 'verified', 'VERIFIED'])
        .single();

      if (existingTx) {
        return NextResponse.json({ status: 'already_processed' }, { status: 200 });
      }

      const { data: existingSale } = await supabase
        .from('affiliate_sales')
        .select('id')
        .eq('paystack_reference', reference)
        .in('status', ['completed', 'verified', 'VERIFIED'])
        .single();

      if (existingSale) {
        return NextResponse.json({ status: 'already_processed' }, { status: 200 });
      }

      // Fulfillment routing
      if (paymentType === 'P1_REGISTRATION') {
        if (userId) {
          await supabase.from('profiles').update({ is_paid: true }).eq('id', userId);
        } else if (customerEmail) {
          await supabase.from('profiles').update({ is_paid: true }).eq('email', customerEmail);
        }
      }
      else if (paymentType === 'COIN_PURCHASE') {
        if (userId) {
          const coinsAmount = Number(metadata.coins_amount || 0);
          const { data: prof } = await supabase.from('profiles').select('coin_balance, coins').eq('id', userId).single();
          if (prof) {
             const currentCoins = prof.coin_balance || prof.coins || 0;
             await supabase.from('profiles').update({ coin_balance: currentCoins + coinsAmount, coins: currentCoins + coinsAmount }).eq('id', userId);
          }
        }
      }
      else if (paymentType === 'P2_LICENSE' || paymentType === 'P2_RENEWAL') {
        if (userId) {
          const { data: prof } = await supabase.from('profiles').select('pillar2_expires_at').eq('id', userId).single();
          let currentExpiry = Date.now();
          if (prof && prof.pillar2_expires_at && new Date(prof.pillar2_expires_at).getTime() > Date.now()) {
            currentExpiry = new Date(prof.pillar2_expires_at).getTime();
          }
          const newExpiry = new Date(currentExpiry + 365 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('profiles').update({ is_pillar2_paid: true, pillar2_expires_at: newExpiry }).eq('id', userId);
        }
      }
      else if (paymentType === 'WALLET_DEPOSIT') {
        if (userId) {
          const { data: prof } = await supabase.from('profiles').select('available_balance_ghs, affiliate_balance').eq('id', userId).single();
          if (prof) {
            const currentBal = Number(prof.available_balance_ghs || prof.affiliate_balance || 0);
            await supabase.from('profiles').update({
              available_balance_ghs: currentBal + amountGHS,
              affiliate_balance: currentBal + amountGHS
            }).eq('id', userId);

            await supabase.from('wallet_transactions').insert({
              user_id: userId,
              reference: reference,
              type: 'deposit',
              amount: amountGHS,
              status: 'completed',
              created_at: new Date().toISOString()
            });
          }
        }
      }
      else if (paymentType === 'PRODUCT_PURCHASE') {
        if (userId && metadata.product_id) {
          // Unlock product (in a real app, maybe insert into 'user_products' table)
          // For now, if there's an affiliate, pay them 50%
          if (metadata.affiliate_code) {
             const { data: affProf } = await supabase.from('profiles').select('id, available_balance_ghs, total_earnings_ghs').eq('affiliate_code', metadata.affiliate_code).single();
             if (affProf) {
               const commission = amountGHS * 0.5;
               const newBal = Number(affProf.available_balance_ghs || 0) + commission;
               const newEarn = Number(affProf.total_earnings_ghs || 0) + commission;
               await supabase.from('profiles').update({
                 available_balance_ghs: newBal,
                 total_earnings_ghs: newEarn
               }).eq('id', affProf.id);

               await supabase.from('affiliate_sales').insert({
                 affiliate_id: affProf.id,
                 paystack_reference: reference,
                 gross_amount_ghs: amountGHS,
                 commission_ghs: commission,
                 status: 'verified',
                 product_name: `Product ${metadata.product_id}`,
                 created_at: new Date().toISOString()
               });
             }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
