import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminClient, paywallErrorResponse, requireAuthedUser } from '../../../../lib/server/paywall';
import { sendPayoutRequestReceivedGmail } from '../../../../lib/gmailSmtp';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    const [{ data: requests, error: reqErr }, { data: profile }, { data: platformSettings }] = await Promise.all([
      admin
        .from('pillar2_payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      admin
        .from('profiles')
        .select('affiliate_balance, affiliate_withdrawn, affiliate_total_earned, affiliate_total_sales, allow_early_payout_override, is_suspended, suspension_reason')
        .eq('id', user.id)
        .maybeSingle(),
      admin
        .from('platform_settings')
        .select('force_open_friday_payouts, freeze_p2_withdrawals')
        .eq('id', 1)
        .maybeSingle(),
    ]);

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      requests: requests || [],
      affiliate_balance: Number(profile?.affiliate_balance ?? 0),
      affiliate_withdrawn: Number(profile?.affiliate_withdrawn ?? 0),
      allow_early_payout_override: Boolean(profile?.allow_early_payout_override),
      force_open_friday_payouts: Boolean(platformSettings?.force_open_friday_payouts),
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    // Phase 2 Kill Switch Check & Friday Payout Override Check
    const [{ data: platformSettings }, { data: userProfile }] = await Promise.all([
      admin
        .from('platform_settings')
        .select('freeze_p2_withdrawals, force_open_friday_payouts')
        .eq('id', 1)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('allow_early_payout_override, is_suspended, suspension_reason')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (userProfile?.is_suspended) {
      return NextResponse.json(
        {
          error: 'Account is currently suspended',
          is_suspended: true,
          suspension_reason:
            userProfile.suspension_reason ||
            'Your account has been temporarily suspended by Administration. Please contact support to resolve.',
        },
        { status: 403 }
      );
    }

    if (platformSettings?.freeze_p2_withdrawals) {
      return NextResponse.json(
        { error: '⏸️ Withdrawals are temporarily paused for scheduled settlement auditing.' },
        { status: 403 }
      );
    }

    // Strict GMT Friday Detection (or Admin Override)
    const isFridayGMT = new Date().getUTCDay() === 5;
    const isFridayPayoutWindowOpen =
      isFridayGMT ||
      Boolean(platformSettings?.force_open_friday_payouts) ||
      Boolean(userProfile?.allow_early_payout_override);

    if (!isFridayPayoutWindowOpen) {
      return NextResponse.json(
        { error: 'Payout requests are strictly restricted to Fridays (00:00 - 23:59 GMT).' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedAmount = Number(Number(body?.amountGHS ?? body?.amount_ghs ?? 0).toFixed(2));
    const payoutMethod = String(body?.payoutMethod ?? body?.payout_method ?? '').trim();
    const accountName = String(body?.accountName ?? body?.account_name ?? '').trim();
    const accountNumber = String(body?.accountNumber ?? body?.account_number ?? '').trim();
    const bankOrNetwork = String(body?.bankOrNetwork ?? body?.bank_or_network ?? payoutMethod).trim();
    const affiliatePhone = String(body?.phone ?? body?.affiliatePhone ?? body?.affiliate_phone ?? '').trim();
    const affiliateName = String(body?.affiliateName ?? body?.affiliate_name ?? '').trim();
    const affiliateEmail = String(body?.affiliateEmail ?? body?.affiliate_email ?? user.email ?? '').trim().toLowerCase();

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: 'Please enter a valid withdrawal amount greater than GH₵ 0.00.' },
        { status: 400 }
      );
    }

    if (!payoutMethod || !accountName || !accountNumber) {
      return NextResponse.json(
        { error: 'Please provide Payout Method, Account Holder Name, and Account / MoMo Number.' },
        { status: 400 }
      );
    }

    // Atomic server-side balance check, deduction, and row creation in public.pillar2_payout_requests
    const { data: rpcData, error: rpcError } = await admin.rpc('request_pillar2_payout_rpc', {
      p_user_id: user.id,
      p_amount_ghs: requestedAmount,
      p_payout_method: payoutMethod,
      p_account_name: accountName,
      p_account_number: accountNumber,
      p_bank_or_network: bankOrNetwork || null,
      p_affiliate_phone: affiliatePhone || null,
      p_affiliate_name: affiliateName || null,
      p_affiliate_email: affiliateEmail || null,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || 'Could not process payout request.' },
        { status: 400 }
      );
    }

    if (!rpcData?.success || !rpcData?.request) {
      return NextResponse.json(
        {
          error: rpcData?.error || 'Insufficient verified affiliate balance.',
          available_balance: rpcData?.available_balance,
        },
        { status: 400 }
      );
    }

    const reqRow = rpcData.request;
    const balanceBefore = Number(rpcData.balance_before_ghs ?? reqRow.balance_before_ghs ?? 0);
    const balanceAfter = Number(rpcData.balance_after_ghs ?? reqRow.balance_after_ghs ?? 0);

    // If user used their 1-Time Early Payout Pass on a non-Friday (or whenever active), automatically reset it to false
    const earlyPassConsumed = Boolean(userProfile?.allow_early_payout_override);
    if (earlyPassConsumed) {
      try {
        await admin
          .from('profiles')
          .update({ allow_early_payout_override: false })
          .eq('id', user.id);
      } catch (_) {}
    }

    // Notify affiliate inside dashboard bell
    try {
      await admin.from('affiliate_notifications').insert({
        user_id: user.id,
        title: `💸 Payout Request Submitted: GH₵ ${requestedAmount.toFixed(2)}`,
        subtitle: `${payoutMethod} (${accountNumber}) • Status: Pending Review`,
        amount_ghs: -requestedAmount,
        read: false,
      });
    } catch (_) {}

    // PHASE 3 Email #1 — Official Digitstem-style Friday Payout Request Received Email via Gmail SMTP (to affiliate + copy to GMAIL_SMTP_USER)
    const payoutMethodDisplay =
      reqRow.bank_or_network && reqRow.bank_or_network !== reqRow.payout_method
        ? `${reqRow.payout_method} (${reqRow.bank_or_network})`
        : reqRow.payout_method || payoutMethod;

    const gmailRes = await sendPayoutRequestReceivedGmail({
      affiliateEmail: reqRow.affiliate_email || affiliateEmail || user.email || '',
      affiliateName: reqRow.affiliate_name || affiliateName || 'Valued Affiliate',
      amountGhs: requestedAmount,
      payoutMethod: payoutMethodDisplay,
      accountNumber: reqRow.account_number || accountNumber,
      accountName: reqRow.account_name || accountName,
      balanceAfterGhs: balanceAfter,
      requestId: reqRow.id,
    });

    // Dispatch urgent Gmail alert via existing Resend setup
    const resend = getResendClient();
    const adminTo = process.env.ADMIN_CONTACT_EMAIL_AFFILIATE || 'geestablish@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'HorPal Treasury <onboarding@resend.dev>';

    let emailSent = Boolean(gmailRes?.sent);
    let emailError: string | null = gmailRes?.error || null;

    if (resend) {
      try {
        const subject = `💸 New Pillar 2 Payout Request: GH₵ ${requestedAmount.toFixed(2)} — ${reqRow.affiliate_name} (${reqRow.payout_method})`;
        const { error: resendErr } = await resend.emails.send({
          from: fromEmail,
          to: [adminTo],
          replyTo: reqRow.affiliate_email || user.email || undefined,
          subject,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;background:#070b14;color:#f8fafc;padding:28px;border-radius:18px;border:1px solid #334155;max-width:640px;margin:0 auto;">
              <div style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:20px;">
                <span style="display:inline-block;background:#10b981;color:#000;font-weight:900;font-size:11px;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.08em;">Urgent Payout Request • Pillar 2 Treasury</span>
                <h1 style="margin:12px 0 4px 0;font-size:22px;color:#ffffff;">💸 GH₵ ${requestedAmount.toFixed(2)} Payout Requested</h1>
                <p style="margin:0;color:#94a3b8;font-size:13px;">Funds have been atomically reserved from the affiliate's balance. Update status inside <strong>/geemings-command-x9v2 → Payouts</strong>.</p>
              </div>

              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:16px;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;width:44%;">Affiliate Name</td>
                    <td style="padding:8px 0;color:#ffffff;font-weight:800;">${escapeHtml(reqRow.affiliate_name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Email</td>
                    <td style="padding:8px 0;color:#38bdf8;">${escapeHtml(reqRow.affiliate_email)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Phone Number</td>
                    <td style="padding:8px 0;color:#ffffff;">${escapeHtml(reqRow.affiliate_phone || 'Not provided')}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Affiliate Code</td>
                    <td style="padding:8px 0;color:#fbbf24;font-family:monospace;font-weight:800;">${escapeHtml(reqRow.affiliate_code)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Requested Amount</td>
                    <td style="padding:8px 0;color:#10b981;font-size:16px;font-weight:900;">GH₵ ${requestedAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Payout Method</td>
                    <td style="padding:8px 0;color:#ffffff;font-weight:700;">${escapeHtml(reqRow.payout_method)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">MoMo Network / Bank</td>
                    <td style="padding:8px 0;color:#e2e8f0;font-weight:700;">${escapeHtml(reqRow.bank_or_network || reqRow.payout_method)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Account / MoMo Number</td>
                    <td style="padding:8px 0;color:#fbbf24;font-family:monospace;font-size:15px;font-weight:900;">${escapeHtml(reqRow.account_number)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Account Holder Name</td>
                    <td style="padding:8px 0;color:#ffffff;font-weight:700;">${escapeHtml(reqRow.account_name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Balance Before → After</td>
                    <td style="padding:8px 0;color:#94a3b8;font-family:monospace;">GH₵ ${balanceBefore.toFixed(2)} → <strong style="color:#ffffff;">GH₵ ${balanceAfter.toFixed(2)}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Request ID & Timestamp</td>
                    <td style="padding:8px 0;color:#94a3b8;font-family:monospace;">${escapeHtml(reqRow.id)} • ${escapeHtml(reqRow.created_at)}</td>
                  </tr>
                </table>
              </div>

              <div style="background:#172554;border:1px solid #3b82f6;border-radius:12px;padding:14px;font-size:12px;color:#bfdbfe;">
                <strong>Next Step in Admin Command Centre (/geemings-command-x9v2):</strong><br/>
                Click <strong>"🔄 Set to Processing..."</strong> while initiating the transfer so the affiliate sees live progress, then click <strong>"✅ Mark as Paid & Settled"</strong> once settled.
              </div>
            </div>
          `,
        });

        if (resendErr) {
          emailError = resendErr.message || 'Resend dispatch error';
          console.error('Resend payout alert error:', resendErr);
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        emailError = err?.message || 'Resend exception';
        console.error('Resend payout exception:', err);
      }
    }

    return NextResponse.json({
      success: true,
      request: reqRow,
      balance_before_ghs: balanceBefore,
      balance_after_ghs: balanceAfter,
      early_pass_consumed: earlyPassConsumed,
      emailSent,
      emailError,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
