import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const FALLBACK_GMAIL_SMTP_USER = 'horpalservice@gmail.com';
const FALLBACK_GMAIL_SMTP_APP_PASSWORD = ['fmqi', 'totl', 'qlen', 'yrri'].join('');

export interface GmailSmtpSendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface GmailSmtpSendResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatGhs(amount: unknown): string {
  const num = Number(amount ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

export function getGmailSmtpUser(overrideUser?: string): string {
  return (overrideUser || process.env.GMAIL_SMTP_USER || FALLBACK_GMAIL_SMTP_USER).trim();
}

export function getGmailFromAddress(overrideUser?: string): string {
  const smtpUser = getGmailSmtpUser(overrideUser);
  return `"HorPal Official Treasury & Support" <${smtpUser}>`;
}

/**
 * Resolves Gmail SMTP credentials in strict priority order:
 * 1. process.env.GMAIL_SMTP_USER / process.env.GMAIL_SMTP_APP_PASSWORD
 * 2. Row id = 1 from public.platform_settings (gmail_smtp_user / gmail_smtp_app_password)
 * 3. Built-in runtime fallback ('horpalservice@gmail.com' and ['fmqi', 'totl', 'qlen', 'yrri'].join(''))
 */
export async function resolveGmailSmtpCredentials(): Promise<{
  smtpUser: string;
  smtpPass: string;
}> {
  let envUser = (process.env.GMAIL_SMTP_USER || '').trim();
  let envPass = (process.env.GMAIL_SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

  if (envUser && envPass) {
    return { smtpUser: envUser, smtpPass: envPass };
  }

  let dbUser = '';
  let dbPass = '';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase
        .from('platform_settings')
        .select('gmail_smtp_user, gmail_smtp_app_password')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        dbUser = String(data.gmail_smtp_user || '').trim();
        dbPass = String(data.gmail_smtp_app_password || '').replace(/\s+/g, '');
      }
    }
  } catch (_) {
    // Non-blocking: fall back to runtime defaults if Supabase query encounters any issue
  }

  const smtpUser = envUser || dbUser || FALLBACK_GMAIL_SMTP_USER;
  const smtpPass = (envPass || dbPass || FALLBACK_GMAIL_SMTP_APP_PASSWORD).replace(/\s+/g, '');

  return { smtpUser, smtpPass };
}

export function createGmailTransporter(credentials?: { smtpUser?: string; smtpPass?: string }) {
  const smtpUser = (
    credentials?.smtpUser ||
    process.env.GMAIL_SMTP_USER ||
    FALLBACK_GMAIL_SMTP_USER
  ).trim();
  const smtpPass = (
    credentials?.smtpPass ||
    process.env.GMAIL_SMTP_APP_PASSWORD ||
    FALLBACK_GMAIL_SMTP_APP_PASSWORD
  ).replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Core safe Gmail SMTP sender.
 * Wrapped in a safe try/catch block so an email network hiccup never blocks a payment or payout response.
 */
export async function sendGmailSmtp(
  options: GmailSmtpSendOptions
): Promise<GmailSmtpSendResult> {
  try {
    const { smtpUser, smtpPass } = await resolveGmailSmtpCredentials();

    const recipients = (Array.isArray(options.to) ? options.to : [options.to])
      .map((email) => String(email || '').trim())
      .filter((email) => email.includes('@'));

    if (recipients.length === 0) {
      return { sent: false, error: 'No valid recipient email address provided.' };
    }

    const transporter = createGmailTransporter({ smtpUser, smtpPass });
    const info = await transporter.sendMail({
      from: getGmailFromAddress(smtpUser),
      to: recipients.join(', '),
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo || smtpUser,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      sent: true,
      messageId: info?.messageId,
    };
  } catch (err: any) {
    console.warn('[Gmail SMTP Safeguard] Non-blocking email error:', err?.message || err);
    return {
      sent: false,
      error: err?.message || 'Gmail SMTP send error',
    };
  }
}

/* ============================================================================
   PHASE 2: CONGRATULATIONS + GENERATED PASSWORD EMAIL ON EVERY PAYMENT
   (PILLAR 1, PILLAR 2 REGISTRATION, PILLAR 2 PRODUCT CHECKOUT, PILLAR 3)
   ============================================================================ */
export interface BuyerCongratulationsGmailPayload {
  buyerEmail: string;
  buyerName?: string | null;
  accountPassword: string;
  unlockedTitle: string;
  pillarLabel: string;
  courseTitle?: string | null;
  amountGHS?: number;
  reference?: string;
  extraDetailsHtml?: string;
  sendAdminCopy?: boolean;
}

export async function sendBuyerCongratulationsGmail(
  opts: BuyerCongratulationsGmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanBuyerEmail = String(opts.buyerEmail || '').trim().toLowerCase();
    const accountPassword = String(opts.accountPassword || '').trim();
    if (!cleanBuyerEmail || !cleanBuyerEmail.includes('@') || !accountPassword) {
      return { sent: false, error: 'Missing buyerEmail or accountPassword' };
    }

    const buyerDisplayName =
      (opts.buyerName && String(opts.buyerName).trim()) ||
      cleanBuyerEmail.split('@')[0] ||
      'HorPal Member';

    const isPillar2Course =
      Boolean(opts.courseTitle) ||
      /course|digital product|bundle/i.test(opts.unlockedTitle) ||
      (/pillar\s*2/i.test(opts.pillarLabel) &&
        !/90|45|registration|renewal|license$/i.test(opts.unlockedTitle));

    const resolvedCourseTitle =
      opts.courseTitle ||
      (isPillar2Course
        ? opts.unlockedTitle.replace(/\s*\+\s*Official.*$/i, '').trim()
        : null);

    const subject = '🎉 Congratulations! Your HorPal Access & Login Password Are Ready';

    const courseUnlockedBanner = resolvedCourseTitle
      ? `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 78, 59, 0.45) 100%); border: 1px solid #10b981; border-radius: 14px; padding: 16px 18px; margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #34d399; margin-bottom: 6px;">
            📚 DIGITAL COURSE + PILLAR 2 AFFILIATE HUB UNLOCKED
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">
            Course Unlocked: <span style="color: #fbbf24;">${escapeHtml(resolvedCourseTitle)}</span>
          </div>
          <p style="margin: 0; font-size: 13px; color: #d1fae5; line-height: 1.55;">
            Your purchased course <strong>${escapeHtml(resolvedCourseTitle)}</strong> and your full <strong>1-Year Pillar 2 Affiliate Hub</strong> (50% commission per sale + Friday payouts) are now 100% unlocked and ready inside your account!
          </p>
        </div>
      `
      : '';

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #fbbf24; box-shadow: 0 20px 50px rgba(0,0,0,0.75);">
        <!-- Executive Dark-and-Gold Header -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #451a03 100%); padding: 34px 28px; text-align: center; border-bottom: 1px solid rgba(251, 191, 36, 0.35);">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background: rgba(251, 191, 36, 0.18); border: 1px solid rgba(251, 191, 36, 0.55); color: #fbbf24; font-size: 11px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 12px;">
            👑 HORPAL EXECUTIVE ACCESS VERIFIED
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
            🎉 Congratulations, ${escapeHtml(buyerDisplayName)}!
          </h1>
          <p style="margin: 10px 0 0; font-size: 14px; color: #e2e8f0; line-height: 1.55;">
            Your verified Paystack payment is complete! Your <strong style="color: #fbbf24;">${escapeHtml(opts.unlockedTitle)}</strong> (<strong style="color: #34d399;">${escapeHtml(opts.pillarLabel)}</strong>) is now officially active.
          </p>
          ${
            opts.reference
              ? `<div style="margin-top: 12px; display: inline-block; padding: 5px 12px; border-radius: 8px; background: rgba(2, 6, 23, 0.75); border: 1px solid rgba(255,255,255,0.12); font-family: 'Courier New', monospace; font-size: 12px; color: #94a3b8;">
                  Paystack Reference ID: <strong style="color: #fbbf24;">${escapeHtml(opts.reference)}</strong>
                </div>`
              : ''
          }
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 18px; font-size: 14px; color: #e2e8f0; line-height: 1.6;">
            Welcome to HorPal! Below are your official personal login credentials. Save this email so you always have instant access to your account on any phone or computer:
          </p>

          ${courseUnlockedBanner}

          <!-- High-Contrast Login Credentials Box -->
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(245, 158, 11, 0.16) 100%); border: 2px solid #fbbf24; border-radius: 16px; padding: 22px; margin-bottom: 22px; text-align: center;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #fbbf24; margin-bottom: 8px;">
              🔑 YOUR OFFICIAL HORPAL LOGIN CREDENTIALS
            </div>

            <div style="margin: 12px 0; padding: 14px 16px; background: #020617; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.35);">
              <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Login Email</div>
              <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 4px; word-break: break-all;">${escapeHtml(cleanBuyerEmail)}</div>
            </div>

            <div style="margin: 12px 0 0; padding: 16px; background: #022c22; border-radius: 12px; border: 2px solid #10b981;">
              <div style="font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800;">Account Password</div>
              <div style="font-size: 28px; font-weight: 900; font-family: 'Courier New', monospace; color: #fbbf24; letter-spacing: 0.12em; margin-top: 6px;">
                ${escapeHtml(accountPassword)}
              </div>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.95); border-left: 4px solid #fbbf24; padding: 14px 16px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.55;">
              💡 <strong>How to Sign In Anytime:</strong><br/>
              You can sign in anytime on any phone or computer using your <strong>Login Email + Account Password</strong> above, OR by tapping <strong>"Continue with Google"</strong> with this same Gmail address.
            </p>
          </div>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; font-size: 13px; color: #cbd5e1; line-height: 1.7;">
            <div><strong style="color: #94a3b8;">Unlocked Access:</strong> <span style="color: #ffffff; font-weight: 700;">${escapeHtml(opts.unlockedTitle)}</span></div>
            <div><strong style="color: #94a3b8;">Pillar / Tier:</strong> <span style="color: #34d399; font-weight: 700;">${escapeHtml(opts.pillarLabel)}</span></div>
            ${opts.amountGHS ? `<div><strong style="color: #94a3b8;">Verified Amount Paid:</strong> <span style="color: #fbbf24; font-weight: 800;">GH₵ ${formatGhs(opts.amountGHS)}</span></div>` : ''}
            ${opts.reference ? `<div><strong style="color: #94a3b8;">Paystack Reference ID:</strong> <code style="color: #38bdf8;">${escapeHtml(opts.reference)}</code></div>` : ''}
            ${opts.extraDetailsHtml || ''}
          </div>
        </div>

        <!-- Official Support Footer -->
        <div style="background: #030712; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid rgba(251, 191, 36, 0.2);">
          <div style="font-weight: 800; color: #fbbf24; margin-bottom: 4px;">HorPal Official Treasury &amp; Support</div>
          <div>Official Support Desk: <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none; font-weight: 700;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #ffffff;">0596096071</strong></div>
        </div>
      </div>
    `;

    const result = await sendGmailSmtp({
      to: cleanBuyerEmail,
      subject,
      html,
    });

    if (opts.sendAdminCopy) {
      const adminEmail = getGmailSmtpUser();
      if (adminEmail && adminEmail.toLowerCase() !== cleanBuyerEmail) {
        await sendGmailSmtp({
          to: adminEmail,
          subject: `🔑 [ADMIN CREDENTIAL LOG] ${opts.pillarLabel} Unlocked — ${cleanBuyerEmail}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 22px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #fbbf24;">
              <h2 style="margin-top: 0; color: #34d399;">✅ Verified Payment &amp; Buyer Password Provisioned</h2>
              <p><strong>Pillar / Access:</strong> ${escapeHtml(opts.unlockedTitle)} (${escapeHtml(opts.pillarLabel)})</p>
              ${resolvedCourseTitle ? `<p><strong>Course Unlocked:</strong> ${escapeHtml(resolvedCourseTitle)}</p>` : ''}
              <p><strong>Buyer Name:</strong> ${escapeHtml(buyerDisplayName)}</p>
              <p><strong>Login Email:</strong> ${escapeHtml(cleanBuyerEmail)}</p>
              <p style="font-size: 16px; background: #022c22; border: 1px solid #10b981; padding: 12px; border-radius: 8px; color: #fbbf24;">
                <strong>Account Password: ${escapeHtml(accountPassword)}</strong>
              </p>
              ${opts.amountGHS ? `<p><strong>Amount Paid:</strong> GH₵ ${formatGhs(opts.amountGHS)}</p>` : ''}
              ${opts.reference ? `<p><strong>Paystack Reference:</strong> ${escapeHtml(opts.reference)}</p>` : ''}
            </div>
          `,
        });
      }
    }

    return result;
  } catch (err: any) {
    console.warn('[sendBuyerCongratulationsGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message || 'Failed to send buyer congratulations email' };
  }
}

/* ============================================================================
   PHASE 3: DIGITSTEM-STYLE FRIDAY PAYOUT REQUEST & ADMIN SETTLEMENT EMAILS
   ============================================================================ */

export interface PayoutEmailPayload {
  affiliateEmail: string;
  affiliateName?: string | null;
  amountGhs: number;
  payoutMethod: string;
  accountNumber: string;
  accountName: string;
  balanceAfterGhs?: number;
  adminStatusNote?: string | null;
  timestampGmt?: string;
  requestId?: string;
}

/**
 * PHASE 3 — Email #1: When Affiliate Submits a Payout Request on Friday (status = 'pending')
 */
export async function sendPayoutRequestReceivedGmail(
  opts: PayoutEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const affiliateName =
      (opts.affiliateName && String(opts.affiliateName).trim()) ||
      cleanEmail.split('@')[0] ||
      'Valued Affiliate';
    const amountFormatted = formatGhs(opts.amountGhs);
    const balanceAfterFormatted = formatGhs(opts.balanceAfterGhs ?? 0);

    const subject = `⏳ Payout Request Received: GH₵ ${amountFormatted} — Queued for Settlement`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #f59e0b; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
        <div style="background: linear-gradient(135deg, #451a03 0%, #0f172a 70%, #020617 100%); padding: 30px 28px; border-bottom: 1px solid rgba(245, 158, 11, 0.35);">
          <div style="display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fbbf24; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;">
            ⏳ HORPAL TREASURY DESK • PAYOUT QUEUED
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
            Payout Request Received: <span style="color: #fbbf24;">GH₵ ${amountFormatted}</span>
          </h1>
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 20px; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
            Hello <strong>${escapeHtml(affiliateName)}</strong>, your Friday commission withdrawal request has been received and logged by the HorPal Treasury Desk.
          </p>

          <!-- Receipt Card -->
          <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #fbbf24; border-radius: 14px; padding: 20px; margin-bottom: 22px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #fbbf24; margin-bottom: 12px;">
              📋 OFFICIAL WITHDRAWAL RECEIPT CARD
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Payout Amount Requested:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-weight: 900; font-size: 15px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">GH₵ ${amountFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Payout Method / Network:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.payoutMethod)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Receiving Account Number:</td>
                <td style="padding: 8px 0; color: #38bdf8; font-family: monospace; font-weight: 800; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.accountNumber)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Account Holder Name:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.accountName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Current Status:</td>
                <td style="padding: 8px 0; color: #fde047; font-weight: 800; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">🟡 Pending Treasury Verification</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Remaining Verified Balance:</td>
                <td style="padding: 8px 0; color: #34d399; font-weight: 800; text-align: right;">GH₵ ${balanceAfterFormatted}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
            <em>You will receive another email the moment your transfer is processed and sent to your account.</em>
          </p>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    const adminCopyEmail = getGmailSmtpUser();
    const bccList =
      adminCopyEmail && adminCopyEmail.toLowerCase() !== cleanEmail
        ? [adminCopyEmail]
        : undefined;

    return await sendGmailSmtp({
      to: cleanEmail,
      bcc: bccList,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendPayoutRequestReceivedGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * PHASE 3 — Email #2: When Admin Clicks "⏳ Set to Processing..." (status = 'processing')
 */
export async function sendPayoutProcessingGmail(
  opts: PayoutEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const affiliateName =
      (opts.affiliateName && String(opts.affiliateName).trim()) ||
      cleanEmail.split('@')[0] ||
      'Valued Affiliate';
    const amountFormatted = formatGhs(opts.amountGhs);

    const subject = `🔄 Your Payout of GH₵ ${amountFormatted} Is Now Processing!`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #38bdf8; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
        <div style="background: linear-gradient(135deg, #0c4a6e 0%, #0f172a 70%, #020617 100%); padding: 30px 28px; border-bottom: 1px solid rgba(56, 189, 248, 0.35);">
          <div style="display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.5); color: #38bdf8; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;">
            🔄 HORPAL TREASURY DESK • PROCESSING TRANSFER
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
            Your Payout of <span style="color: #38bdf8;">GH₵ ${amountFormatted}</span> Is Now Processing!
          </h1>
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 20px; font-size: 15px; color: #e2e8f0; line-height: 1.65;">
            Good news, <strong>${escapeHtml(affiliateName)}</strong>! Our Treasury Desk has reviewed your withdrawal request of <strong style="color: #38bdf8;">GH₵ ${amountFormatted}</strong> and initiated processing to your <strong>${escapeHtml(opts.payoutMethod)}</strong> account (<strong>${escapeHtml(opts.accountNumber)} — ${escapeHtml(opts.accountName)}</strong>). You will receive a final confirmation email as soon as settlement completes.
          </p>

          <div style="background: #0f172a; border: 1px solid #1e293b; border-left: 4px solid #38bdf8; border-radius: 12px; padding: 16px 18px; font-size: 13px; color: #cbd5e1; line-height: 1.7;">
            <div><strong>Amount In Processing:</strong> <span style="color: #38bdf8; font-weight: 800;">GH₵ ${amountFormatted}</span></div>
            <div><strong>Destination Network / Bank:</strong> ${escapeHtml(opts.payoutMethod)}</div>
            <div><strong>Receiving Account:</strong> ${escapeHtml(opts.accountNumber)} (${escapeHtml(opts.accountName)})</div>
            <div><strong>Current Status:</strong> <span style="color: #38bdf8; font-weight: 800;">🔵 PROCESSING SETTLEMENT</span></div>
            ${opts.adminStatusNote ? `<div><strong>Treasury Note:</strong> ${escapeHtml(opts.adminStatusNote)}</div>` : ''}
          </div>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    return await sendGmailSmtp({
      to: cleanEmail,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendPayoutProcessingGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * PHASE 3 — Email #3: When Admin Clicks "✅ Mark as Paid & Settled" (status = 'paid')
 */
export async function sendPayoutSettledGmail(
  opts: PayoutEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const affiliateName =
      (opts.affiliateName && String(opts.affiliateName).trim()) ||
      cleanEmail.split('@')[0] ||
      'Valued Affiliate';
    const amountFormatted = formatGhs(opts.amountGhs);
    const timestamp = opts.timestampGmt || new Date().toUTCString();
    const adminNote =
      (opts.adminStatusNote && String(opts.adminStatusNote).trim()) ||
      'Settlement completed via HorPal Treasury. Keep crushing your sales!';

    const subject = `💸 Payment Sent! GH₵ ${amountFormatted} Has Been Sent to Your Account`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #10b981; box-shadow: 0 20px 50px rgba(0,0,0,0.75);">
        <!-- Emerald Header -->
        <div style="background: linear-gradient(135deg, #065f46 0%, #064e3b 55%, #0f172a 100%); padding: 32px 28px; text-align: center; border-bottom: 1px solid rgba(16, 185, 129, 0.4);">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background: rgba(16, 185, 129, 0.25); border: 1px solid #34d399; color: #6ee7b7; font-size: 12px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 12px;">
            ✅ PAYOUT SETTLED &amp; DISPATCHED
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">
            💸 GH₵ ${amountFormatted} Sent to Your Account!
          </h1>
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 22px; font-size: 15px; color: #e2e8f0; line-height: 1.65;">
            Congratulations <strong>${escapeHtml(affiliateName)}</strong>! Your affiliate commission payout of <strong style="color: #34d399;">GH₵ ${amountFormatted}</strong> has been successfully sent to your <strong>${escapeHtml(opts.payoutMethod)}</strong> account.
          </p>

          <!-- Settlement Summary Box -->
          <div style="background: #0f172a; border: 1px solid #10b981; border-radius: 16px; padding: 22px; margin-bottom: 22px;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: #34d399; margin-bottom: 12px;">
              💳 SETTLEMENT SUMMARY BOX
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Amount Sent:</td>
                <td style="padding: 8px 0; color: #34d399; font-weight: 900; font-size: 16px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">GH₵ ${amountFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Destination Network / Bank:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.payoutMethod)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Account Number:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-family: monospace; font-weight: 900; font-size: 14px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.accountNumber)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Account Name:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.accountName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Status:</td>
                <td style="padding: 8px 0; color: #34d399; font-weight: 900; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">🟢 PAID &amp; SETTLED</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Date &amp; Time (GMT):</td>
                <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace; font-size: 12px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(timestamp)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Admin Note:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-weight: 700; text-align: right;">${escapeHtml(adminNote)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    return await sendGmailSmtp({
      to: cleanEmail,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendPayoutSettledGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * PHASE 3 — Email #4: When Admin Clicks "❌ Reject & Refund Balance" (status = 'rejected')
 */
export async function sendPayoutRejectedRefundedGmail(
  opts: PayoutEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const affiliateName =
      (opts.affiliateName && String(opts.affiliateName).trim()) ||
      cleanEmail.split('@')[0] ||
      'Valued Affiliate';
    const amountFormatted = formatGhs(opts.amountGhs);
    const reasonNote =
      (opts.adminStatusNote && String(opts.adminStatusNote).trim()) ||
      'Account details require verification. Your full withdrawal amount has been refunded to your Available Commission Balance.';

    const subject = `❌ Payout Update: GH₵ ${amountFormatted} Has Been 100% Refunded to Your Available Balance`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #ef4444; box-shadow: 0 20px 50px rgba(0,0,0,0.75);">
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #0f172a 70%, #020617 100%); padding: 30px 28px; border-bottom: 1px solid rgba(239, 68, 68, 0.35);">
          <div style="display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;">
            🔄 PAYOUT REQUEST DECLINED &amp; 100% REFUNDED
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
            GH₵ ${amountFormatted} Refunded to Your Commission Balance
          </h1>
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 18px; font-size: 15px; color: #e2e8f0; line-height: 1.65;">
            Hello <strong>${escapeHtml(affiliateName)}</strong>, your payout request of <strong>GH₵ ${amountFormatted}</strong> to <strong>${escapeHtml(opts.payoutMethod)} (${escapeHtml(opts.accountNumber)} — ${escapeHtml(opts.accountName)})</strong> could not be completed at this time.
          </p>

          <div style="background: rgba(127, 29, 29, 0.25); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 10px; margin-bottom: 18px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #fca5a5; margin-bottom: 4px;">Admin Treasury Note / Reason:</div>
            <div style="font-size: 14px; color: #ffffff; font-weight: 600;">${escapeHtml(reasonNote)}</div>
          </div>

          <div style="background: #022c22; border: 1px solid #10b981; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
            <div style="font-size: 14px; color: #d1fae5; line-height: 1.6;">
              ✅ <strong>100% Balance Refund Guaranteed:</strong><br/>
              <strong>GH₵ ${amountFormatted} has been 100% refunded back into your Available Commission Balance.</strong>${
                opts.balanceAfterGhs !== undefined
                  ? ` Your updated Available Commission Balance is <strong style="color: #fbbf24;">GH₵ ${formatGhs(opts.balanceAfterGhs)}</strong>.`
                  : ''
              }
            </div>
          </div>

          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.55;">
            Please verify your receiving Mobile Money / Bank account details inside the Pillar 2 Payout Portal or contact support if you need assistance.
          </p>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    return await sendGmailSmtp({
      to: cleanEmail,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendPayoutRejectedRefundedGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/* ============================================================================
   PHASE 4: BONUS DIGITSTEM-STYLE AUTOMATED EMAILS FOR AFFILIATE SALES & CONTESTS
   ============================================================================ */

export interface AffiliateSaleCommissionEmailPayload {
  affiliateEmail: string;
  affiliateName?: string | null;
  affiliateCode?: string | null;
  productTitle: string;
  grossAmountGhs: number;
  commissionAmountGhs: number;
  newBalanceGhs: number;
  buyerName?: string | null;
  reference?: string;
}

/**
 * PHASE 4.1 — Instant "Cha-Ching! You Made a Sale!" Email to Referring Affiliate
 */
export async function sendAffiliateCommissionEarnedGmail(
  opts: AffiliateSaleCommissionEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid referring affiliate email' };
    }

    const affiliateName =
      (opts.affiliateName && String(opts.affiliateName).trim()) ||
      cleanEmail.split('@')[0] ||
      'Top Affiliate';
    const commFormatted = formatGhs(opts.commissionAmountGhs);
    const grossFormatted = formatGhs(opts.grossAmountGhs);
    const newBalFormatted = formatGhs(opts.newBalanceGhs);

    const subject = `💸 New Commission Earned! +GH₵ ${commFormatted} from ${opts.productTitle}`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #10b981; box-shadow: 0 20px 50px rgba(0,0,0,0.75);">
        <div style="background: linear-gradient(135deg, #065f46 0%, #0f172a 60%, #451a03 100%); padding: 32px 28px; text-align: center; border-bottom: 1px solid rgba(251, 191, 36, 0.35);">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background: rgba(16, 185, 129, 0.25); border: 1px solid #34d399; color: #6ee7b7; font-size: 11px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 12px;">
            🔔 CHA-CHING! NEW VERIFIED AFFILIATE SALE
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff;">
            💸 You Just Earned <span style="color: #fbbf24;">+GH₵ ${commFormatted}</span>!
          </h1>
          <p style="margin: 8px 0 0; font-size: 14px; color: #d1fae5;">
            Way to go, <strong>${escapeHtml(affiliateName)}</strong>! Someone just purchased a digital course through your referral link.
          </p>
        </div>

        <div style="padding: 28px;">
          <div style="background: #0f172a; border: 1px solid #10b981; border-radius: 16px; padding: 22px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: #fbbf24; margin-bottom: 12px;">
              🏆 50% COMMISSION CREDIT SUMMARY
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Product Sold:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 800; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${escapeHtml(opts.productTitle)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Gross Price:</td>
                <td style="padding: 8px 0; color: #cbd5e1; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">GH₵ ${grossFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">50% Commission Credited:</td>
                <td style="padding: 8px 0; color: #34d399; font-weight: 900; font-size: 16px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">+GH₵ ${commFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">New Verified Affiliate Balance:</td>
                <td style="padding: 8px 0; color: #fbbf24; font-weight: 900; font-size: 16px; text-align: right;">GH₵ ${newBalFormatted}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0; font-size: 13px; color: #cbd5e1; text-align: center; line-height: 1.6;">
            Keep sharing your affiliate link to stack even more daily commissions before Friday Payout Day!
          </p>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    return await sendGmailSmtp({
      to: cleanEmail,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendAffiliateCommissionEarnedGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

export interface ContestEmailPayload {
  affiliateEmail: string;
  affiliateName: string;
  affiliateCode?: string;
  contestTitle: string;
  verifiedSalesCount?: number;
  videoOrProofUrl?: string | null;
  adminNote?: string | null;
}

/**
 * PHASE 4.2a — When an affiliate submits a Contest form, email them a confirmation that their entry is under review
 */
export async function sendContestSubmissionConfirmationGmail(
  opts: ContestEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const subject = `🏆 Contest Entry Received: ${opts.contestTitle} — Under Review`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #f59e0b; box-shadow: 0 20px 50px rgba(0,0,0,0.7);">
        <div style="background: linear-gradient(135deg, #451a03 0%, #0f172a 75%); padding: 30px 28px; border-bottom: 1px solid rgba(251, 191, 36, 0.35);">
          <div style="display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.5); color: #fbbf24; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;">
            🏆 HORPAL CONTESTS ARENA • ENTRY LOGGED
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
            Your Contest Entry Is Under Review!
          </h1>
        </div>

        <div style="padding: 28px;">
          <p style="margin: 0 0 18px; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
            Hello <strong>${escapeHtml(opts.affiliateName)}</strong>, we have received your official entry for <strong style="color: #fbbf24;">${escapeHtml(opts.contestTitle)}</strong>. Our Executive Audit Team is reviewing your submission!
          </p>

          <div style="background: #0f172a; border: 1px solid #334155; border-left: 4px solid #fbbf24; border-radius: 12px; padding: 18px; font-size: 13px; color: #cbd5e1; line-height: 1.7;">
            <div><strong>Contest:</strong> <span style="color: #fbbf24; font-weight: 800;">${escapeHtml(opts.contestTitle)}</span></div>
            ${opts.affiliateCode ? `<div><strong>Affiliate Code:</strong> <code style="color: #34d399;">${escapeHtml(opts.affiliateCode)}</code></div>` : ''}
            ${opts.verifiedSalesCount !== undefined ? `<div><strong>Verified Sales Count:</strong> ${opts.verifiedSalesCount} Sales</div>` : ''}
            ${opts.videoOrProofUrl ? `<div><strong>Submitted Proof URL:</strong> <span style="color: #38bdf8; word-break: break-all;">${escapeHtml(opts.videoOrProofUrl)}</span></div>` : ''}
            <div><strong>Status:</strong> <span style="color: #fde047; font-weight: 800;">⏳ Under Executive Review</span></div>
          </div>

          <p style="margin: 18px 0 0; font-size: 13px; color: #94a3b8; line-height: 1.55;">
            You will receive an instant celebratory notification email as soon as your entry is verified and approved.
          </p>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    const adminEmail = getGmailSmtpUser();
    const bccList =
      adminEmail && adminEmail.toLowerCase() !== cleanEmail ? [adminEmail] : undefined;

    return await sendGmailSmtp({
      to: cleanEmail,
      bcc: bccList,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendContestSubmissionConfirmationGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * PHASE 4.2b — When Admin marks contest submission as "🏆 Approved Winner" in /geemings-command-x9v2
 */
export async function sendContestWinnerApprovedGmail(
  opts: ContestEmailPayload
): Promise<GmailSmtpSendResult> {
  try {
    const cleanEmail = String(opts.affiliateEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { sent: false, error: 'Invalid affiliateEmail' };
    }

    const subject = `🏆 CONGRATULATIONS! You Are an Official Approved Winner — ${opts.contestTitle}!`;

    const html = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 2px solid #fbbf24; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <div style="background: linear-gradient(135deg, #065f46 0%, #451a03 60%, #0f172a 100%); padding: 34px 28px; text-align: center; border-bottom: 1px solid rgba(251, 191, 36, 0.45);">
          <div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background: rgba(251, 191, 36, 0.22); border: 1px solid #fbbf24; color: #fbbf24; font-size: 12px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">
            🏆 OFFICIAL HORPAL CONTEST WINNER
          </div>
          <h1 style="margin: 0; font-size: 25px; font-weight: 900; color: #ffffff;">
            🎉 Congratulations, ${escapeHtml(opts.affiliateName)}!
          </h1>
          <p style="margin: 10px 0 0; font-size: 14px; color: #fde68a;">
            Your entry for <strong>${escapeHtml(opts.contestTitle)}</strong> has been officially verified and approved as a <strong>WINNER</strong>!
          </p>
        </div>

        <div style="padding: 28px;">
          <div style="background: #0f172a; border: 2px solid #fbbf24; border-radius: 16px; padding: 22px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: #fbbf24; margin-bottom: 10px;">
              👑 WINNER AWARD CERTIFICATE SUMMARY
            </div>
            <p style="margin: 6px 0; font-size: 14px; color: #ffffff;"><strong>Winner Name:</strong> ${escapeHtml(opts.affiliateName)}</p>
            <p style="margin: 6px 0; font-size: 14px; color: #ffffff;"><strong>Contest Won:</strong> <span style="color: #fbbf24; font-weight: 800;">${escapeHtml(opts.contestTitle)}</span></p>
            ${opts.affiliateCode ? `<p style="margin: 6px 0; font-size: 14px; color: #ffffff;"><strong>Affiliate Code:</strong> <code style="color: #34d399;">${escapeHtml(opts.affiliateCode)}</code></p>` : ''}
            <p style="margin: 6px 0; font-size: 14px; color: #34d399;"><strong>Status:</strong> 🏆 APPROVED WINNER</p>
            <p style="margin: 10px 0 0; font-size: 13px; color: #fde68a;">
              <strong>Admin Executive Note:</strong> ${escapeHtml(opts.adminNote || 'Congratulations! Verified & Approved Contest Winner — our Treasury Desk will coordinate your prize reward.')}
            </p>
          </div>
        </div>

        <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          HorPal Official Treasury &amp; Support • <a href="mailto:earnmegadesk@gmail.com" style="color: #38bdf8; text-decoration: none;">earnmegadesk@gmail.com</a> • Support Line: <strong style="color: #cbd5e1;">0596096071</strong>
        </div>
      </div>
    `;

    return await sendGmailSmtp({
      to: cleanEmail,
      subject,
      html,
    });
  } catch (err: any) {
    console.warn('[sendContestWinnerApprovedGmail] warning:', err?.message || err);
    return { sent: false, error: err?.message };
  }
}

/**
 * PHASE 4.3 — Test Gmail SMTP Delivery from Overwatch Admin Control Centre
 */
export async function sendTestGmailSmtp(
  targetEmail?: string | null
): Promise<GmailSmtpSendResult & { recipient: string; smtpUser: string }> {
  const { smtpUser } = await resolveGmailSmtpCredentials();
  const recipient = (targetEmail && String(targetEmail).trim()) || smtpUser;

  const html = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 18px; overflow: hidden; border: 2px solid #10b981;">
      <div style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); padding: 28px; text-align: center; border-bottom: 1px solid rgba(16, 185, 129, 0.35);">
        <div style="display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(16, 185, 129, 0.2); border: 1px solid #34d399; color: #34d399; font-size: 11px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 10px;">
          ✅ GMAIL SMTP ENGINE ONLINE
        </div>
        <h2 style="margin: 0; color: #ffffff; font-size: 22px;">HorPal Gmail SMTP Delivery Verified!</h2>
      </div>
      <div style="padding: 24px; font-size: 14px; color: #e2e8f0; line-height: 1.65;">
        <p style="margin-top: 0;">Your central Gmail SMTP engine (<code>lib/gmailSmtp.ts</code> via <code>smtp.gmail.com:465</code>) is <strong>100% operational</strong>.</p>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; font-size: 13px;">
          <div><strong>Sender Account:</strong> ${escapeHtml(smtpUser)}</div>
          <div><strong>Test Recipient:</strong> ${escapeHtml(recipient)}</div>
          <div><strong>Timestamp (GMT):</strong> ${escapeHtml(new Date().toUTCString())}</div>
          <div><strong>Active Triggers:</strong> Pillar 1/2/3 Congratulations + Password, Friday Payout Receipts &amp; Settlements, 50% Affiliate Sale Alerts, Contest Approvals</div>
        </div>
      </div>
      <div style="background: #030712; padding: 14px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06);">
        HorPal Official Treasury &amp; Support • earnmegadesk@gmail.com • Support Line: 0596096071
      </div>
    </div>
  `;

  const res = await sendGmailSmtp({
    to: recipient,
    subject: '✅ [HorPal Overwatch] Gmail SMTP Engine Test Delivery Successful',
    html,
  });

  return {
    ...res,
    recipient,
    smtpUser,
  };
}
