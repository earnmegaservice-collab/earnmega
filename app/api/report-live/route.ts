import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { streamId, hostId, reporterId, reporterUsername, targetUserId, targetUsername, category, reason, chatContext } = body;

    console.log('Sending report alert email to horpalservice@gmail.com', body);

    const htmlContent = `
      <h1>Trust & Safety Report Alert</h1>
      <p><strong>Reporter:</strong> @${reporterUsername} (${reporterId})</p>
      <p><strong>Reported Target:</strong> @${targetUsername || 'Live Stream'} (${targetUserId || 'N/A'})</p>
      <p><strong>Stream ID:</strong> ${streamId}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${chatContext ? '<h2>Chat Context:</h2><pre>' + JSON.stringify(chatContext, null, 2) + '</pre>' : ''}
    `;

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'HorPal Trust & Safety <reports@horpal.com>',
        to: ['horpalservice@gmail.com'],
        subject: `[URGENT] Trust & Safety Report - ${targetUsername || 'Live Stream'}`,
        html: htmlContent
      });
    } else {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER || 'horpalservice@gmail.com',
          pass: process.env.SMTP_PASS || 'dummy'
        }
      });
      await transporter.sendMail({
        from: '"HorPal Trust & Safety" <reports@horpal.com>',
        to: 'horpalservice@gmail.com',
        subject: `[URGENT] Trust & Safety Report - ${targetUsername || 'Live Stream'}`,
        html: htmlContent
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/report-live:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
