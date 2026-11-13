import { NextResponse } from 'next/server';
import crypto from 'crypto';
import type { User } from '@supabase/supabase-js';
import {
  bindVerifiedPayment,
  findOtherPillarConflict,
  getAdminClient,
  PaywallError,
  PaystackTx,
  PillarNumber,
  priceForPayment,
} from '@/lib/server/paywall';

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

    if (!secret || secret === 'sk_test_placeholder') {
      return NextResponse.json({ error: 'Paystack webhook secret not configured' }, { status: 503 });
    }

    const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const sigBuf = signature ? Buffer.from(signature, 'utf8') : null;
    const expBuf = Buffer.from(expectedHash, 'utf8');

    if (!sigBuf || sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: 'Invalid Paystack signature' }, { status: 401 });
    }

    const admin = getAdminClient();
    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = String(data.reference || '').trim();
      const amountGHS = Number(data.amount || 0) / 100;
      const customerEmail = data.customer?.email ? String(data.customer.email).trim().toLowerCase() : '';
      const metadata = data.metadata || {};

      const paymentType = String(metadata.payment_type || '').toUpperCase();
      const userId = metadata.user_id ? String(metadata.user_id).trim() : null;

      // Idempotency check in both tables
      const { data: existingTx } = await admin
        .from('wallet_transactions')
        .select('id')
        .eq('reference', reference)
        .in('status', ['completed', 'verified', 'VERIFIED'])
        .maybeSingle();

      if (existingTx) {
        return NextResponse.json({ status: 'already_processed' }, { status: 200 });
      }

      const { data: existingSale } = await admin
        .from('affiliate_sales')
        .select('id')
        .eq('paystack_reference', reference)
        .in('status', ['completed', 'verified', 'VERIFIED'])
        .maybeSingle();

      if (existingSale) {
        return NextResponse.json({ status: 'already_processed' }, { status: 200 });
      }

      const resolveVerifiedUser = async (): Promise<User | null> => {
        if (!userId) return null;
        const { data: profRow } = await admin
          .from('profiles')
          .select('id, email')
          .eq('id', userId)
          .maybeSingle();
        if (!profRow?.id) return null;
        return { id: profRow.id, email: profRow.email || customerEmail } as User;
      };

      const bindPillarWebhook = async (pillar: PillarNumber) => {
        const txFromWebhook: PaystackTx = {
          reference,
          amountPesewas: Number(data.amount || 0),
          currency: String(data.currency || 'GHS').toUpperCase(),
          email: customerEmail,
          metadata,
          paidAt: data.paid_at || null,
        };
        try {
          const price = priceForPayment(pillar, txFromWebhook);
          const targetUser = await resolveVerifiedUser();
          await bindVerifiedPayment(admin, pillar, txFromWebhook, price, targetUser);
        } catch (err) {
          if (err instanceof PaywallError && err.status === 409) {
            console.warn('[webhook] pillar binding conflict ignored:', err.message);
            return;
          }
          throw err;
        }
      };

      // Fulfillment routing
      if (paymentType === 'P1_REGISTRATION' || paymentType === 'P1_UPGRADE') {
        const targetTier = String(metadata.target_tier || 'FREE').toUpperCase();
        const isPro = targetTier === 'PRO' || targetTier === 'PREMIUM';
        const isPremium = targetTier === 'PREMIUM';

        const now = new Date();
        let expiresAt: Date | null = null;
        if (targetTier === 'PRO') {
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (targetTier === 'PREMIUM') {
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        }

        const tierPayload = {
          subscription_tier: targetTier.toLowerCase(),
          is_pro: isPro,
          is_premium: isPremium,
          subscription_started_at: now.toISOString(),
          subscription_expires_at: expiresAt ? expiresAt.toISOString() : null,
        };

        if (userId) {
          const { error: upErr } = await admin.from('profiles').update(tierPayload).eq('id', userId);
          if (upErr) {
            await admin.from('profiles').update({ subscription_tier: targetTier.toLowerCase() }).eq('id', userId);
          }
        } else if (customerEmail) {
          const { error: upErr } = await admin.from('profiles').update(tierPayload).eq('email', customerEmail);
          if (upErr) {
            await admin.from('profiles').update({ subscription_tier: targetTier.toLowerCase() }).eq('email', customerEmail);
          }
        }
      }
      else if (paymentType === 'GLOBAL_CHAT_PASS' || paymentType === 'P1_LIFETIME_PASS') {
        await bindPillarWebhook(1);
      }
      else if (paymentType === 'COIN_PURCHASE') {
        if (userId) {
          const coinsAmount = Number(metadata.coins_amount || 0);
          const { data: prof } = await admin.from('profiles').select('coin_balance, coins').eq('id', userId).maybeSingle();
          if (prof) {
             const currentCoins = prof.coins || prof.coin_balance || 0;
             const newTotal = currentCoins + coinsAmount;
             const { error: coinErr } = await admin.from('profiles').update({ coin_balance: newTotal, coins: newTotal }).eq('id', userId);
             if (coinErr) {
               await admin.from('profiles').update({ coins: newTotal }).eq('id', userId);
             }
          }
        }
      }
      else if (paymentType === 'P2_LICENSE' || paymentType === 'P2_RENEWAL' || paymentType.startsWith('PILLAR2')) {
        await bindPillarWebhook(2);
      }
      else if (paymentType.startsWith('PILLAR3') || paymentType.startsWith('P3_')) {
        await bindPillarWebhook(3);
      }
      else if (paymentType === 'WALLET_DEPOSIT') {
        if (userId) {
          const { data: prof } = await admin.from('profiles').select('available_balance_ghs, affiliate_balance').eq('id', userId).maybeSingle();
          if (prof) {
            const currentBal = Number(prof.available_balance_ghs || prof.affiliate_balance || 0);
            await admin.from('profiles').update({
              available_balance_ghs: currentBal + amountGHS,
              affiliate_balance: currentBal + amountGHS
            }).eq('id', userId);

            await admin.from('wallet_transactions').insert({
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
        const conflict = await findOtherPillarConflict(admin, reference, metadata);
        if (!conflict && userId && metadata.product_id) {
          if (metadata.affiliate_code) {
             const { data: affProf } = await admin.from('profiles').select('id, affiliate_balance, available_balance_ghs, total_earnings_ghs, sales_count').ilike('affiliate_code', metadata.affiliate_code).maybeSingle();
             if (affProf) {
               const commission = Number((amountGHS * 0.5).toFixed(2));
               const newAffiliateBal = Number((Number(affProf.available_balance_ghs ?? affProf.affiliate_balance ?? 0) + commission).toFixed(2));
               const newEarn = Number((Number(affProf.total_earnings_ghs || 0) + commission).toFixed(2));
               await admin.from('profiles').update({
                 affiliate_balance: newAffiliateBal,
                 available_balance_ghs: newAffiliateBal,
                 total_earnings_ghs: newEarn
               }).eq('id', affProf.id);
               try {
                 await admin.from('profiles').update({
                   sales_count: Number(affProf.sales_count || 0) + 1
                 }).eq('id', affProf.id);
               } catch (_) {}

               await admin.from('affiliate_sales').insert({
                 affiliate_id: affProf.id,
                 affiliate_code: metadata.affiliate_code,
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
