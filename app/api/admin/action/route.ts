import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    // SECURITY: Authenticate request on the server to prevent open email relay / unauthenticated admin actions.
    const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_MAIN || process.env.RESEND_API_KEY_AFFILIATE;

    // Validate session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let isAuthorized = false;

    try {
      const authHeader = request.headers.get('Authorization');
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
         token = authHeader.split(' ')[1];
      }

      const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll: () => [], setAll: () => {} } });
      const { data: { user } } = await supabase.auth.getUser(token || undefined);

      if (user && user.email) {
          const email = user.email.toLowerCase();
          if (email === 'horpalservice@gmail.com' || email === 'geestablish@gmail.com') {
              isAuthorized = true;
          }
      }
    } catch (e) {
      console.error('Auth verification failed in admin route:', e);
    }

    if (!isAuthorized) {
       // Although middleware blocks `/api/admin/action`, having an extra layer of defense here is crucial
       return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 403 });
    }

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

    // Server-side secure dispatch of broadcasts
    if (action === 'BROADCAST_WARNING') {
       const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll: () => [], setAll: () => {} } });
       await supabase.channel('horpal_godmode_command').send({
           type: 'broadcast',
           event: 'GOD_VOICE_WARNING',
           payload: payload
       });
       return NextResponse.json({ success: true, message: 'Warning Broadcasted' });
    }

    if (action === 'KILL_STREAM') {
       const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { getAll: () => [], setAll: () => {} } });
       await supabase.channel(`live_arena_${payload.streamId}`).send({
           type: 'broadcast',
           event: 'ADMIN_KILL_STREAM',
           payload: {}
       });
       await supabase.from('live_streams').update({ status: 'ended' }).eq('id', payload.streamId);
       return NextResponse.json({ success: true, message: 'Stream Terminated' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin API Action Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
