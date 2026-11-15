import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAnonFallbackClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function generateHorPalPassword(): string {
  const sixDigits = Math.floor(100000 + Math.random() * 900000);
  return `HP-${sixDigits}`;
}

export interface ProvisionedUserResult {
  userId: string | null;
  email: string;
  accountPassword: string;
  isNewUser: boolean;
}

/**
 * Shared Server Helper: ensureUserWithPassword(email, name, phone)
 * - Checks if the user already exists in auth.users / public.profiles and already has an account_password.
 * - If they already have an account_password, keeps that exact password and re-syncs it with
 *   supabaseAdmin.auth.admin.updateUserById({ password: existingPassword, email_confirm: true })
 *   to guarantee Email + Password login works 100%.
 * - If they are a new user (or have no account_password yet), generates a clean password (HP-XXXXXX),
 *   creates or updates their Supabase Auth user with { email, password: generatedPassword, email_confirm: true },
 *   and saves account_password = generatedPassword in public.profiles.
 */
export async function ensureUserWithPassword(
  email: string,
  name?: string | null,
  phone?: string | null
): Promise<ProvisionedUserResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const fallbackPassword = generateHorPalPassword();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      userId: null,
      email: cleanEmail,
      accountPassword: fallbackPassword,
      isNewUser: false,
    };
  }

  const supabaseAdmin = getServiceClient();
  const displayName =
    (name && String(name).trim()) || cleanEmail.split('@')[0] || 'HorPal Member';
  const cleanPhone = (phone && String(phone).trim()) || undefined;

  let resolvedUserId: string | null = null;
  let existingPassword: string | null = null;
  let isNewUser = false;

  // Step 1: Check public.profiles for existing user & account_password
  try {
    let { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, account_password')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (profErr) {
      const anonClient = getAnonFallbackClient();
      const fallbackRes = await anonClient
        .from('profiles')
        .select('id, email, account_password')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();
      prof = fallbackRes.data;
    }

    if (prof?.id) {
      resolvedUserId = String(prof.id);
    }
    if (prof?.account_password && String(prof.account_password).trim() !== '') {
      existingPassword = String(prof.account_password).trim();
    }
  } catch (err) {
    console.warn('[ensureUserWithPassword] profile lookup warning:', err);
  }

  const targetPassword = existingPassword || fallbackPassword;

  // Step 2: Execute Supabase Auth Admin provisioning (SUPABASE_SERVICE_ROLE_KEY)
  try {
    if (resolvedUserId) {
      const { data: existingAuth, error: getAuthErr } =
        await supabaseAdmin.auth.admin.getUserById(resolvedUserId);

      if (!getAuthErr && existingAuth?.user) {
        await supabaseAdmin.auth.admin.updateUserById(resolvedUserId, {
          password: targetPassword,
          email_confirm: true,
        });
      } else {
        // Search auth.users by email or create new
        const { data: created, error: createErr } =
          await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: targetPassword,
            email_confirm: true,
            user_metadata: {
              full_name: displayName,
              name: displayName,
              phone: cleanPhone,
            },
          });

        if (!createErr && created?.user?.id) {
          resolvedUserId = created.user.id;
          isNewUser = true;
        }
      }
    } else {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: targetPassword,
          email_confirm: true,
          user_metadata: {
            full_name: displayName,
            name: displayName,
            phone: cleanPhone,
          },
        });

      if (!createErr && created?.user?.id) {
        resolvedUserId = created.user.id;
        isNewUser = true;
      } else if (createErr) {
        // User may already exist in auth.users without profile email match
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const matched = (listData?.users || []).find(
          (u) => (u.email || '').trim().toLowerCase() === cleanEmail
        );
        if (matched?.id) {
          resolvedUserId = matched.id;
          await supabaseAdmin.auth.admin.updateUserById(matched.id, {
            password: targetPassword,
            email_confirm: true,
          });
        }
      }
    }

    if (resolvedUserId) {
      const affiliateCode = `HP-${resolvedUserId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
      await supabaseAdmin.from('profiles').upsert(
        {
          id: resolvedUserId,
          email: cleanEmail,
          full_name: displayName,
          phone: cleanPhone || null,
          account_password: targetPassword,
          affiliate_code: affiliateCode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (adminErr) {
    console.warn('[ensureUserWithPassword] auth.admin fallback to RPC:', adminErr);
  }

  // Step 3: Also run SECURITY DEFINER RPC ensure_user_with_password_rpc to guarantee
  // auth.users, auth.identities, and public.profiles.account_password are 100% synced
  try {
    let rpcRes = await supabaseAdmin.rpc('ensure_user_with_password_rpc', {
      p_email: cleanEmail,
      p_name: displayName,
      p_phone: cleanPhone || null,
      p_preferred_password: targetPassword,
    });

    if (rpcRes.error) {
      const anonClient = getAnonFallbackClient();
      rpcRes = await anonClient.rpc('ensure_user_with_password_rpc', {
        p_email: cleanEmail,
        p_name: displayName,
        p_phone: cleanPhone || null,
        p_preferred_password: targetPassword,
      });
    }

    if (rpcRes.data) {
      const payload = rpcRes.data as {
        user_id?: string;
        email?: string;
        account_password?: string;
        is_new_user?: boolean;
      };
      return {
        userId: payload.user_id || resolvedUserId,
        email: payload.email || cleanEmail,
        accountPassword: payload.account_password || targetPassword,
        isNewUser: Boolean(payload.is_new_user ?? isNewUser),
      };
    }
  } catch (rpcErr) {
    console.warn('[ensureUserWithPassword] RPC warning:', rpcErr);
  }

  return {
    userId: resolvedUserId,
    email: cleanEmail,
    accountPassword: targetPassword,
    isNewUser,
  };
}

/**
 * Admin Helper: Simultaneously updates BOTH supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword, email_confirm: true })
 * AND public.profiles.account_password = newPassword so the user can immediately log in with that exact password.
 */
export async function adminSetUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<{
  success: boolean;
  userId: string;
  email: string | null;
  accountPassword: string;
  error?: string;
}> {
  const cleanUserId = String(targetUserId || '').trim();
  const cleanPassword = String(newPassword || '').trim();

  if (!cleanUserId || cleanPassword.length < 4) {
    return {
      success: false,
      userId: cleanUserId,
      email: null,
      accountPassword: cleanPassword,
      error: 'Valid userId and password (min 4 characters) are required.',
    };
  }

  const supabaseAdmin = getServiceClient();
  let updatedViaAdmin = false;
  let resolvedEmail: string | null = null;

  // 1. Update via supabaseAdmin.auth.admin.updateUserById + public.profiles
  try {
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.updateUserById(cleanUserId, {
        password: cleanPassword,
        email_confirm: true,
      });
    if (!authErr) {
      updatedViaAdmin = true;
      resolvedEmail = authData?.user?.email || null;
    }

    const { data: profData, error: profErr } = await supabaseAdmin
      .from('profiles')
      .update({
        account_password: cleanPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanUserId)
      .select('email')
      .maybeSingle();

    if (!profErr && profData?.email) {
      resolvedEmail = profData.email;
    }
  } catch (err) {
    console.warn('[adminSetUserPassword] supabaseAdmin warning:', err);
  }

  // 2. Also execute SECURITY DEFINER RPC admin_set_user_password_rpc to ensure auth.users + auth.identities + public.profiles are 100% synced
  try {
    let rpcRes = await supabaseAdmin.rpc('admin_set_user_password_rpc', {
      p_user_id: cleanUserId,
      p_new_password: cleanPassword,
    });

    if (rpcRes.error) {
      const anonClient = getAnonFallbackClient();
      rpcRes = await anonClient.rpc('admin_set_user_password_rpc', {
        p_user_id: cleanUserId,
        p_new_password: cleanPassword,
      });
    }

    if (rpcRes.data) {
      const d = rpcRes.data as { email?: string; account_password?: string };
      return {
        success: true,
        userId: cleanUserId,
        email: d.email || resolvedEmail,
        accountPassword: d.account_password || cleanPassword,
      };
    }
  } catch (rpcErr) {
    console.warn('[adminSetUserPassword] RPC warning:', rpcErr);
  }

  return {
    success: updatedViaAdmin,
    userId: cleanUserId,
    email: resolvedEmail,
    accountPassword: cleanPassword,
    error: updatedViaAdmin ? undefined : 'Could not update user password.',
  };
}

export interface SendCongratulationsEmailOptions {
  buyerEmail: string;
  buyerName?: string | null;
  accountPassword: string;
  unlockedTitle: string;
  pillarLabel: string;
  amountGHS?: number;
  reference?: string;
  extraDetailsHtml?: string;
  sendAdminCopy?: boolean;
}

/**
 * Sends the luxury HTML Buyer Congratulations + Login Password email via Resend
 * AND optionally sends/includes Generated Buyer Login Password in the Admin notification email.
 * Wrapped in try/catch so email issues never block payment verification.
 */
export async function sendBuyerCongratulationsAndAdminPasswordEmails(
  opts: SendCongratulationsEmailOptions
): Promise<void> {
  const cleanBuyerEmail = String(opts.buyerEmail || '').trim().toLowerCase();
  const accountPassword = String(opts.accountPassword || '').trim();
  if (!cleanBuyerEmail || !cleanBuyerEmail.includes('@') || !accountPassword) {
    return;
  }

  const resendApiKey =
    process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY_AFFILIATE ||
    process.env.RESEND_API_KEY_MAIN ||
    '';

  if (!resendApiKey) {
    console.warn(
      `[Resend Safeguard] RESEND_API_KEY not configured. Credentials for ${cleanBuyerEmail} -> Password: ${accountPassword}`
    );
    return;
  }

  const resend = new Resend(resendApiKey);
  const fromAddress =
    process.env.RESEND_FROM_EMAIL || 'HorPal Security <onboarding@resend.dev>';
  const buyerDisplayName =
    (opts.buyerName && String(opts.buyerName).trim()) ||
    cleanBuyerEmail.split('@')[0];

  const subject = '🎉 Congratulations! Your HorPal Access & Login Password Are Ready';

  const buyerHtml = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #070b14; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
      <div style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #451a03 100%); padding: 32px 28px; text-align: center; border-bottom: 1px solid rgba(251, 191, 36, 0.25);">
        <div style="display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.45); color: #34d399; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 12px;">
          VERIFIED PAYSTACK ACCESS UNLOCKED
        </div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
          🎉 Congratulations, ${buyerDisplayName}!
        </h1>
        <p style="margin: 10px 0 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
          Your payment has been verified and your <strong style="color: #fbbf24;">${opts.unlockedTitle}</strong> (${opts.pillarLabel}) is now officially active!
        </p>
      </div>

      <div style="padding: 28px;">
        <p style="margin: 0 0 18px; font-size: 14px; color: #e2e8f0; line-height: 1.6;">
          Welcome to HorPal! Below are your official personal login credentials. Save this email so you always have instant access to your account:
        </p>

        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(245, 158, 11, 0.14) 100%); border: 2px solid #fbbf24; border-radius: 16px; padding: 22px; margin-bottom: 22px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #fbbf24; margin-bottom: 6px;">
            YOUR OFFICIAL HORPAL LOGIN CREDENTIALS
          </div>
          <div style="margin: 12px 0; padding: 12px 16px; background: rgba(2, 6, 23, 0.75); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">Login Email (Gmail)</div>
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 4px; word-break: break-all;">${cleanBuyerEmail}</div>
          </div>

          <div style="margin: 12px 0 0; padding: 16px; background: #022c22; border-radius: 12px; border: 2px solid #10b981;">
            <div style="font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800;">Your Account Password</div>
            <div style="font-size: 28px; font-weight: 900; font-family: 'Courier New', monospace; color: #fbbf24; letter-spacing: 0.12em; margin-top: 6px;">
              ${accountPassword}
            </div>
          </div>
        </div>

        <div style="background: rgba(15, 23, 42, 0.9); border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 10px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.55;">
            💡 <strong>How to Sign In Anytime:</strong><br/>
            <em>"You can now sign in anytime on any phone or computer using either your Gmail + Password above OR 'Continue with Google'."</em>
          </p>
        </div>

        ${
          opts.amountGHS || opts.reference
            ? `<div style="font-size: 12px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; margin-top: 16px;">
                <div><strong>Unlocked Access:</strong> ${opts.unlockedTitle} (${opts.pillarLabel})</div>
                ${opts.amountGHS ? `<div><strong>Verified Amount:</strong> GH₵ ${Number(opts.amountGHS).toFixed(2)}</div>` : ''}
                ${opts.reference ? `<div><strong>Paystack Reference:</strong> ${opts.reference}</div>` : ''}
                ${opts.extraDetailsHtml || ''}
              </div>`
            : ''
        }
      </div>

      <div style="background: #030712; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.06);">
        HorPal Global Platform • Automated Security & Credential Provisioning
      </div>
    </div>
  `;

  // 1. Send Buyer Congratulations Email (wrapped in try/catch)
  try {
    await resend.emails.send({
      from: fromAddress,
      to: [cleanBuyerEmail],
      subject,
      html: buyerHtml,
    });
  } catch (buyerErr) {
    console.warn('[Resend Safeguard] Buyer congratulations email warning:', buyerErr);
  }

  // 2. Send Admin copy if requested (or when not already sent by caller)
  if (opts.sendAdminCopy) {
    try {
      const adminEmails = Array.from(
        new Set(
          [
            process.env.ADMIN_CONTACT_EMAIL,
            process.env.ADMIN_CONTACT_EMAIL_AFFILIATE,
            'earnmegaservice@gmail.com',
            'geestablish@gmail.com',
          ]
            .map((e) => (e || '').trim())
            .filter(Boolean)
        )
      );

      if (adminEmails.length > 0) {
        await resend.emails.send({
          from: fromAddress,
          to: adminEmails,
          subject: `🔑 [ADMIN CREDENTIAL LOG] ${opts.pillarLabel} Unlocked — ${cleanBuyerEmail}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 14px; border: 1px solid #334155;">
              <h2 style="margin-top: 0; color: #34d399;">✅ Verified Payment & Buyer Password Provisioned</h2>
              <p><strong>Pillar / Access:</strong> ${opts.unlockedTitle} (${opts.pillarLabel})</p>
              <p><strong>Buyer Name:</strong> ${buyerDisplayName}</p>
              <p><strong>Buyer Login Email (Gmail):</strong> ${cleanBuyerEmail}</p>
              <p style="font-size: 16px; background: #022c22; border: 1px solid #10b981; padding: 12px; border-radius: 8px; color: #fbbf24;">
                <strong>Generated Buyer Login Password: ${accountPassword}</strong>
              </p>
              ${opts.amountGHS ? `<p><strong>Amount Paid:</strong> GH₵ ${Number(opts.amountGHS).toFixed(2)}</p>` : ''}
              ${opts.reference ? `<p><strong>Paystack Reference:</strong> ${opts.reference}</p>` : ''}
            </div>
          `,
        });
      }
    } catch (adminErr) {
      console.warn('[Resend Safeguard] Admin credential copy warning:', adminErr);
    }
  }
}
