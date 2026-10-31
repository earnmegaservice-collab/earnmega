'use server';

import { Resend } from 'resend';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Step 2: Send email via Resend
    const adminEmail = process.env.ADMIN_CONTACT_EMAIL;
    if (!adminEmail) {
      console.error('[TRUST PIPELINE] ADMIN_CONTACT_EMAIL is not defined.');
      throw new Error('Admin contact email is not configured.');
    }

    const timestamp = new Date().toISOString();
    const emailBody = `
      New User Report Submitted

      Timestamp: ${timestamp}
      Reporter ID: ${reporterId}
      Reported User ID: ${reportedUserId}
      Content Type: ${contentType || 'N/A'}
      Reason: ${reason}
      Details: ${details || 'N/A'}
    `;

    await resend.emails.send({
      from: 'trust-pipeline@resend.dev',
      to: adminEmail,
      subject: `[EarnMega Trust & Safety] New Report against User ${reportedUserId}`,
      text: emailBody,
    });

    console.info("[TRUST PIPELINE] Report logged and email dispatched via Resend");

    return { success: true };
  } catch (error: any) {
    console.error('[TRUST PIPELINE] Action Failed:', error);
    return { success: false, error: error.message };
  }
}
