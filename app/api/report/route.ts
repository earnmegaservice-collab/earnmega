import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KEY_MAIN || process.env.RESEND_API_KEY_AFFILIATE || process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { surface, reason, details, reporterId, reporterUsername, reporterEmail, reportedUserId, reportedUsername, reportedEmail, contextId, contextContent } = body;

        let finalReporterName = reporterUsername || reporterId || 'Unknown Reporter';
        let finalReporterEmail = reporterEmail || 'No email provided';
        let finalReportedName = reportedUsername || reportedUserId || 'Unknown User';
        let finalReportedEmail = reportedEmail || 'No email provided';

        let reporterPaid = false;
        let reporterVerified = false;
        let reporterCoins = 0;

        let reportedPaid = false;
        let reportedVerified = false;
        let reportedCoins = 0;

        if (supabaseUrl && supabaseServiceKey) {
            const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

            // 1. Fetch Reporter details
            if (reporterId && !reporterId.startsWith('unknown')) {
                const { data: reporterProfile } = await adminSupabase.from('profiles').select('*').eq('id', reporterId).maybeSingle();
                if (reporterProfile) {
                    finalReporterName = reporterProfile.username || reporterProfile.full_name || reporterProfile.name || finalReporterName;
                    finalReporterEmail = reporterProfile.email || finalReporterEmail;
                }
            }

            // 2. Fetch Reported User details
            if (reportedUserId && !reportedUserId.startsWith('unknown') && reportedUserId !== 'host') {
                const { data: reportedProfile } = await adminSupabase.from('profiles').select('*').eq('id', reportedUserId).maybeSingle();
                if (reportedProfile) {
                    finalReportedName = reportedProfile.username || reportedProfile.full_name || reportedProfile.name || finalReportedName;
                    finalReportedEmail = reportedProfile.email || finalReportedEmail;

                    reportedPaid = reportedProfile.is_paid || false;
                    reportedVerified = reportedProfile.is_verified || false;
                    reportedCoins = reportedProfile.coin_balance || 0;
                }
            }

            // 3. Save to reports table
            try {
                await adminSupabase.from('reports').insert([{
                    type: surface,
                    reason: reason,
                    details: details,
                    target_user: reportedUserId || finalReportedName,
                    reporter: reporterId || finalReporterName,
                    stream_id: contextId
                }]);
            } catch (err) {}
        }

        if (resend) {
            const adminEmail = process.env.ADMIN_CONTACT_EMAIL || 'earnmegaservice@gmail.com';
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'HorPal Trust & Safety <onboarding@resend.dev>';
            const timestamp = new Date().toISOString();

            const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #050811; color: #fff; padding: 20px; border: 1px solid #ef4444; border-radius: 8px;">
                    <h2 style="color: #ef4444; text-align: center; text-transform: uppercase;">🚨 NEW TRUST & SAFETY REPORT</h2>

                    <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                        <h3 style="color: #ef4444; margin-top: 0;">1. REPORT SUMMARY & LOCATION</h3>
                        <p><strong>Pillar / Surface:</strong> ${surface}</p>
                        <p><strong>Reason / Category:</strong> ${reason}</p>
                        <p><strong>Details / Message:</strong> ${details || 'None provided'}</p>
                        <p><strong>Context / Content ID:</strong> ${contextId || 'N/A'}</p>
                        ${contextContent ? `<p><strong>Content:</strong> ${contextContent}</p>` : ''}
                        <p><strong>Timestamp:</strong> ${timestamp}</p>
                    </div>

                    <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <h3 style="color: #f59e0b; margin-top: 0;">2. REPORTED PERSON'S ACCOUNT DETAILS</h3>
                        <p><strong>Username:</strong> @${finalReportedName}</p>
                        <p><strong>Email:</strong> ${finalReportedEmail}</p>
                        <p><strong>User ID:</strong> ${reportedUserId || 'N/A'}</p>
                        <p><strong>Account Status:</strong> ${reportedPaid ? 'Paid' : 'Unpaid'}, ${reportedVerified ? 'Verified' : 'Unverified'}, ${reportedCoins} Coins</p>
                    </div>

                    <div style="background-color: #1a0f14; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <h3 style="color: #3b82f6; margin-top: 0;">3. REPORTER'S ACCOUNT DETAILS</h3>
                        <p><strong>Username:</strong> @${finalReporterName}</p>
                        <p><strong>Email:</strong> ${finalReporterEmail}</p>
                        <p><strong>User ID:</strong> ${reporterId || 'N/A'}</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <h3 style="color: #ef4444; margin-bottom: 10px;">4. QUICK ADMIN ACTION</h3>
                        <a href="https://horpal.com/geemings-command-x9v2" style="background-color: #ef4444; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open Command Center</a>
                    </div>
                </div>
            `;

            const textBody = `
🚨 NEW TRUST & SAFETY REPORT

1. REPORT SUMMARY & LOCATION
Pillar / Surface: ${surface}
Reason / Category: ${reason}
Details / Message: ${details || 'None provided'}
Context / Content ID: ${contextId || 'N/A'}
Timestamp: ${timestamp}

2. REPORTED PERSON'S ACCOUNT DETAILS
Username: @${finalReportedName}
Email: ${finalReportedEmail}
User ID: ${reportedUserId || 'N/A'}
Account Status: ${reportedPaid ? 'Paid' : 'Unpaid'}, ${reportedVerified ? 'Verified' : 'Unverified'}, ${reportedCoins} Coins

3. REPORTER'S ACCOUNT DETAILS
Username: @${finalReporterName}
Email: ${finalReporterEmail}
User ID: ${reporterId || 'N/A'}

4. QUICK ADMIN ACTION
Open Command Center: https://horpal.com/geemings-command-x9v2
            `;

            await resend.emails.send({
                from: fromEmail,
                to: adminEmail,
                subject: `🚨 [HorPal Pillar 1 Report - ${surface}] @${finalReportedName} reported by @${finalReporterName} (${reason})`,
                html: htmlBody,
                text: textBody
            });
        }

        return NextResponse.json({ success: true, message: "Report submitted securely to HorPal Trust & Safety." });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
