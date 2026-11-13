import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getResendClient = () => {
  const resendKey =
    process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY;
  return resendKey ? new Resend(resendKey) : null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      reference,
      productId,
      productTitle,
      grossAmountGHS,
      affiliateCode,
      buyerUserId,
      buyerName,
      buyerEmail,
      buyerPhone,
    } = body || {};

    const cleanRef = String(reference || '').trim();
    if (!cleanRef || cleanRef.toUpperCase().startsWith('HP_TEST_')) {
      return NextResponse.json(
        { error: 'Test purchases are disabled. A real verified Paystack reference is required.' },
        { status: 400 }
      );
    }

    if (!productId || !productTitle) {
      return NextResponse.json(
        { error: 'Missing required product details (productId, productTitle).' },
        { status: 400 }
      );
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { error: 'Server configuration error: PAYSTACK_SECRET_KEY is missing.' },
        { status: 500 }
      );
    }

    // 1. Verify Paystack reference directly with Paystack API
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const verifyJson = await verifyRes.json();

    if (!verifyRes.ok || !verifyJson?.status || verifyJson?.data?.status !== 'success') {
      return NextResponse.json(
        {
          error:
            verifyJson?.data?.gateway_response ||
            verifyJson?.message ||
            'Paystack could not verify this product payment.',
        },
        { status: 400 }
      );
    }

    const paidPesewas = Number(verifyJson.data.amount || 0);
    const verifiedGrossGHS = Number((paidPesewas / 100).toFixed(2));
    const expectedMinGHS = Math.max(1, Number(grossAmountGHS || 0) - 1);

    if (verifiedGrossGHS < expectedMinGHS) {
      return NextResponse.json(
        {
          error: `Amount mismatch: Paid GH₵ ${verifiedGrossGHS.toFixed(2)}, expected at least GH₵ ${Number(grossAmountGHS || 0).toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    const verifiedCommissionGHS = Number((verifiedGrossGHS * 0.5).toFixed(2));
    const verifiedBuyerEmail = String(
      buyerEmail || verifyJson.data?.customer?.email || 'buyer@horpal.com'
    )
      .trim()
      .toLowerCase();

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing.' },
        { status: 500 }
      );
    }

    const cleanAffCode =
      affiliateCode && String(affiliateCode).trim() !== ''
        ? String(affiliateCode).trim()
        : null;

    // 2. Atomic post-purchase execution via SECURITY DEFINER RPC:
    // - Credits referring affiliate 50% commission (affiliate_balance += 50%, affiliate_total_earned += 50%, affiliate_total_sales += 1)
    // - Inserts into public.pillar2_sales & public.pillar2_unlocked_courses
    // - Automatically sets buyer's has_paid_pillar2 = TRUE, pillar2_paid_at = NOW(), pillar2_expires_at = NOW() + 365 days
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'record_pillar2_sale_rpc',
      {
        p_reference: cleanRef,
        p_product_id: String(productId),
        p_product_title: String(productTitle),
        p_gross_amount_ghs: verifiedGrossGHS,
        p_commission_amount_ghs: verifiedCommissionGHS,
        p_affiliate_code: cleanAffCode,
        p_buyer_user_id: buyerUserId || null,
        p_buyer_name: buyerName || 'Verified Customer',
        p_buyer_email: verifiedBuyerEmail,
        p_buyer_phone: buyerPhone || 'N/A',
      }
    );

    if (rpcError) {
      console.error('record_pillar2_sale_rpc error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to record verified product purchase.' },
        { status: 500 }
      );
    }

    const alreadyProcessed = Boolean(rpcData?.already_processed);
    const affiliateUserId = rpcData?.affiliate_user_id || null;
    let affiliateEmail = rpcData?.affiliate_email || null;
    let actualNewVerifiedBalance = Number(rpcData?.affiliate_new_balance_ghs ?? 0);

    // 3. Query the referring affiliate's actual updated affiliate_balance directly from public.profiles
    if (affiliateUserId) {
      const { data: liveAffProfile } = await supabase
        .from('profiles')
        .select('affiliate_balance, email, affiliate_code')
        .eq('id', affiliateUserId)
        .maybeSingle();

      if (liveAffProfile) {
        actualNewVerifiedBalance = Number(liveAffProfile.affiliate_balance ?? 0);
        affiliateEmail = liveAffProfile.email || affiliateEmail;
      }
    }

    // 4. Send Resend Audit Email (preserving exact Resend configuration & HTML structure, with real DB balance)
    const resend = getResendClient();
    const adminEmail =
      process.env.ADMIN_CONTACT_EMAIL_AFFILIATE || 'geestablish@gmail.com';
    let emailSent = false;

    if (resend && !alreadyProcessed) {
      try {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            'HorPal Affiliate Engine <onboarding@resend.dev>',
          to: [adminEmail],
          subject: `💰 [50% COMMISSION CREDITED] GH₵ ${verifiedCommissionGHS.toFixed(2)} — ${productTitle} (${cleanAffCode || 'DIRECT'})`,
          html: `
            <div style="font-family: Arial, sans-serif; background: #070b14; color: #f9fafb; padding: 28px; border-radius: 16px; border: 1px solid #10b981;">
              <h2 style="color: #10b981; margin-top: 0;">💸 Verified HorPal Pillar 2 Sale & 50% Commission Audit</h2>
              <p style="color: #9ca3af; font-size: 14px;">A real digital course sale has been verified and 50% affiliate commission has been credited in Supabase.</p>
              <hr style="border-color: #1f2937; margin: 16px 0;" />
              <p><strong>Product:</strong> ${productTitle} (<code>${productId}</code>)</p>
              <p><strong>Paystack Reference:</strong> <code>${cleanRef}</code></p>
              <p><strong>Gross Sale Amount:</strong> GH₵ ${verifiedGrossGHS.toFixed(2)}</p>
              <p style="color: #34d399; font-size: 16px;"><strong>50% Affiliate Commission Credited:</strong> GH₵ ${verifiedCommissionGHS.toFixed(2)}</p>
              <p><strong>Referring Affiliate Code:</strong> ${cleanAffCode || 'None (Direct Platform Sale)'}</p>
              <p><strong>Referring Affiliate Email:</strong> ${affiliateEmail || 'Unmatched / Direct'}</p>
              <p><strong>Affiliate New Verified Balance:</strong> GH₵ ${actualNewVerifiedBalance.toFixed(2)}</p>
              <hr style="border-color: #1f2937; margin: 16px 0;" />
              <p><strong>Buyer Name:</strong> ${buyerName || 'Verified Customer'}</p>
              <p><strong>Buyer Email:</strong> ${verifiedBuyerEmail}</p>
              <p><strong>Buyer Phone:</strong> ${buyerPhone || 'N/A'}</p>
              <p><strong>Timestamp (GMT):</strong> ${new Date().toUTCString()}</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn('Resend sale alert email error:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed,
      reference: cleanRef,
      productId,
      productTitle,
      grossAmountGHS: verifiedGrossGHS,
      commissionCreditedGHS: verifiedCommissionGHS,
      affiliateCredited: Boolean(affiliateUserId),
      affiliateUserId,
      affiliateEmail,
      newBalanceGHS: actualNewVerifiedBalance,
      buyerGrantedPillar2Access: true,
      pillar2_paid_at: rpcData?.pillar2_paid_at || new Date().toISOString(),
      pillar2_expires_at:
        rpcData?.pillar2_expires_at ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      emailSent,
    });
  } catch (err: any) {
    console.error('Verify product purchase API error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
