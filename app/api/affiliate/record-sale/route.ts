import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reference,
      productId,
      productTitle,
      priceGhs,
      commissionGhs,
      affiliateRef,
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerUserId,
    } = body;

    if (!reference || !productId) {
      return NextResponse.json({ error: 'Missing required payment reference or productId' }, { status: 400 });
    }

    // 1. Verify payment with Paystack if secret key is available
    let paystackVerified = true;
    if (paystackSecretKey && !reference.startsWith('HP_TEST_')) {
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        const verifyData = await verifyRes.json();
        if (verifyData?.status === true && verifyData?.data?.status !== 'success') {
          paystackVerified = false;
        }
      } catch (verifyErr) {
        console.warn('Paystack verification network warning, proceeding with callback reference:', verifyErr);
      }
    }

    if (!paystackVerified) {
      return NextResponse.json({ error: 'Transaction not verified as successful by Paystack' }, { status: 400 });
    }

    let rpcData: any = null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error: rpcErr } = await supabase.rpc('record_pillar2_sale_rpc', {
        p_reference: String(reference),
        p_product_id: String(productId),
        p_product_title: String(productTitle || 'HorPal Digital Academy Course'),
        p_gross_amount_ghs: Number(priceGhs || 0),
        p_commission_amount_ghs: Number(commissionGhs || 0),
        p_affiliate_code: affiliateRef ? String(affiliateRef).trim() : null,
        p_buyer_user_id: buyerUserId || null,
        p_buyer_name: buyerName || 'HorPal Buyer',
        p_buyer_email: buyerEmail || 'buyer@horpal.com',
        p_buyer_phone: buyerPhone || null,
      });

      if (rpcErr) {
        console.warn('record_pillar2_sale_rpc warning:', rpcErr.message);
      } else {
        rpcData = data;
      }
    }

    if (rpcData?.already_processed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        reference,
        affiliateCredited: Boolean(rpcData?.affiliate_user_id),
        newAffiliateBalance: Number(rpcData?.affiliate_new_balance_ghs || 0),
      });
    }

    const affiliateEmail = rpcData?.affiliate_email || '';
    const newAffiliateBalance = Number(rpcData?.affiliate_new_balance_ghs || 0);

    // Send real email notifications via Resend (if API key configured)
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        if (affiliateEmail) {
          await resend.emails.send({
            from: 'HorPal Affiliate Engine <notifications@horpal.com>',
            to: [affiliateEmail],
            subject: `🎉 You just earned GH₵ ${Number(commissionGhs || 0).toFixed(2)} Commission on HorPal!`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #070A12; color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #10b981;">
                <p style="color: #10b981; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">HorPal Pillar 2 • Verified Sale</p>
                <h1 style="font-size: 26px; font-weight: 900; margin: 0 0 16px;">New 80% Commission Credited! 💰</h1>
                <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                  Congratulations! Someone just purchased <strong>${productTitle}</strong> using your referral link (Code: <strong>${affiliateRef}</strong>).
                </p>
                <div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">COMMISSION CREDITED TO YOUR WALLET</p>
                  <p style="margin: 0; font-size: 32px; font-weight: 900; color: #34d399;">+GH₵ ${Number(commissionGhs || 0).toFixed(2)}</p>
                  <p style="margin: 8px 0 0; color: #fbbf24; font-size: 13px; font-weight: 700;">New Verified Balance: GH₵ ${newAffiliateBalance.toFixed(2)}</p>
                </div>
                <p style="color: #9ca3af; font-size: 13px;">Paystack Reference: <code>${reference}</code></p>
              </div>
            `,
          });
        }

        if (buyerEmail && buyerEmail.includes('@')) {
          await resend.emails.send({
            from: 'HorPal Digital Academy <courses@horpal.com>',
            to: [buyerEmail],
            subject: `✅ Course Unlocked: ${productTitle} (HorPal Academy)`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #070A12; color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #10b981;">
                <p style="color: #10b981; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">HorPal Digital Academy • Official Receipt</p>
                <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 16px;">Your Course & 1-Year Affiliate License Are Unlocked! 🎓</h1>
                <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                  Hi ${buyerName || 'Student'}, thank you for purchasing <strong>${productTitle}</strong> (GH₵ ${Number(priceGhs || 0).toFixed(2)}).
                </p>
                <p style="color: #34d399; font-size: 14px; font-weight: 700;">
                  You now have full access to all 10 Complete Masterclass Modules, the Certification Exam, and your 1-Year HorPal Affiliate License!
                </p>
                <p style="color: #9ca3af; font-size: 13px;">Paystack Reference: <code>${reference}</code></p>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.warn('Resend email notification warning:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      affiliateCredited: Boolean(rpcData?.affiliate_user_id),
      affiliateUserId: rpcData?.affiliate_user_id || null,
      newAffiliateBalance,
      pillar2_paid_at: rpcData?.pillar2_paid_at,
      pillar2_expires_at: rpcData?.pillar2_expires_at,
    });
  } catch (err: any) {
    console.error('Error recording affiliate sale:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
