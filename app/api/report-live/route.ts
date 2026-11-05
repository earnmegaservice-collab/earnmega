import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Only instantiate Resend if the key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const REPORT_ADMIN_EMAIL = 'horpalservice@gmail.com'; // Changed as requested

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportType, streamInfo, reporterInfo, targetInfo, category, reason, chatContext, reporterName, reportedName, liveStreamId } = data;

    const actualReporterName = reporterName || reporterInfo?.username;
    const actualReportedName = reportedName || targetInfo?.username;
    const actualLiveStreamId = liveStreamId || streamInfo?.id;

    if (!resend) {
      console.warn("RESEND_API_KEY is not set. Falling back to nodemailer.");
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER || 'earnmegaservice@gmail.com',
          pass: process.env.SMTP_PASS || 'dummy_password'
        }
      });

      const mailOptions = {
        from: process.env.SMTP_USER || 'earnmegaservice@gmail.com',
        to: REPORT_ADMIN_EMAIL,
        subject: `Trust & Safety Report: ${actualReportedName}`,
        text: `Reporter: ${actualReporterName}\nReported: ${actualReportedName}\nReason: ${reason}\nLive Stream ID: ${actualLiveStreamId}\n`
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch(e) {
        console.log('Nodemailer error (expected if no valid creds):', e);
      }
      return NextResponse.json({ success: true, fallback: true });
    }

    const chatContextHtml = chatContext
      ? chatContext.map((c: any) => `<li><strong>${c.username}:</strong> ${c.content}</li>`).join('')
      : '<em>No chat context provided</em>';

    const { data: emailData, error } = await resend.emails.send({
      from: 'EarnMega Trust & Safety <reports@resend.dev>', // Use a verified domain in production
      to: [REPORT_ADMIN_EMAIL],
      subject: `🚨 ${reportType} - EarnMega Live`,
      html: `
        <h2>${reportType}</h2>

        <h3>Violation: ${category}</h3>
        <p><strong>Custom Reason:</strong> ${reason || '<em>None provided</em>'}</p>

        <hr/>

        <h3>Stream Info</h3>
        <ul>
          <li><strong>Stream ID:</strong> ${actualLiveStreamId || 'N/A'}</li>
          <li><strong>Title:</strong> ${streamInfo?.title || 'N/A'}</li>
        </ul>

        <h3>Reporter Info</h3>
        <ul>
          <li><strong>Username:</strong> ${actualReporterName || 'N/A'}</li>
          <li><strong>User ID:</strong> ${reporterInfo?.userId || 'N/A'}</li>
          <li><strong>Role:</strong> ${reporterInfo?.role || 'N/A'}</li>
        </ul>

        ${targetInfo ? `
        <h3>Target Info (Reported User)</h3>
        <ul>
          <li><strong>Username:</strong> ${actualReportedName || 'N/A'}</li>
          <li><strong>User ID:</strong> ${targetInfo.userId || 'N/A'}</li>
        </ul>
        ` : ''}

        <hr/>

        <h3>Recent Chat Context (Last 10 messages)</h3>
        <ul>
          ${chatContextHtml}
        </ul>
      `,
    });

    if (error) {
      console.error('Error sending report via Resend:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailData });
  } catch (err: any) {
    console.error('Exception in report route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
