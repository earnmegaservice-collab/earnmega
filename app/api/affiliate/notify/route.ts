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

    let subject = `[HorPal Pillar 2] ${type}`;
    let html = '';

    if (type === 'PAYOUT_REQUEST' || type === 'FRIDAY_PAYOUT_REQUEST') {
      subject = `🚨 Friday Payout Request: GH₵ ${payload.amount} from ${payload.affiliateName}`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>HorPal Friday Affiliate Payout Request</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Affiliate Name</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.affiliateName || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Affiliate ID</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.affiliateCode || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Email</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.affiliateEmail || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Phone</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.phone || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Amount (GHS)</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>GH₵ ${payload.amount}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Channel</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.payoutChannel || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Account Details</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.accountDetails || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Submitted At</th><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toUTCString()}</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'VENDOR_APPLICATION') {
      subject = `📋 Creator Whitelist Request: ${payload.productName} (${payload.userName})`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>New HorPal Creator / Vendor Application</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Creator Name</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.userName}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Email</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.userEmail}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Phone</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.phone || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Product Title</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>${payload.productName}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Proposed Price & Split</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.proposedPrice}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Sales Page / Delivery Link</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.proofUrl}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Description</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.description}</td></tr>
          </table>
        </div>
      `;
    } else if (type === 'CONTEST_REGISTRATION' || type === 'VIRAL_VIDEO_CONTEST_CLAIM' || type === 'CONTEST_GOAL_REACHED_ADMIN_ALERT') {
      subject = `🏆 [${type}] ${payload.fullName || payload.affiliateName} (${payload.affiliateCode})`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>HorPal Contest & Milestone Alert</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Event Type</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>${type}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Affiliate Name</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.fullName || payload.affiliateName}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Affiliate ID</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.affiliateCode}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Email</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.email}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Phone</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.phone}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Contest / Challenge</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.contestTitle || '100K Views / Sales Challenge'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">TikTok / IG Handle</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.socialHandle || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Video Link</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.videoUrl || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Bank / MoMo Payout Details</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.payoutDetails || 'N/A'}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Verified Sales Count</th><td style="padding: 8px; border: 1px solid #ddd;">${payload.salesCount ?? 'N/A'}</td></tr>
          </table>
        </div>
      `;
    } else {
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
