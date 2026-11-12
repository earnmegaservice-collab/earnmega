import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_service_key';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY || 're_fallback_key';
  return new Resend(apiKey);
}

function getAdminAffiliateEmail(): string {
  return process.env.ADMIN_CONTACT_EMAIL_AFFILIATE || 'geestablish@gmail.com';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = (body.paystackReference || body.reference || body.paystack_ref || '').trim();
    const productId = body.productId || body.product_id || 'prod_faceless_ai';
    const productTitle = body.productTitle || body.product_title || 'HorPal Digital Asset';
    const buyerUserId = body.buyerUserId || body.buyer_user_id || null;
    const buyerName = body.buyerName || body.buyer_name || 'Verified Buyer';
    const buyerEmail = body.buyerEmail || body.buyer_email || '';
    const buyerPhone = body.buyerPhone || body.sub_id || '';
    const affiliateCode = (body.affiliateCode || body.affiliate_code || '').trim();
    const isDirectEnrollment = Boolean(body.isDirectEnrollment) || productId === 'pillar2_direct_90';

    if (!reference) {
      return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 });
    }

    // Idempotency check in affiliate_sales
    const { data: existingSale } = await supabaseAdmin
      .from('affiliate_sales')
      .select('id, commission_ghs')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (existingSale) {
      return NextResponse.json({
        success: true,
        status: 'already_recorded',
        commissionGHS: Number(existingSale.commission_ghs || 0),
      });
    }

    const grossGHS = Number(body.amountGHS ?? body.grossAmountGHS ?? body.gross_ghs ?? 240);
    const commissionGHS = isDirectEnrollment ? 0 : Number((grossGHS * 0.5).toFixed(2));
    const timestampGMT = new Date().toISOString();

    // Find referring affiliate profile by affiliate_code
    let affiliateProfile: any = null;
    if (affiliateCode && !isDirectEnrollment) {
      const { data: affProf } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('affiliate_code', affiliateCode)
        .maybeSingle();

      if (affProf) {
        affiliateProfile = affProf;
      }
    }

    let updatedAffiliateBalance = 0;
    if (affiliateProfile && commissionGHS > 0) {
      const currentBal = Number(
        affiliateProfile.available_balance_ghs ?? affiliateProfile.affiliate_balance ?? 0
      );
      updatedAffiliateBalance = Number((currentBal + commissionGHS).toFixed(2));
      const currentTotalEarn = Number(affiliateProfile.total_earnings_ghs || 0);
      const updatedTotalEarn = Number((currentTotalEarn + commissionGHS).toFixed(2));
      const updatedSalesCount = Number(affiliateProfile.sales_count || 0) + 1;

      await supabaseAdmin
        .from('profiles')
        .update({
          affiliate_balance: updatedAffiliateBalance,
          available_balance_ghs: updatedAffiliateBalance,
          total_earnings_ghs: updatedTotalEarn,
        })
        .eq('id', affiliateProfile.id);

      // Best-effort increment of sales_count column
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ sales_count: updatedSalesCount })
          .eq('id', affiliateProfile.id);
      } catch (_) {}
    }

    // Insert into affiliate_sales
    if (!isDirectEnrollment) {
      try {
        await supabaseAdmin.from('affiliate_sales').insert({
          affiliate_id: affiliateProfile?.id || buyerUserId,
          affiliate_user_id: affiliateProfile?.id || buyerUserId,
          affiliate_code: affiliateCode || affiliateProfile?.affiliate_code || '',
          paystack_reference: reference,
          product_id: productId,
          product_title: productTitle,
          product_name: productTitle,
          buyer_user_id: buyerUserId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          sub_id: buyerPhone,
          gross_amount_ghs: grossGHS,
          amount_paid_ghs: grossGHS,
          commission_ghs: commissionGHS,
          status: 'VERIFIED',
          created_at: timestampGMT,
        });
      } catch (insertErr) {
        console.error('[AFFILIATE_SALES INSERT ERROR]:', insertErr);
      }

      if (affiliateProfile?.id) {
        try {
          await supabaseAdmin.from('affiliate_notifications').insert({
            user_id: affiliateProfile.id,
            title: `💰 50% Commission Credited: ${productTitle}`,
            subtitle: `Buyer: ${buyerName} (${buyerEmail}) • Ref: ${reference}`,
            amount_ghs: commissionGHS,
            read: false,
            created_at: timestampGMT,
          });
        } catch (_) {}
      }
    }

    // Send sale confirmation email via RESEND_API_KEY_AFFILIATE to ADMIN_CONTACT_EMAIL_AFFILIATE
    if (process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY) {
      const resend = getResendClient();
      const adminEmail = getAdminAffiliateEmail();
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'HorPal Affiliate Engine <onboarding@resend.dev>';

      const htmlBody = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070b14; color: #f8fafc; padding: 36px; border-radius: 16px; max-width: 640px; margin: 0 auto; border: 1px solid #10b981;">
          <h2 style="color: #10b981; margin-top: 0;">💸 Verified HorPal Pillar 2 Sale & 50% Commission Audit</h2>
          <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Product:</strong> ${productTitle}</p>
            <p style="margin: 6px 0;"><strong>Paystack Reference:</strong> <code style="color: #38bdf8;">${reference}</code></p>
            <p style="margin: 6px 0;"><strong>Gross Sale Amount:</strong> GH₵ ${grossGHS.toFixed(2)}</p>
            <p style="margin: 6px 0;"><strong>50% Affiliate Commission Credited:</strong> <span style="color: #10b981; font-weight: 800;">GH₵ ${commissionGHS.toFixed(2)}</span></p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 14px 0;" />
            <p style="margin: 6px 0;"><strong>Referring Affiliate Code:</strong> ${affiliateCode || 'Direct'}</p>
            <p style="margin: 6px 0;"><strong>Referring Affiliate Email:</strong> ${affiliateProfile?.email || 'N/A'}</p>
            <p style="margin: 6px 0;"><strong>Affiliate New Verified Balance:</strong> GH₵ ${updatedAffiliateBalance.toFixed(2)}</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 14px 0;" />
            <p style="margin: 6px 0;"><strong>Buyer Name:</strong> ${buyerName}</p>
            <p style="margin: 6px 0;"><strong>Buyer Email:</strong> ${buyerEmail}</p>
            <p style="margin: 6px 0;"><strong>Buyer Phone:</strong> ${buyerPhone}</p>
            <p style="margin: 6px 0;"><strong>Timestamp (GMT):</strong> ${timestampGMT}</p>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: adminEmail,
          subject: `💰 [50% COMMISSION CREDITED] GH₵ ${commissionGHS.toFixed(2)} — ${productTitle} (${affiliateCode || 'DIRECT'})`,
          html: htmlBody,
        });
      } catch (mailErr) {
        console.error('[RECORD-SALE EMAIL ERROR]:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      grossGHS,
      commissionGHS,
      affiliateId: affiliateProfile?.id || null,
      updatedAffiliateBalance,
    });
  } catch (error: any) {
    console.error('[RECORD-SALE ERROR]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record verified affiliate sale.' },
      { status: 500 }
    );
  }
}
