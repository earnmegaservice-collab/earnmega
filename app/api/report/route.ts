import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_service_key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key');

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const reporterId = body.reporterId || 'anonymous';
        const accusedId = body.accusedId || body.reportedUserId;
        const category = body.category || body.reason;
        const description = body.description || body.details;
        const time = body.time || new Date().toISOString();
        const recentMessages = body.recentMessages || [];
        const contentType = body.contentType || 'chat';

        if (!accusedId) {
            return NextResponse.json({ success: false, message: 'Missing accused ID' }, { status: 400 });
        }

        // Insert into Supabase reports table
        const { error: insertError } = await supabaseAdmin.from('reports').insert({
            reporter_id: reporterId,
            reported_user_id: accusedId,
            reason: category,
            details: description,
            content_type: contentType,
        });

        if (insertError) {
             console.warn('[TRUST PIPELINE] Database insert failed:', insertError);
        }

        // Fetch Reporter Details
        let reporterName = 'Unknown User';
        let reporterEmail = 'No email found';
        if (reporterId !== 'anonymous') {
             const { data: rProfile } = await supabaseAdmin.from('profiles').select('username, name, full_name, email, is_paid, coin_balance').eq('id', reporterId).single();
             if (rProfile) {
                  reporterName = rProfile.username || rProfile.name || rProfile.full_name || reporterId;
                  reporterEmail = rProfile.email || reporterEmail;
             }
        }

        // Fetch Accused Details
        let accusedName = 'Unknown User';
        let accusedEmail = 'No email found';
        let accusedPaidStatus = 'Unknown';
        let accusedCoinBalance = 0;

        const { data: aProfile } = await supabaseAdmin.from('profiles').select('username, name, full_name, email, is_paid, coin_balance').eq('id', accusedId).single();
        if (aProfile) {
             accusedName = aProfile.username || aProfile.name || aProfile.full_name || accusedId;
             accusedEmail = aProfile.email || accusedEmail;
             accusedPaidStatus = aProfile.is_paid ? 'Paid' : 'Free';
             accusedCoinBalance = aProfile.coin_balance || 0;
        }

        // Send Email via Resend
        const adminEmail = process.env.ADMIN_CONTACT_EMAIL || 'earnmegaservice@gmail.com';

        const emailHtmlBody = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #27272a;">
            <h1 style="color: #fbbf24; margin-bottom: 24px; border-bottom: 1px solid #3f3f46; padding-bottom: 12px; font-weight: 800;">🚨 HorPal Trust & Safety Alert</h1>

            <div style="margin-bottom: 24px;">
              <h3 style="color: #ef4444; text-transform: uppercase; font-size: 14px; margin-bottom: 12px;">🔴 Reported User (Target):</h3>
              <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444;">
                <p><strong>Username:</strong> ${accusedName}</p>
                <p><strong>Email:</strong> ${accusedEmail}</p>
                <p><strong>Account Type:</strong> ${accusedPaidStatus}</p>
                <p><strong>Coin Balance:</strong> ${accusedCoinBalance}</p>
                <p style="font-size: 13px; color: #a1a1aa;"><strong>UUID:</strong> ${accusedId}</p>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <h3 style="color: #3b82f6; text-transform: uppercase; font-size: 14px; margin-bottom: 12px;">🛡️ Reported By (Submitter):</h3>
              <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <p><strong>Username:</strong> ${reporterName}</p>
                <p><strong>Email:</strong> ${reporterEmail}</p>
                <p style="font-size: 13px; color: #a1a1aa;"><strong>UUID:</strong> ${reporterId}</p>
              </div>
            </div>

            <div style="margin-bottom: 24px;">
              <h3 style="color: #f59e0b; text-transform: uppercase; font-size: 14px; margin-bottom: 12px;">⚠️ Violation Details:</h3>
              <div style="background-color: #18181b; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p><strong>Reason:</strong> ${category}</p>
                <p><strong>Source:</strong> ${contentType}</p>
                <p><strong>Details:</strong> ${description}</p>
              </div>
            </div>

            <div style="margin-top: 32px; text-align: center; color: #71717a; font-size: 12px;">
                Timestamp: ${time}
            </div>
          </div>
        `;

        if (process.env.RESEND_API_KEY) {
             await resend.emails.send({
                  from: 'trust-pipeline@resend.dev',
                  to: adminEmail,
                  subject: `[HorPal Trust & Safety] New Report against ${accusedName}`,
                  html: emailHtmlBody
             });
        }

        return NextResponse.json({ success: true, message: "Thank you for your report! It has been successfully received and our security team will investigate this user's activities immediately." });
    } catch (e: any) {
        console.error('[TRUST PIPELINE] Action Failed:', e);
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
