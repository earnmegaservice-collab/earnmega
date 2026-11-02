import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only instantiate Resend if the key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const REPORT_ADMIN_EMAIL = process.env.REPORT_ADMIN_EMAIL || 'earnmegaservice@gmail.com';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportType, streamInfo, reporterInfo, targetInfo, category, reason, chatContext } = data;

    if (!resend) {
      console.warn("RESEND_API_KEY is not set. Simulating report success.");
      return NextResponse.json({ success: true, simulated: true });
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
          <li><strong>Stream ID:</strong> ${streamInfo?.id || 'N/A'}</li>
          <li><strong>Title:</strong> ${streamInfo?.title || 'N/A'}</li>
        </ul>

        <h3>Reporter Info</h3>
        <ul>
          <li><strong>Username:</strong> ${reporterInfo?.username || 'N/A'}</li>
          <li><strong>User ID:</strong> ${reporterInfo?.userId || 'N/A'}</li>
          <li><strong>Role:</strong> ${reporterInfo?.role || 'N/A'}</li>
        </ul>

        ${targetInfo ? `
        <h3>Target Info (Reported User)</h3>
        <ul>
          <li><strong>Username:</strong> ${targetInfo.username || 'N/A'}</li>
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
