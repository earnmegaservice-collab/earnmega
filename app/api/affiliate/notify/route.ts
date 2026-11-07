import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body.type || 'NOTIFICATION';
    const payload = body.payload || body.data || {};

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY is not configured' },
        { status: 500 }
      );
    }

    let subject = '[HorPal Concierge Notification] System Update';
    let html = '';

    if (type === 'PAYOUT_REQUEST' || type === 'FRIDAY_PAYOUT_REQUEST') {
      const name = payload.affiliateName || payload.account_name || 'Affiliate';
      const amount = payload.amount || payload.amount_ghs || 0;
      const channel = payload.payoutChannel || payload.payout_method || 'MOBILE_MONEY';
      const details =
        payload.accountDetails ||
        `${payload.bank_or_network || ''} - ${payload.account_number || ''}`;

      subject = `🚨 Friday Payout Request: GH₵ ${amount} from ${name}`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>HorPal Friday Affiliate Payout Request</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Affiliate Name</th><td style="padding: 8px; border: 1px solid #ddd;">${name}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Email</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.affiliateEmail || payload.email || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Amount (GHS)</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>GH₵ ${amount}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Channel</th><td style="padding: 8px; border: 1px solid #ddd;">${channel}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Account Details</th><td style="padding: 8px; border: 1px solid #ddd;">${details}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Submitted At</th><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toUTCString()}</td></tr>
          </table>
          <p style="margin-top: 16px;">Verify balance in Admin and approve via Paystack Transfer with OTP confirmation.</p>
        </div>
      `;
    } else if (type === 'VENDOR_APPLICATION') {
      const creatorName = payload.userName || payload.creator_name || 'Creator';
      const productTitle = payload.productName || payload.product_title || 'Untitled Product';

      subject = `📋 New Vendor Whitelist Application: ${productTitle} (${creatorName})`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>HorPal Vendor Whitelist Application</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Applicant Name</th><td style="padding: 8px; border: 1px solid #ddd;">${creatorName}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Applicant Email</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.userEmail || payload.email || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Product Title</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>${productTitle}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Proposed Price (GHS)</th><td style="padding: 8px; border: 1px solid #ddd;">GH₵ ${payload.proposedPrice || payload.pricing_details || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Description</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.description || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Sales Page / Access URL</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.proofUrl || payload.sales_page_url || 'N/A'}</td></tr>
          </table>
        </div>
      `;
    } else {
      subject = `[HorPal Concierge Notification] ${payload.subject || 'System Notification'}`;
      html = `<pre style="font-family: sans-serif;">${JSON.stringify(payload, null, 2)}</pre>`;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'HorPal Affiliate <onboarding@resend.dev>',
        to: ['horpalservice@gmail.com'],
        subject,
        html,
      }),
    });

    const resData = await resendResponse.json();
    return NextResponse.json({ success: true, data: resData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
