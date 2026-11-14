import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedUser } from '@/lib/server/paywall';
import {
  PillarId,
  computeDaysLeft,
  getBounceBackWarningMessage,
  isValidPaystackRef,
} from '@/utils/pillarAccess';

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

async function handleVerifyPillarStatus(userIdParam: string | null, pillarParam: string | null) {
  const admin = getAdminClient();

  const rawPillar = Number(pillarParam || 1);
  const targetPillar: PillarId = rawPillar === 2 ? 2 : rawPillar === 3 ? 3 : 1;

  if (!userIdParam || !userIdParam.trim()) {
    return NextResponse.json(
      {
        allowed: false,
        pillar: targetPillar,
        userId: '',
        email: '',
        pillar1Paid: false,
        pillar2Paid: false,
        pillar3Paid: false,
        entitlements: null,
        bounceMessage: getBounceBackWarningMessage(targetPillar, 'your account'),
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  const userId = userIdParam.trim();

  // Fetch user profile using SUPABASE_SERVICE_ROLE_KEY
  let { data: profile } = await admin
    .from('profiles')
    .select(
      'id, email, has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_paystack_ref, pillar2_paid_at, pillar2_expires_at, has_paid_pillar3, pillar3_paystack_ref, pillar3_tier, pillar3_started_at, pillar3_expires_at'
    )
    .eq('id', userId)
    .maybeSingle();

  let userEmail = normalizeEmail(profile?.email);
  if (!userEmail) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        userEmail = normalizeEmail(authUser.user.email);
      }
    } catch {
      // Ignore admin lookup failure
    }
  }

  // Auto-claim any unclaimed Paystack pass in the specific ledger for this email before verifying
  if (userEmail) {
    // Check unclaimed Pillar 1 pass
    if (!profile?.has_paid_global_chat || !isValidPaystackRef(profile?.global_chat_paystack_ref)) {
      const { data: p1Unclaimed } = await admin
        .from('global_chat_passes')
        .select('paystack_reference')
        .ilike('email', userEmail)
        .or(`claimed_by_user_id.is.null,claimed_by_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (p1Unclaimed && isValidPaystackRef(p1Unclaimed.paystack_reference)) {
        await admin
          .from('global_chat_passes')
          .update({ claimed_by_user_id: userId })
          .eq('paystack_reference', p1Unclaimed.paystack_reference);
        await admin
          .from('profiles')
          .update({
            email: userEmail,
            has_paid_global_chat: true,
            global_chat_paystack_ref: p1Unclaimed.paystack_reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    // Check unclaimed Pillar 2 pass
    if (!profile?.has_paid_pillar2 || !isValidPaystackRef(profile?.pillar2_paystack_ref)) {
      const { data: p2Unclaimed } = await admin
        .from('pillar2_passes')
        .select('paystack_reference, created_at')
        .ilike('email', userEmail)
        .or(`claimed_by_user_id.is.null,claimed_by_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (p2Unclaimed && isValidPaystackRef(p2Unclaimed.paystack_reference)) {
        const paidAt = p2Unclaimed.created_at || new Date().toISOString();
        const expiresAt = new Date(new Date(paidAt).getTime() + 365 * 86_400_000).toISOString();
        await admin
          .from('pillar2_passes')
          .update({ claimed_by_user_id: userId })
          .eq('paystack_reference', p2Unclaimed.paystack_reference);
        await admin
          .from('profiles')
          .update({
            email: userEmail,
            has_paid_pillar2: true,
            is_pillar2_paid: true,
            pillar2_paid_at: paidAt,
            pillar2_expires_at: expiresAt,
            license_activated_at: paidAt,
            license_expires_at: expiresAt,
            pillar2_paystack_ref: p2Unclaimed.paystack_reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    // Check unclaimed Pillar 3 pass
    if (!profile?.has_paid_pillar3 || !isValidPaystackRef(profile?.pillar3_paystack_ref)) {
      const { data: p3Unclaimed } = await admin
        .from('pillar3_passes')
        .select('paystack_reference, plan_tier, duration_days, created_at')
        .ilike('email', userEmail)
        .or(`claimed_by_user_id.is.null,claimed_by_user_id.eq.${userId},user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (p3Unclaimed && isValidPaystackRef(p3Unclaimed.paystack_reference)) {
        const startedAt = p3Unclaimed.created_at || new Date().toISOString();
        const days = Number(p3Unclaimed.duration_days || 30);
        const expiresAt = new Date(new Date(startedAt).getTime() + days * 86_400_000).toISOString();
        await admin
          .from('pillar3_passes')
          .update({ user_id: userId, claimed_by_user_id: userId, claimed: true })
          .eq('paystack_reference', p3Unclaimed.paystack_reference);
        await admin
          .from('profiles')
          .update({
            email: userEmail,
            has_paid_pillar3: true,
            pillar3_tier: p3Unclaimed.plan_tier || 'pro',
            pillar3_started_at: startedAt,
            pillar3_expires_at: expiresAt,
            pillar3_paystack_ref: p3Unclaimed.paystack_reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    // Re-read fresh profile row after any auto-claim
    const refreshed = await admin
      .from('profiles')
      .select(
        'id, email, has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_paystack_ref, pillar2_paid_at, pillar2_expires_at, has_paid_pillar3, pillar3_paystack_ref, pillar3_tier, pillar3_started_at, pillar3_expires_at'
      )
      .eq('id', userId)
      .maybeSingle();
    if (refreshed.data) {
      profile = refreshed.data;
    }
  }

  const nowMs = Date.now();

  // 1. Verify Pillar 1: profiles.has_paid_global_chat === true AND global_chat_paystack_ref IS NOT NULL + ledger pass check
  let pillar1Paid = false;
  const p1Ref = profile?.global_chat_paystack_ref ? String(profile.global_chat_paystack_ref).trim() : null;
  if (profile?.has_paid_global_chat === true && isValidPaystackRef(p1Ref)) {
    const { data: p1Pass } = await admin
      .from('global_chat_passes')
      .select('paystack_reference')
      .eq('paystack_reference', p1Ref)
      .maybeSingle();
    pillar1Paid = Boolean(p1Pass?.paystack_reference);
  }

  // 2. Verify Pillar 2: profiles.has_paid_pillar2 === true AND pillar2_paystack_ref IS NOT NULL AND pillar2_expires_at > NOW() + ledger pass check
  let pillar2Paid = false;
  const p2Ref = profile?.pillar2_paystack_ref ? String(profile.pillar2_paystack_ref).trim() : null;
  const p2ExpiresAt = profile?.pillar2_expires_at ? String(profile.pillar2_expires_at) : null;
  const p2ExpiresMs = p2ExpiresAt ? new Date(p2ExpiresAt).getTime() : 0;
  if (
    profile?.has_paid_pillar2 === true &&
    isValidPaystackRef(p2Ref) &&
    Number.isFinite(p2ExpiresMs) &&
    p2ExpiresMs > nowMs
  ) {
    const { data: p2Pass } = await admin
      .from('pillar2_passes')
      .select('paystack_reference')
      .eq('paystack_reference', p2Ref)
      .maybeSingle();

    if (p2Pass?.paystack_reference) {
      pillar2Paid = true;
    } else {
      const { data: p2Course } = await admin
        .from('pillar2_unlocked_courses')
        .select('paystack_reference')
        .eq('paystack_reference', p2Ref)
        .limit(1)
        .maybeSingle();
      pillar2Paid = Boolean(p2Course?.paystack_reference);
    }
  }

  // 3. Verify Pillar 3: profiles.has_paid_pillar3 === true AND pillar3_paystack_ref IS NOT NULL AND pillar3_expires_at > NOW() + ledger pass check
  let pillar3Paid = false;
  const p3Ref = profile?.pillar3_paystack_ref ? String(profile.pillar3_paystack_ref).trim() : null;
  const p3ExpiresAt = profile?.pillar3_expires_at ? String(profile.pillar3_expires_at) : null;
  const p3ExpiresMs = p3ExpiresAt ? new Date(p3ExpiresAt).getTime() : 0;
  const p3Tier = String(profile?.pillar3_tier || 'none').toLowerCase();
  if (
    profile?.has_paid_pillar3 === true &&
    isValidPaystackRef(p3Ref) &&
    p3Tier !== 'none' &&
    Number.isFinite(p3ExpiresMs) &&
    p3ExpiresMs > nowMs
  ) {
    const { data: p3Pass } = await admin
      .from('pillar3_passes')
      .select('paystack_reference')
      .eq('paystack_reference', p3Ref)
      .maybeSingle();
    pillar3Paid = Boolean(p3Pass?.paystack_reference);
  }

  const allowed =
    targetPillar === 1 ? pillar1Paid : targetPillar === 2 ? pillar2Paid : pillar3Paid;

  const entitlements = {
    userId,
    email: userEmail || profile?.email || '',
    p1Paid: pillar1Paid,
    p1Ref: pillar1Paid ? p1Ref : null,
    p2Paid: pillar2Paid,
    p2Ref: pillar2Paid ? p2Ref : null,
    p2ExpiresAt: pillar2Paid ? p2ExpiresAt : null,
    p2DaysLeft: pillar2Paid ? computeDaysLeft(p2ExpiresAt) : 0,
    p3Paid: pillar3Paid,
    p3Ref: pillar3Paid ? p3Ref : null,
    p3Tier: pillar3Paid ? p3Tier : 'none',
    p3ExpiresAt: pillar3Paid ? p3ExpiresAt : null,
    p3DaysLeft: pillar3Paid ? computeDaysLeft(p3ExpiresAt) : 0,
  };

  return NextResponse.json(
    {
      allowed,
      pillar: targetPillar,
      userId,
      email: entitlements.email,
      pillar1Paid,
      pillar2Paid,
      pillar3Paid,
      entitlements,
      bounceMessage: allowed
        ? null
        : getBounceBackWarningMessage(targetPillar, entitlements.email || 'your account'),
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');
    const pillar = searchParams.get('pillar') || '1';

    if (!userId) {
      const authUser = await getAuthedUser(req, getAdminClient());
      if (authUser?.id) userId = authUser.id;
    }

    return await handleVerifyPillarStatus(userId, pillar);
  } catch (err: any) {
    console.error('[/api/auth/verify-pillar-status GET] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Verification failed', allowed: false },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId = body?.userId ? String(body.userId) : null;
    const pillar = body?.pillar ? String(body.pillar) : '1';

    if (!userId) {
      const authUser = await getAuthedUser(req, getAdminClient());
      if (authUser?.id) userId = authUser.id;
    }

    return await handleVerifyPillarStatus(userId, pillar);
  } catch (err: any) {
    console.error('[/api/auth/verify-pillar-status POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Verification failed', allowed: false },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
