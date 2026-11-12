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

function resolvePaystackRecipientConfig(
  countryRaw: string,
  settlementMethodRaw: string,
  currencyOverride?: string
): { type: string; currency: string } {
  const country = (countryRaw || '').toLowerCase();
  const isMomo = (settlementMethodRaw || '').toUpperCase().includes('MOBILE');

  if (country.includes('nigeria') || country.includes('ngn')) {
    return { type: 'nuban', currency: currencyOverride || 'NGN' };
  }
  if (country.includes('south africa') || country.includes('zar')) {
    return { type: 'basa', currency: currencyOverride || 'ZAR' };
  }
  if (country.includes('kenya') || country.includes('kes')) {
    return { type: isMomo ? 'mobile_money' : 'kepss', currency: currencyOverride || 'KES' };
  }
  if (country.includes('ivoire') || country.includes('xof')) {
    return { type: 'mobile_money', currency: currencyOverride || 'XOF' };
  }
  // Default: Ghana (GHS)
  return {
    type: isMomo ? 'mobile_money' : 'ghipss',
    currency: currencyOverride || 'GHS',
  };
}

// ============================================================================
// GET /api/affiliate/payout?action=resolve&account_number=...&bank_code=...
// Calls https://api.paystack.co/bank/resolve with PAYSTACK_SECRET_KEY
// ============================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action !== 'resolve') {
      return NextResponse.json({ error: 'Unsupported action. Use ?action=resolve' }, { status: 400 });
    }

    const accountNumber = (searchParams.get('account_number') || '').trim();
    const bankCode = (searchParams.get('bank_code') || '').trim();

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: 'Both account_number and bank_code query parameters are required.' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'PAYSTACK_SECRET_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const resolveUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
      accountNumber
    )}&bank_code=${encodeURIComponent(bankCode)}`;

    const response = await fetch(resolveUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data?.status) {
      return NextResponse.json(
        {
          status: false,
          error: data?.message || 'Unable to resolve account name via Paystack.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: true,
      account_name: data.data?.account_name || '',
      account_number: data.data?.account_number || accountNumber,
      bank_id: data.data?.bank_id,
      data: data.data,
    });
  } catch (error: any) {
    console.error('[PAYOUT RESOLVE ERROR]:', error);
    return NextResponse.json(
      { status: false, error: error?.message || 'Failed to resolve bank/mobile money account.' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/affiliate/payout
// Atomic DB Balance Audit, Paystack Transfers API & Dual Resend Notifications
// ============================================================================
export async function POST(req: Request) {
  try {
    // 1. STRICT FRIDAY GMT CHECK
    const now = new Date();
    const isFridayGMT = now.getUTCDay() === 5;
    if (!isFridayGMT) {
      return NextResponse.json(
        { error: 'Payout desk is strictly open on Fridays (00:00 - 23:59 GMT).' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const userId = (body.userId || '').trim();
    const payoutMode: 'PAYSTACK_AUTO' | 'GLOBAL_MANUAL' =
      body.payoutMode === 'GLOBAL_MANUAL' ? 'GLOBAL_MANUAL' : 'PAYSTACK_AUTO';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing userId.' }, { status: 400 });
    }

    // 2. REAL DATABASE PROFILE & LEDGER AUDIT (ZERO TRUST IN CLIENT STATE)
    let profile: any = null;
    const { data: explicitProf, error: explicitErr } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, email, full_name, username, affiliate_code, affiliate_balance, total_withdrawn, is_banned, is_wallet_frozen'
      )
      .eq('id', userId)
      .single();

    if (!explicitErr && explicitProf) {
      profile = explicitProf;
    } else {
      // Fallback to select('*') in case any optional column name differs in the target DB
      const { data: fullProf, error: fullErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (fullErr || !fullProf) {
        return NextResponse.json(
          { error: 'Account profile could not be verified in the database.' },
          { status: 404 }
        );
      }
      profile = fullProf;
    }

    if (profile.is_banned || profile.is_wallet_frozen) {
      return NextResponse.json(
        {
          error:
            'Security Restriction: Your account or affiliate wallet is currently frozen or restricted from withdrawals.',
        },
        { status: 403 }
      );
    }

    const requestedAmount = Number(body.amount ?? body.amountGHS);
    if (!Number.isFinite(requestedAmount) || requestedAmount < 90) {
      return NextResponse.json(
        { error: 'Minimum Friday withdrawal amount is GH₵ 90.00.' },
        { status: 400 }
      );
    }

    const currentAffiliateBalance = Number(profile.affiliate_balance ?? profile.available_balance_ghs ?? 0);
    if (requestedAmount > currentAffiliateBalance) {
      return NextResponse.json(
        {
          error: 'Verification Failed: Requested amount exceeds your server-verified available balance.',
        },
        { status: 400 }
      );
    }

    const resolvedAffiliateCode =
      profile.affiliate_code ||
      body.affiliateCode ||
      `HP-${userId.replace(/-/g, '').substring(0, 6).toUpperCase()}`;

    // Query affiliate_sales (where affiliate_id = userId OR affiliate_code = profile.affiliate_code)
    let verifiedSalesCount = 0;
    let verifiedCommissionsTotal = 0;
    try {
      const { data: salesRows } = await supabaseAdmin
        .from('affiliate_sales')
        .select('id, commission_ghs, affiliate_id, affiliate_code')
        .or(`affiliate_id.eq.${userId},affiliate_code.eq.${resolvedAffiliateCode}`);

      if (salesRows && salesRows.length > 0) {
        verifiedSalesCount = salesRows.length;
        verifiedCommissionsTotal = Number(
          salesRows
            .reduce((sum: number, row: any) => sum + Number(row.commission_ghs || 0), 0)
            .toFixed(2)
        );
      }
    } catch (_) {}

    // Query wallet_deposits (and wallet_transactions fallback) where user_id = userId
    let verifiedDepositsTotal = 0;
    try {
      const { data: depositRows, error: depErr } = await supabaseAdmin
        .from('wallet_deposits')
        .select('amount, amount_ghs')
        .eq('user_id', userId);

      if (!depErr && depositRows && depositRows.length > 0) {
        verifiedDepositsTotal = Number(
          depositRows
            .reduce((sum: number, row: any) => sum + Number(row.amount_ghs ?? row.amount ?? 0), 0)
            .toFixed(2)
        );
      } else {
        const { data: walletTxRows } = await supabaseAdmin
          .from('wallet_transactions')
          .select('amount, type, status')
          .eq('user_id', userId);
        if (walletTxRows && walletTxRows.length > 0) {
          verifiedDepositsTotal = Number(
            walletTxRows
              .filter((r: any) => (r.type || 'deposit').toLowerCase() === 'deposit')
              .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
              .toFixed(2)
          );
        }
      }
    } catch (_) {}

    // 3. ATOMIC ESCROW BALANCE DEDUCTION (PREVENT DOUBLE-SPEND)
    const newBalance = Number((currentAffiliateBalance - requestedAmount).toFixed(2));
    const newTotalWithdrawn = Number((Number(profile.total_withdrawn || 0) + requestedAmount).toFixed(2));

    const { error: balanceUpdateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        affiliate_balance: newBalance,
        total_withdrawn: newTotalWithdrawn,
      })
      .eq('id', userId);

    if (balanceUpdateErr) {
      console.error('[ATOMIC BALANCE DEDUCTION ERROR]:', balanceUpdateErr);
      return NextResponse.json(
        { error: 'Failed to lock withdrawal balance in database. Please try again.' },
        { status: 500 }
      );
    }

    // Best-effort sync of available_balance_ghs if that column exists
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ available_balance_ghs: newBalance })
        .eq('id', userId);
    } catch (_) {}

    const payoutRef = `PAY-${Date.now().toString(36).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}`;
    const timestampGMT = now.toISOString();

    const fullName =
      body.beneficiaryFullName ||
      body.accountHolderName ||
      body.affiliateName ||
      profile.full_name ||
      profile.name ||
      profile.username ||
      'Verified Affiliate';

    const submittedEmail = (
      body.verifiedEmail ||
      body.affiliateEmail ||
      profile.email ||
      ''
    ).trim();

    // ========================================================================
    // 4. PATH A vs PATH B EXECUTION
    // ========================================================================
    let transferStatus = 'PENDING';
    let dbPayoutStatus = 'PENDING';
    let recipientCode = '';
    let transferCode = '';
    let isManualFallback = false;
    let fallbackReason = '';

    if (payoutMode === 'PAYSTACK_AUTO') {
      const accountHolderName = (body.accountHolderName || fullName).trim();
      const accountNumber = (body.accountNumber || '').trim();
      const bankOrNetworkCode = (body.bankCode || body.providerName || '').trim();
      const country = body.country || 'Ghana (GHS)';
      const settlementMethod = body.settlementMethod || 'MOBILE_MONEY';
      const { type: recipientType, currency } = resolvePaystackRecipientConfig(
        country,
        settlementMethod,
        body.currency
      );

      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

      if (!paystackSecretKey) {
        isManualFallback = true;
        transferStatus = 'PENDING_MANUAL_FALLBACK';
        dbPayoutStatus = 'PENDING_MANUAL_FALLBACK';
        fallbackReason = 'PAYSTACK_SECRET_KEY not configured on server; routed to manual executive settlement.';
      } else {
        try {
          // Step 1: Create Transfer Recipient
          const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: recipientType,
              name: accountHolderName,
              account_number: accountNumber,
              bank_code: bankOrNetworkCode,
              currency: currency || 'GHS',
            }),
          });

          const recipientData = await recipientRes.json();

          if (!recipientRes.ok || !recipientData?.status || !recipientData?.data?.recipient_code) {
            isManualFallback = true;
            transferStatus = 'PENDING_MANUAL_FALLBACK';
            dbPayoutStatus = 'PENDING_MANUAL_FALLBACK';
            fallbackReason =
              recipientData?.message || 'Paystack transferrecipient creation returned an error.';
          } else {
            recipientCode = recipientData.data.recipient_code;

            // Step 2: Initiate Paystack Transfer
            const transferRes = await fetch('https://api.paystack.co/transfer', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                source: 'balance',
                amount: Math.round(requestedAmount * 100),
                recipient: recipientCode,
                reference: payoutRef,
                reason: `HorPal Pillar 2 Friday Affiliate Payout (${resolvedAffiliateCode})`,
              }),
            });

            const transferData = await transferRes.json();

            if (!transferRes.ok || !transferData?.status) {
              isManualFallback = true;
              transferStatus = 'PENDING_MANUAL_FALLBACK';
              dbPayoutStatus = 'PENDING_MANUAL_FALLBACK';
              fallbackReason =
                transferData?.message || 'Paystack transfer initiation failed (e.g., float or bank restriction).';
            } else {
              transferStatus = (transferData.data?.status || 'pending').toLowerCase();
              transferCode = transferData.data?.transfer_code || '';
              dbPayoutStatus = transferStatus === 'success' ? 'PAID' : 'PROCESSING';
            }
          }
        } catch (paystackErr: any) {
          isManualFallback = true;
          transferStatus = 'PENDING_MANUAL_FALLBACK';
          dbPayoutStatus = 'PENDING_MANUAL_FALLBACK';
          fallbackReason = paystackErr?.message || 'Network exception communicating with Paystack Transfers API.';
        }
      }

      // Persist PAYSTACK_AUTO record in affiliate_payouts
      const paymentDetailsPayload = {
        payoutMode: 'PAYSTACK_AUTO',
        country,
        settlementMethod,
        bankCode: bankOrNetworkCode,
        providerName: body.providerName || bankOrNetworkCode,
        accountNumber,
        accountHolderName,
        recipientCode,
        transferCode,
        transferStatus,
        isManualFallback,
        fallbackReason,
        balanceBeforeGHS: currentAffiliateBalance,
        balanceAfterGHS: newBalance,
      };

      try {
        await supabaseAdmin.from('affiliate_payouts').insert({
          user_id: userId,
          affiliate_code: resolvedAffiliateCode,
          reference: payoutRef,
          amount_ghs: requestedAmount,
          payout_mode: 'PAYSTACK_AUTO',
          status: dbPayoutStatus,
          recipient_code: recipientCode || null,
          transfer_code: transferCode || null,
          payment_details: paymentDetailsPayload,
          created_at: timestampGMT,
        });
      } catch (_) {}
    } else {
      // PATH B: GLOBAL MANUAL SETTLEMENT
      dbPayoutStatus = 'PENDING';
      transferStatus = 'PENDING';

      const paymentDetailsPayload = {
        payoutMode: 'GLOBAL_MANUAL',
        beneficiaryFullName: fullName,
        countryOfResidence: body.countryOfResidence || body.country || 'International',
        cityStatePostalAddress: body.cityStatePostalAddress || '',
        whatsappPhone: body.whatsappPhone || body.phone || '',
        verifiedEmail: submittedEmail,
        settlementRail: body.settlementRail || 'BANK_WIRE',
        railDetails: body.railDetails || {},
        estimatedEquivalents: body.estimatedEquivalents || {},
        complianceConfirmed: Boolean(body.complianceConfirmed),
        balanceBeforeGHS: currentAffiliateBalance,
        balanceAfterGHS: newBalance,
      };

      try {
        await supabaseAdmin.from('affiliate_payouts').insert({
          user_id: userId,
          affiliate_code: resolvedAffiliateCode,
          reference: payoutRef,
          amount_ghs: requestedAmount,
          payout_mode: 'GLOBAL_MANUAL',
          status: 'PENDING',
          payment_details: paymentDetailsPayload,
          created_at: timestampGMT,
        });
      } catch (_) {}
    }

    // Record in-app notification for the user
    try {
      await supabaseAdmin.from('affiliate_notifications').insert({
        user_id: userId,
        title:
          payoutMode === 'PAYSTACK_AUTO' && !isManualFallback
            ? `⚡ Payout Dispatched (${payoutRef})`
            : `✅ Payout Request Received (${payoutRef})`,
        subtitle: `Amount: GH₵ ${requestedAmount.toFixed(2)} • Remaining Balance: GH₵ ${newBalance.toFixed(2)}`,
        amount_ghs: requestedAmount,
        read: false,
        created_at: timestampGMT,
      });
    } catch (_) {}

    // ========================================================================
    // 5. DUAL RESEND EMAIL DISPATCH (AFFILIATE USER + ADMIN AUDIT SHEET)
    // ========================================================================
    const resend = getResendClient();
    const adminEmail = getAdminAffiliateEmail();
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'HorPal Treasury <onboarding@resend.dev>';

    const recipientEmails = Array.from(
      new Set([profile.email, submittedEmail].map((e) => (e || '').trim()).filter(Boolean))
    );

    const bankOrNetworkLabel =
      body.providerName || body.bankCode || body.settlementRail || 'Designated Settlement Account';
    const accountNumberLabel =
      body.accountNumber ||
      body.railDetails?.accountNumberOrIban ||
      body.railDetails?.walletAddress ||
      body.railDetails?.registeredAccountTag ||
      'Verified Account';
    const countryLabel =
      body.countryOfResidence || body.country || 'International';
    const settlementRailLabel =
      body.settlementRail || body.settlementMethod || 'Global Settlement Rail';

    // EMAIL #1 — TO THE AFFILIATE USER
    if (recipientEmails.length > 0 && (process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY)) {
      const isAutoSuccess = payoutMode === 'PAYSTACK_AUTO' && !isManualFallback;
      const userSubject = isAutoSuccess
        ? `🎉 HorPal Payout Sent! GH₵ ${requestedAmount.toFixed(2)} Transferred (${payoutRef})`
        : `✅ HorPal Payout Request Received — GH₵ ${requestedAmount.toFixed(2)} (${payoutRef})`;

      const userHtml = isAutoSuccess
        ? `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070b14; color: #f8fafc; padding: 36px; border-radius: 16px; max-width: 620px; margin: 0 auto; border: 1px solid #10b981;">
            <h2 style="color: #10b981; margin-top: 0; font-size: 22px;">🎉 HorPal Payout Dispatched via Paystack Instant Transfer</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Hello <strong>${fullName}</strong>, your Friday affiliate payout request has been received, verified against the HorPal ledger, and dispatched via <strong>Paystack Instant Transfer</strong> to your <strong>${bankOrNetworkLabel} (${accountNumberLabel})</strong>.
            </p>
            <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 6px 0; font-size: 14px;"><strong>Amount Sent:</strong> <span style="color: #10b981; font-weight: 800;">GH₵ ${requestedAmount.toFixed(2)}</span></p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Transfer Reference:</strong> <code style="color: #38bdf8;">${payoutRef}</code></p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Destination:</strong> ${bankOrNetworkLabel} (${accountNumberLabel})</p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Remaining Available Balance:</strong> GH₵ ${newBalance.toFixed(2)}</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
              Thank you for building with HorPal Pillar 2 Affiliate Hub.
            </p>
          </div>
        `
        : `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070b14; color: #f8fafc; padding: 36px; border-radius: 16px; max-width: 620px; margin: 0 auto; border: 1px solid #f59e0b;">
            <h2 style="color: #fbbf24; margin-top: 0; font-size: 22px;">✅ HorPal Payout Request Received</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Your payout request (<strong>${payoutRef}</strong>) for <strong>GH₵ ${requestedAmount.toFixed(2)}</strong> has been received and your available balance has been verified. Our Global Settlement Desk is processing your transfer to your designated <strong>${settlementRailLabel}</strong> account (<strong>${countryLabel}</strong>).
            </p>
            <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 6px 0; font-size: 14px;"><strong>Requested Amount:</strong> <span style="color: #fbbf24; font-weight: 800;">GH₵ ${requestedAmount.toFixed(2)}</span></p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Payout Reference:</strong> <code style="color: #38bdf8;">${payoutRef}</code></p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Designated Rail:</strong> ${settlementRailLabel} (${countryLabel})</p>
              <p style="margin: 6px 0; font-size: 14px;"><strong>Remaining Available Balance:</strong> GH₵ ${newBalance.toFixed(2)}</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
              HorPal Executive Global Treasury • Support: horpalservice@gmail.com
            </p>
          </div>
        `;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: recipientEmails,
          subject: userSubject,
          html: userHtml,
        });
      } catch (userMailErr) {
        console.error('[USER PAYOUT EMAIL ERROR]:', userMailErr);
      }
    }

    // EMAIL #2 — TO THE ADMIN (HIGH-CONTRAST EXECUTIVE AUDIT SHEET)
    if (process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY) {
      const adminSubject =
        payoutMode === 'GLOBAL_MANUAL'
          ? `🌍 [GLOBAL MANUAL PAYOUT REQUIRED] GH₵ ${requestedAmount.toFixed(2)} — ${fullName} (${countryLabel}) [${payoutRef}]`
          : isManualFallback
          ? `⚠️ PAYSTACK AUTO-TRANSFER FALLBACK — ACTION REQUIRED: GH₵ ${requestedAmount.toFixed(2)} — ${fullName} [${payoutRef}]`
          : `⚡ [PAYSTACK AUTO-PAYOUT ${transferStatus.toUpperCase()}] GH₵ ${requestedAmount.toFixed(2)} — ${fullName} [${payoutRef}]`;

      const railDetails = body.railDetails || {};
      const coordinatesHtml =
        payoutMode === 'PAYSTACK_AUTO'
          ? `
            <p style="margin: 5px 0;"><strong>Full Legal Name:</strong> ${fullName}</p>
            <p style="margin: 5px 0;"><strong>Affiliate Code:</strong> ${resolvedAffiliateCode}</p>
            <p style="margin: 5px 0;"><strong>Account Email:</strong> ${profile.email || submittedEmail}</p>
            <p style="margin: 5px 0;"><strong>Phone / WhatsApp:</strong> ${body.phone || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Eligible Country:</strong> ${countryLabel}</p>
            <p style="margin: 5px 0;"><strong>Settlement Method:</strong> ${body.settlementMethod || 'MOBILE_MONEY'}</p>
            <p style="margin: 5px 0;"><strong>Provider / Bank Name:</strong> ${body.providerName || body.bankCode}</p>
            <p style="margin: 5px 0;"><strong>Paystack Bank Code:</strong> ${body.bankCode}</p>
            <p style="margin: 5px 0;"><strong>Account / MoMo Number:</strong> <code style="color: #fde047; font-size: 15px;">${body.accountNumber}</code></p>
            <p style="margin: 5px 0;"><strong>Paystack Recipient Code:</strong> ${recipientCode || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Paystack Transfer Code:</strong> ${transferCode || 'N/A'}</p>
            ${
              isManualFallback
                ? `<p style="margin: 8px 0; color: #f87171;"><strong>⚠️ Fallback Reason:</strong> ${fallbackReason}</p>`
                : ''
            }
          `
          : `
            <p style="margin: 5px 0;"><strong>Beneficiary Full Legal Name:</strong> ${fullName}</p>
            <p style="margin: 5px 0;"><strong>Affiliate Code:</strong> ${resolvedAffiliateCode}</p>
            <p style="margin: 5px 0;"><strong>Verified Email:</strong> ${submittedEmail}</p>
            <p style="margin: 5px 0;"><strong>Active WhatsApp / Phone:</strong> ${body.whatsappPhone || body.phone || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Country of Residence:</strong> ${countryLabel}</p>
            <p style="margin: 5px 0;"><strong>City / State / Postal Address:</strong> ${body.cityStatePostalAddress || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Preferred Global Settlement Rail:</strong> <span style="color: #fbbf24; font-weight: bold;">${body.settlementRail}</span></p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
            ${
              body.settlementRail === 'BANK_WIRE'
                ? `
                  <p style="margin: 5px 0;"><strong>Bank Name:</strong> ${railDetails.bankName || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Bank Branch Address:</strong> ${railDetails.bankBranchAddress || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Account Number / IBAN:</strong> <code style="color: #fde047; font-size: 15px;">${railDetails.accountNumberOrIban || 'N/A'}</code></p>
                  <p style="margin: 5px 0;"><strong>SWIFT / BIC Code:</strong> <code style="color: #38bdf8; font-size: 15px;">${railDetails.swiftBicCode || 'N/A'}</code></p>
                  <p style="margin: 5px 0;"><strong>Routing / Sort Code:</strong> ${railDetails.routingOrSortCode || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Account Currency:</strong> ${railDetails.accountCurrency || 'USD'}</p>
                `
                : (body.settlementRail === 'CRYPTO_USDT' || body.settlementRail === 'USDT_CRYPTO')
                ? `
                  <p style="margin: 5px 0;"><strong>USDT Network:</strong> <span style="color: #10b981; font-weight: bold;">${railDetails.network || 'USDT-TRC20'}</span></p>
                  <p style="margin: 5px 0;"><strong>USDT Wallet Address:</strong> <code style="color: #fde047; font-size: 15px;">${railDetails.walletAddress || 'N/A'}</code></p>
                `
                : `
                  <p style="margin: 5px 0;"><strong>Wallet / Regional Provider:</strong> ${railDetails.providerName || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Registered Email / Phone / Tag:</strong> <code style="color: #fde047; font-size: 15px;">${railDetails.registeredAccountTag || 'N/A'}</code></p>
                  <p style="margin: 5px 0;"><strong>Receiving Currency:</strong> ${railDetails.receivingCurrency || 'USD'}</p>
                `
            }
          `;

      const adminHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #050811; color: #f8fafc; padding: 36px; border-radius: 16px; max-width: 720px; margin: 0 auto; border: 2px solid #334155;">
          <h1 style="color: #fbbf24; margin-top: 0; font-size: 22px; border-bottom: 1px solid #334155; padding-bottom: 14px;">
            ${
              isManualFallback
                ? '⚠️ PAYSTACK AUTO-TRANSFER FALLBACK — ACTION REQUIRED'
                : payoutMode === 'GLOBAL_MANUAL'
                ? '🌍 GLOBAL MANUAL SETTLEMENT DOSSIER'
                : '⚡ PAYSTACK AUTOMATED PAYOUT AUDIT SHEET'
            }
          </h1>

          <!-- SECTION 1: SETTLEMENT MODE & STATUS -->
          <div style="background-color: #0f172a; border-left: 4px solid #38bdf8; padding: 18px; border-radius: 10px; margin-bottom: 22px;">
            <h3 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
              Section 1: Settlement Mode & Status
            </h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Settlement Mode:</strong> ${payoutMode}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Execution Status:</strong> <span style="color: #10b981; font-weight: bold;">${dbPayoutStatus} (${transferStatus.toUpperCase()})</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Payout Reference ID:</strong> <code style="color: #fde047;">${payoutRef}</code></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Timestamp (GMT):</strong> ${timestampGMT}</p>
          </div>

          <!-- SECTION 2: SERVER-VERIFIED FINANCIAL AUDIT (100% DB VERIFIED) -->
          <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 18px; border-radius: 10px; margin-bottom: 22px;">
            <h3 style="color: #10b981; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
              Section 2: Server-Verified Financial Audit (100% DB Verified)
            </h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Verified Balance Before Payout:</strong> GH₵ ${currentAffiliateBalance.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Payout Amount Requested & Deducted:</strong> <span style="color: #fbbf24; font-weight: 800;">GH₵ ${requestedAmount.toFixed(2)}</span></p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Verified Balance After Deduction:</strong> GH₵ ${newBalance.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Total Lifetime Verified Sales & Commissions:</strong> ${verifiedSalesCount} sales (GH₵ ${verifiedCommissionsTotal.toFixed(2)})</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Total Verified Wallet Deposits:</strong> GH₵ ${verifiedDepositsTotal.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Total Lifetime Withdrawals:</strong> GH₵ ${newTotalWithdrawn.toFixed(2)}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #34d399; font-weight: 800;">
              Audit Verdict: ✅ PASSED SERVER-SIDE DATABASE VERIFICATION
            </p>
          </div>

          <!-- SECTION 3: COMPLETE BENEFICIARY & BANKING / CRYPTO / MOMO COORDINATES -->
          <div style="background-color: #0f172a; border-left: 4px solid #f59e0b; padding: 18px; border-radius: 10px;">
            <h3 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
              Section 3: Complete Beneficiary & Banking / Crypto / MoMo Coordinates
            </h3>
            <div style="font-size: 14px; line-height: 1.6;">
              ${coordinatesHtml}
            </div>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: adminEmail,
          subject: adminSubject,
          html: adminHtml,
        });
      } catch (adminMailErr) {
        console.error('[ADMIN PAYOUT EMAIL ERROR]:', adminMailErr);
      }
    }

    return NextResponse.json({
      success: true,
      payoutRef,
      payoutMode,
      status: dbPayoutStatus,
      transferStatus,
      isManualFallback,
      newBalance,
      newTotalWithdrawn,
    });
  } catch (error: any) {
    console.error('[PAYOUT ENGINE ERROR]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error processing payout.' },
      { status: 500 }
    );
  }
}
