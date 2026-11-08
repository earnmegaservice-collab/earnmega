import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { reportType, reason, details, reportedUser, reportedBy, streamId, streamTitle, hostUsername, timestamp } = payload;

    const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_MAIN || process.env.RESEND_API_KEY_AFFILIATE || process.env.NEXT_PUBLIC_RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('No Resend API Key found for live report.');
      return NextResponse.json({ success: false, error: 'Resend API Key not configured' }, { status: 500 });
    }

    const receiverEmail = process.env.REPORT_RECEIVER_EMAIL || 'horpalservice@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'HorPal Live Moderation <onboarding@resend.dev>';
    const subject = `🚨 HorPal Live Report: ${reportedUser} — ${reason}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d32f2f; margin-bottom: 5px;">${reportType || 'Live Stream Report'}</h2>
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; background-color: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">
            Violation Category: ${reason}
          </span>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="margin-top: 0; color: #424242; font-size: 14px; text-transform: uppercase;">Additional Details / Notes</h4>
          <p style="margin-bottom: 0; color: #212121;">${details || 'No additional details provided.'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; color: #757575;">Reported Account</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; font-weight: bold; text-align: right;">${reportedUser}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; color: #757575;">Reported By</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; font-weight: bold; text-align: right;">${reportedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; color: #757575;">Live Stream</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eeeeee; font-weight: bold; text-align: right;">${streamTitle} (@${hostUsername})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">Stream ID</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${streamId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #757575;">UTC Timestamp</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${timestamp}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const textContent = `
${reportType || 'Live Stream Report'}
Violation Category: ${reason}

Additional Details / Notes:
${details || 'No additional details provided.'}

Reported Account: ${reportedUser}
Reported By: ${reportedBy}
Live Stream: ${streamTitle} (@${hostUsername})
Stream ID: ${streamId}
UTC Timestamp: ${timestamp}
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [receiverEmail],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Resend API error:', errorText);
      return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
    }

    // Attempt delivery to owner just in case
    if (receiverEmail !== 'geestablish@gmail.com') {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: ['geestablish@gmail.com'],
            subject: subject,
            html: htmlContent,
            text: textContent,
          }),
        });
      } catch (err) {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in live-report route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
