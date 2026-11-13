import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminClient, paywallErrorResponse, requireAuthedUser } from '../../../../lib/server/paywall';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY_AFFILIATE || process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CONTEST_IDS = ['viral_100k', 'sales_50', 'sales_100', 'weekly_top3'] as const;

export async function GET(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    const [{ data: mySubmissions, error: subErr }, { data: allRows }] = await Promise.all([
      admin
        .from('pillar2_contest_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      admin
        .from('pillar2_contest_submissions')
        .select('contest_id, user_id'),
    ]);

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    const participantCounts: Record<string, number> = {
      viral_100k: 0,
      sales_50: 0,
      sales_100: 0,
      weekly_top3: 0,
    };

    if (Array.isArray(allRows)) {
      const seenByContest: Record<string, Set<string>> = {};
      for (const cid of CONTEST_IDS) {
        seenByContest[cid] = new Set<string>();
      }
      for (const row of allRows) {
        const cid = String(row.contest_id || '');
        if (!seenByContest[cid]) seenByContest[cid] = new Set<string>();
        const key = String(row.user_id || Math.random());
        seenByContest[cid].add(key);
      }
      for (const [cid, set] of Object.entries(seenByContest)) {
        participantCounts[cid] = set.size;
      }
    }

    return NextResponse.json({
      success: true,
      submissions: mySubmissions || [],
      participantCounts,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = getAdminClient();
    const user = await requireAuthedUser(request, admin);

    const body = await request.json().catch(() => ({}));
    const contestId = String(body?.contestId || '').trim();
    const contestTitle = String(body?.contestTitle || '').trim();
    const fullName = String(body?.fullName || '').trim();
    const emailInput = String(body?.email || user.email || '').trim().toLowerCase();
    const phone = String(body?.phone || '').trim();
    const platformHandle = String(body?.platformHandle || '').trim();
    const videoOrProofUrl = String(body?.videoOrProofUrl || '').trim();
    const notes = String(body?.notes || '').trim();

    if (!contestId || !contestTitle || !fullName || !emailInput) {
      return NextResponse.json(
        { error: 'Please complete Contest, Full Name, and Email details.' },
        { status: 400 }
      );
    }

    if (contestId === 'viral_100k' && (!platformHandle || !videoOrProofUrl)) {
      return NextResponse.json(
        { error: 'TikTok/Instagram handle and Video URL are required for the 100K Views Challenge.' },
        { status: 400 }
      );
    }

    // Fetch live verified profile & real Paystack sales counts from Supabase
    const { data: profile } = await admin
      .from('profiles')
      .select('affiliate_code, affiliate_total_sales, full_name, email, pillar2_phone, phone_number, phone')
      .eq('id', user.id)
      .maybeSingle();

    const [{ count: salesCountRows }] = await Promise.all([
      admin
        .from('pillar2_sales')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_user_id', user.id),
    ]);

    const verifiedSalesCount = Math.max(
      Number(profile?.affiliate_total_sales ?? 0),
      Number(salesCountRows ?? 0)
    );
    const affiliateCode =
      String(profile?.affiliate_code || '').trim() ||
      `HP-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const resolvedPhone =
      phone ||
      String(profile?.pillar2_phone || profile?.phone_number || profile?.phone || '').trim() ||
      null;

    const { data: insertedRow, error: insertError } = await admin
      .from('pillar2_contest_submissions')
      .insert({
        user_id: user.id,
        affiliate_code: affiliateCode,
        full_name: fullName,
        email: emailInput,
        phone: resolvedPhone,
        contest_id: contestId,
        contest_title: contestTitle,
        video_or_proof_url: videoOrProofUrl || null,
        platform_handle: platformHandle || null,
        verified_sales_count: verifiedSalesCount,
        notes: notes || null,
        status: 'pending_review',
        admin_note: 'Submission received — queued for Admin verification',
      })
      .select('*')
      .single();

    if (insertError || !insertedRow) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to save contest submission.' },
        { status: 500 }
      );
    }

    // Add live notification to affiliate's dashboard bell
    try {
      await admin.from('affiliate_notifications').insert({
        user_id: user.id,
        title: `🏆 Contest Entry Received: ${contestTitle}`,
        subtitle: `Status: Under Review • Verified Sales: ${verifiedSalesCount}`,
        amount_ghs: 0,
        read: false,
      });
    } catch (_) {}

    // Send formatted HTML email straight to Admin Gmail via existing Resend setup
    const resend = getResendClient();
    const adminTo = process.env.ADMIN_CONTACT_EMAIL_AFFILIATE || 'geestablish@gmail.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'HorPal Affiliate Desk <onboarding@resend.dev>';
    const submittedAtIso = insertedRow.created_at || new Date().toISOString();

    let emailSent = false;
    let emailError: string | null = null;

    if (resend) {
      try {
        const subject = `🏆 New Earnmega Contest Submission: ${contestTitle} — ${fullName} (${affiliateCode})`;
        const safeVideoLink =
          videoOrProofUrl && /^https?:\/\//i.test(videoOrProofUrl)
            ? `<a href="${escapeHtml(videoOrProofUrl)}" style="color:#10b981;font-weight:700;word-break:break-all;">${escapeHtml(videoOrProofUrl)}</a>`
            : escapeHtml(videoOrProofUrl || 'N/A (Sales Sprint / Milestone Registration)');

        const { error: resendErr } = await resend.emails.send({
          from: fromEmail,
          to: [adminTo],
          replyTo: emailInput,
          subject,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;background:#070b14;color:#f8fafc;padding:28px;border-radius:18px;border:1px solid #334155;max-width:640px;margin:0 auto;">
              <div style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:20px;">
                <span style="display:inline-block;background:#f59e0b;color:#000;font-weight:900;font-size:11px;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.08em;">Earnmega Pillar 2 • Contests Arena</span>
                <h1 style="margin:12px 0 4px 0;font-size:20px;color:#ffffff;">🏆 New Contest Submission</h1>
                <p style="margin:0;color:#94a3b8;font-size:13px;">Review and update winner status inside <strong>/geemings-command-x9v2</strong> → Contest Submissions.</p>
              </div>

              <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:18px;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;width:42%;">Contest Title</td>
                    <td style="padding:8px 0;color:#fbbf24;font-weight:800;">${escapeHtml(contestTitle)} (${escapeHtml(contestId)})</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Affiliate Name</td>
                    <td style="padding:8px 0;color:#ffffff;font-weight:700;">${escapeHtml(fullName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Email</td>
                    <td style="padding:8px 0;color:#38bdf8;">${escapeHtml(emailInput)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Phone Number</td>
                    <td style="padding:8px 0;color:#ffffff;">${escapeHtml(resolvedPhone || 'Not provided')}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Affiliate Code</td>
                    <td style="padding:8px 0;color:#10b981;font-family:monospace;font-weight:800;">${escapeHtml(affiliateCode)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Verified Supabase Sales</td>
                    <td style="padding:8px 0;color:#34d399;font-weight:900;">${verifiedSalesCount} Verified Sales</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Social Handle</td>
                    <td style="padding:8px 0;color:#e2e8f0;">${escapeHtml(platformHandle || 'N/A')}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Video / Proof URL</td>
                    <td style="padding:8px 0;">${safeVideoLink}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Notes / Payout Info</td>
                    <td style="padding:8px 0;color:#cbd5e1;">${escapeHtml(notes || 'None provided')}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#94a3b8;">Submitted Timestamp</td>
                    <td style="padding:8px 0;color:#94a3b8;font-family:monospace;">${escapeHtml(submittedAtIso)}</td>
                  </tr>
                </table>
              </div>
            </div>
          `,
        });

        if (resendErr) {
          emailError = resendErr.message || 'Resend dispatch error';
          console.error('Resend contest email error:', resendErr);
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        emailError = err?.message || 'Resend exception';
        console.error('Resend contest exception:', err);
      }
    }

    return NextResponse.json({
      success: true,
      submission: insertedRow,
      verifiedSalesCount,
      emailSent,
      emailError,
    });
  } catch (err) {
    return paywallErrorResponse(err);
  }
}
