import { NextResponse } from 'next/server';
import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY || 're_fallback_key';
  return new Resend(apiKey);
}

function getAdminAffiliateEmail(): string {
  return process.env.ADMIN_CONTACT_EMAIL_AFFILIATE || 'geestablish@gmail.com';
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const type = data?.type || 'AFFILIATE_EVENT';
    const payload = data?.payload || data || {};

    const adminEmail = getAdminAffiliateEmail();
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'HorPal Affiliate Desk <onboarding@resend.dev>';
    const subject =
      payload?.subject ||
      `[HorPal Pillar 2 Alert] ${type} — ${payload?.fullName || payload?.affiliateName || payload?.affiliateCode || ''}`;

    const rowsHtml = Object.entries(payload)
      .map(
        ([k, v]) =>
          `<p style="margin: 6px 0; font-size: 14px;"><strong>${k}:</strong> ${
            typeof v === 'object' ? JSON.stringify(v) : String(v)
          }</p>`
      )
      .join('');

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #070b14; color: #f8fafc; padding: 32px; border-radius: 14px; max-width: 620px; margin: 0 auto; border: 1px solid #334155;">
        <h2 style="color: #fbbf24; margin-top: 0; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
          🔔 HorPal Pillar 2 Notification: ${type}
        </h2>
        <div style="background-color: #0f172a; border-radius: 10px; padding: 18px; margin-top: 16px;">
          ${rowsHtml}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
          Timestamp (GMT): ${new Date().toISOString()}
        </p>
      </div>
    `;

    if (process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY) {
      const resend = getResendClient();
      await resend.emails.send({
        from: fromAddress,
        to: adminEmail,
        subject,
        html: htmlBody,
      });
    }

    return NextResponse.json({ success: true, message: 'Notification dispatched via Resend.' });
  } catch (error: any) {
    console.error('[AFFILIATE NOTIFY ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to send notification.' },
      { status: 500 }
    );
  }
}
