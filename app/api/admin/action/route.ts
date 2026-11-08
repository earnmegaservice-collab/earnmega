import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_MAIN || process.env.RESEND_API_KEY_AFFILIATE;
    const body = await request.json();
    const { action, payload } = body;

    // We proceed even if Resend API key is missing (for local dev / testing)
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    if (action === 'SEND_WARNING_EMAIL') {
      const { email, warningText, reason, strikeCount } = payload;

      if (resend) {
        await resend.emails.send({
          from: 'HorPal Trust & Safety <safety@horpal.com>',
          to: email,
          bcc: 'horpalservice@gmail.com',
          subject: '[URGENT] Official HorPal Administrative Warning',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050811; color: #fff; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
              <h2 style="color: #ef4444; text-align: center; text-transform: uppercase;">⚠️ Official Warning Strike</h2>
              <p>This is an official administrative warning regarding your HorPal account.</p>
              <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Message:</strong> ${warningText}</p>
                <p><strong>Total Strikes:</strong> ${strikeCount}</p>
              </div>
              <p>Failure to comply with HorPal Community Guidelines may result in immediate account suspension or financial freeze.</p>
              <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
                HorPal Trust & Safety Team<br/>
                If you believe this was an error, please contact horpalservice@gmail.com
              </p>
            </div>
          `
        });
      }
      return NextResponse.json({ success: true, message: 'Warning email sent' });
    }

import { supabase } from '../../../../utils/supabase';

    if (action === 'SUBMIT_LIVE_REPORT') {
      const { Platform, Report_Type, Reason, Details, Reported_User, Reported_By, Stream_ID, Timestamp } = payload;

      try {
        await supabase.from('reports').insert([{
          type: Report_Type,
          reason: Reason,
          details: Details,
          target_user: Reported_User,
          reporter: Reported_By,
          stream_id: Stream_ID
        }]);
      } catch (err) {}

      if (resend) {
        await resend.emails.send({
          from: 'HorPal Trust & Safety <safety@horpal.com>',
          to: 'horpalservice@gmail.com',
          subject: `🚨 HorPal Live Report: ${Reported_User} (${Reason})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050811; color: #fff; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
              <h2 style="color: #ef4444; text-align: center; text-transform: uppercase;">🚨 NEW TRUST & SAFETY REPORT</h2>
              <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p><strong>Reported User:</strong> ${Reported_User}</p>
                <p><strong>Reason:</strong> ${Reason}</p>
                <p><strong>Details:</strong> ${Details}</p>
                <p><strong>Reported By:</strong> ${Reported_By}</p>
                <p><strong>Stream ID:</strong> ${Stream_ID}</p>
                <p><strong>Timestamp:</strong> ${Timestamp}</p>
                <p><strong>Platform:</strong> ${Platform} (${Report_Type})</p>
              </div>
            </div>
          `
        });
      }
      return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    }

    if (action === 'SEND_PAYOUT_OTP') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      if (resend) {
        await resend.emails.send({
          from: 'HorPal Admin Ops <admin@horpal.com>',
          to: 'horpalservice@gmail.com',
          subject: `Admin Payout OTP: ${otp}`,
          html: `
            <h2>Friday Payout Authorization</h2>
            <p>Your one-time password to approve payouts is: <strong style="font-size: 24px;">${otp}</strong></p>
          `
        });
      }
      return NextResponse.json({ success: true, otp, message: 'OTP dispatched' }); // Returning OTP only for UI testing convenience as requested for fallback testing
    }

    if (action === 'ADMIN_ALERT') {
      const { message, level = 'info' } = payload;
      if (resend) {
        await resend.emails.send({
          from: 'HorPal System Alerts <alerts@horpal.com>',
          to: 'horpalservice@gmail.com',
          subject: `[Admin Alert - ${level.toUpperCase()}] New System Event`,
          html: `<p><strong>Alert:</strong> ${message}</p>`
        });
      }
      return NextResponse.json({ success: true, message: 'Alert sent' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin API Action Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
