'use server';

import { Resend } from 'resend';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_service_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function submitUserReport(formData: FormData) {
  try {
    const reportedUserId = formData.get('reportedUserId') as string;
    const reason = formData.get('reason') as string;
    const details = formData.get('details') as string | undefined;
    const contentType = formData.get('contentType') as string;
    const accessToken = formData.get('accessToken') as string | undefined;
    const formReporterId = formData.get('reporterId') as string | undefined;

    const cookieStore = await cookies();
    const clientOptions: any = {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          (cookieStore as any).set({ name, value: '', ...options });
        },
      },
    };

    if (accessToken) {
      clientOptions.global = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      clientOptions
    );

    let reporterId = formReporterId;
    let authUser = null;

    if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        if (user) authUser = user;
    }

    if (!authUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) authUser = user;
    }

    if (authUser) {
        reporterId = authUser.id;
    }

    if (!reporterId) {
      throw new Error('Unauthorized');
    }

    // Step 1: Insert report into Supabase
    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      details,
      content_type: contentType || 'other',
    });

    if (insertError) {
      console.warn('[TRUST PIPELINE] Database insert failed:', insertError);
    }

    // Step 2: Hydrate User Data (Resolve UUIDs & Emails)
    let reporterName = 'Unknown User';
    let reporterEmail = 'No email found';
    let reportedName = 'Unknown User';
    let reportedEmail = 'No email found';

    // Fetch reporter profile
    const { data: reporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('username, name, full_name')
      .eq('id', reporterId)
      .single();
    if (reporterProfile) {
      reporterName = reporterProfile.username || reporterProfile.name || reporterProfile.full_name || reporterId;
    }

    // Fetch reporter email via auth.users
    const { data: reporterAuthData, error: reporterAuthErr } = await supabaseAdmin.auth.admin.getUserById(reporterId);
    if (!reporterAuthErr && reporterAuthData?.user?.email) {
      reporterEmail = reporterAuthData.user.email;
    }

    // Fetch reported user profile
    const { data: reportedProfile } = await supabaseAdmin
      .from('profiles')
      .select('username, name, full_name')
      .eq('id', reportedUserId)
      .single();
    if (reportedProfile) {
      reportedName = reportedProfile.username || reportedProfile.name || reportedProfile.full_name || reportedUserId;
    }

    // Fetch reported user email via auth.users
    const { data: reportedAuthData, error: reportedAuthErr } = await supabaseAdmin.auth.admin.getUserById(reportedUserId);
    if (!reportedAuthErr && reportedAuthData?.user?.email) {
      reportedEmail = reportedAuthData.user.email;
    }

    // Step 3: Send email via Resend
    const adminEmail = process.env.ADMIN_CONTACT_EMAIL;
    if (!adminEmail) {
      console.error('[TRUST PIPELINE] ADMIN_CONTACT_EMAIL is not defined.');
      throw new Error('Admin contact email is not configured.');
    }

    const timestamp = new Date().toISOString();

    const emailHtmlBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid #27272a;">
        <h1 style="color: #fbbf24; margin-bottom: 24px; border-bottom: 1px solid #3f3f46; padding-bottom: 12px; font-weight: 800; letter-spacing: -0.5px;">🚨 EarnMega Trust & Safety Alert</h1>

        <div style="margin-bottom: 24px;">
          <h3 style="color: #ef4444; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; margin-bottom: 12px;">🔴 Reported User (Target):</h3>
          <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Username:</strong> <span style="color: #d4d4d8;">${reportedName}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Email:</strong> <span style="color: #d4d4d8;">${reportedEmail}</span></p>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;"><strong>UUID:</strong> ${reportedUserId}</p>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; margin-bottom: 12px;">🛡️ Reported By (Submitter):</h3>
          <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Username:</strong> <span style="color: #d4d4d8;">${reporterName}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Email:</strong> <span style="color: #d4d4d8;">${reporterEmail}</span></p>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;"><strong>UUID:</strong> ${reporterId}</p>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; margin-bottom: 12px;">⚠️ Violation Details:</h3>
          <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Reason:</strong> <span style="color: #d4d4d8;">${reason}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Source:</strong> <span style="color: #d4d4d8;">${contentType || 'N/A'}</span></p>
            <p style="margin: 0; font-size: 15px;"><strong>Details:</strong> <span style="color: #d4d4d8;">${details || 'N/A'}</span></p>
          </div>
        </div>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #3f3f46; font-size: 12px; color: #71717a; text-align: center;">
          <p style="margin: 0;">Report Timestamp: ${timestamp}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'trust-pipeline@resend.dev',
      to: adminEmail,
      subject: `[EarnMega Trust & Safety] New Report against User ${reportedUserId}`,
      html: emailHtmlBody,
    });

    console.info("[TRUST PIPELINE] Report logged and email dispatched via Resend");

    return { success: true };
  } catch (error: any) {
    console.error('[TRUST PIPELINE] Action Failed:', error);
    return { success: false, error: error.message };
  }
}
