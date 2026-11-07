import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
    }

    let subject = '';
    let htmlContent = '';

    if (type === 'FRIDAY_PAYOUT_REQUEST') {
      subject = `🚨 New Friday Payout Request: GHS ${data.amount_ghs} by ${data.account_name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>HorPal Affiliate Payout Request</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">User ID</th><td style="padding: 8px; border: 1px solid #ddd;">${data.user_id}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Requested Amount</th><td style="padding: 8px; border: 1px solid #ddd;"><strong>GHS ${data.amount_ghs}</strong></td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Method</th><td style="padding: 8px; border: 1px solid #ddd;">${data.payout_method}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Network / Bank</th><td style="padding: 8px; border: 1px solid #ddd;">${data.bank_or_network}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Account Name</th><td style="padding: 8px; border: 1px solid #ddd;">${data.account_name}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Account Number</th><td style="padding: 8px; border: 1px solid #ddd;">${data.account_number}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Time (UTC)</th><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toUTCString()}</td></tr>
          </table>
          <p>Please review and disburse via Paystack Transfer with OTP confirmation.</p>
        </div>
      `;
    } else if (type === 'VENDOR_APPLICATION') {
      subject = `📋 New Vendor Whitelist Request: ${data.creator_name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #111;">
          <h2>New Creator / Vendor Application</h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Creator Name</th><td style="padding: 8px; border: 1px solid #ddd;">${data.creator_name}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Email</th><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Product Title</th><td style="padding: 8px; border: 1px solid #ddd;">${data.product_title}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Proposed Price & Split</th><td style="padding: 8px; border: 1px solid #ddd;">${data.pricing_details}</td></tr>
            <tr><th style="padding: 8px; border: 1px solid #ddd;">Sales Page / Portfolio</th><td style="padding: 8px; border: 1px solid #ddd;">${data.sales_page_url}</td></tr>
          </table>
        </div>
      `;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'HorPal Affiliate <onboarding@resend.dev>',
        to: ['horpalservice@gmail.com'],
        subject,
        html: htmlContent,
      }),
    });

    const resData = await res.json();
    return NextResponse.json({ success: true, resData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to dispatch email' }, { status: 500 });
  }
}
