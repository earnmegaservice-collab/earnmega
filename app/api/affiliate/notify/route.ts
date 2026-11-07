// app/api/affiliate/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL = 'horpalservice@gmail.com';

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set. Dispatching email payload to log:');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      return NextResponse.json({ 
        success: true, 
        mocked: true, 
        message: 'Notification logged successfully (Resend API Key missing).' 
      });
    }

    let subject = '';
    let htmlContent = '';

    if (type === 'PAYOUT_REQUEST') {
      subject = `[HorPal Payout Request] GH₵ ${payload.amount} - ${payload.affiliateName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d0d0d; color: #f5f5f5;">
          <h2 style="color: #d4af37; border-bottom: 1px solid #d4af37; padding-bottom: 10px;">
            HorPal Pillar 2: Friday Payout Request
          </h2>
          <p>A new payout request has been queued for Friday settlement.</p>
          <table style="width: 100%; color: #f5f5f5; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Affiliate:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${payload.affiliateName} (${payload.affiliateEmail})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333; color: #d4af37;"><strong>GH₵ ${payload.amount}</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Channel:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${payload.payoutChannel}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #333;"><strong>Account Details:</strong></td><td style="padding: 8px; border-bottom: 1px solid #333;">${payload.accountDetails}</td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">HorPal Luxury Affiliate Marketing Engine • Automated Governance Service</p>
        </div>
      `;
    } else if (type === 'VENDOR_APPLICATION') {
      subject = `[HorPal Vendor Whitelist] New Submission: ${payload.productName}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d0d0d; color: #f5f5f5;">
          <h2 style="color: #d4af37; border-bottom: 1px solid #d4af37; padding-bottom: 10px;">
            New Digitstem-Style Vendor Whitelist Application
          </h2>
          <p>A seller has submitted a product for marketplace approval.</p>
          <ul style="line-height: 1.8;">
            <li><strong>Vendor:</strong> ${payload.userName} (${payload.userEmail})</li>
            <li><strong>Product Title:</strong> ${payload.productName}</li>
            <li><strong>Proposed Price:</strong> GH₵ ${payload.proposedPrice}</li>
            <li><strong>Access/Proof Link:</strong> <a href="${payload.proofUrl}" style="color: #d4af37;">${payload.proofUrl}</a></li>
          </ul>
          <p><strong>Description:</strong></p>
          <blockquote style="background: #1a1a1a; padding: 10px; border-left: 3px solid #d4af37;">${payload.description}</blockquote>
        </div>
      `;
    } else {

      subject = `[HorPal Concierge Notification] ${payload.subject || 'System Notification'}`;
|---|= `<pre style="font-family: sans-serif;">${JSON.stringify(payload, null, 2)}</pre>`;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HorPal Platform <notifications@horpal.com>',
        to: [ADMIN_EMAIL],
        subject: subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    return NextResponse.json({ success: true, data: resendData });
  } catch (error: any) {
    console.error('Error in affiliate notification API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

