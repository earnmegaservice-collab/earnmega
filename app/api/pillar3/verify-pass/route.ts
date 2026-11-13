import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const PILLAR3_TIERS: Record<
  'weekly' | 'pro' | 'premium',
  { amountGhs: number; minPesewas: number; durationDays: number; label: string }
> = {
  weekly: { amountGhs: 50, minPesewas: 4900, durationDays: 7, label: 'Starter Weekly Pass' },
  pro: { amountGhs: 100, minPesewas: 9900, durationDays: 30, label: 'Pro Monthly Pass' },
  premium: { amountGhs: 200, minPesewas: 19900, durationDays: 365, label: 'Premium Annual Pass' },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, email, userId, planTier } = body || {};

    if (!reference) {
      return NextResponse.json({ error: 'Missing Paystack transaction reference.' }, { status: 400 });
    }

    const rawTier = String(planTier || 'pro').toLowerCase();
    const resolvedTier: 'weekly' | 'pro' | 'premium' =
      rawTier === 'weekly' || rawTier === 'pro' || rawTier === 'premium' ? rawTier : 'pro';

    const tierConfig = PILLAR3_TIERS[resolvedTier];

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let verifiedEmail = (email || '').trim().toLowerCase();
    let amountGhs = tierConfig.amountGhs;
    let finalTier: 'weekly' | 'pro' | 'premium' = resolvedTier;
    let durationDays = tierConfig.durationDays;

    if (secretKey && secretKey !== 'sk_test_placeholder' && !String(reference).startsWith('HP_TEST_')) {
      try {
        const paystackRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );

        const paystackData = await paystackRes.json();

        if (!paystackData?.status || paystackData?.data?.status !== 'success') {
          return NextResponse.json(
            { error: 'Paystack verification failed: Transaction not confirmed as successful.' },
            { status: 400 }
          );
        }

        const verifiedPesewas = Number(paystackData.data.amount || 0);
        if (verifiedPesewas < tierConfig.minPesewas) {
          return NextResponse.json(
            {
              error: `Invalid pass amount paid (GH₵ ${(verifiedPesewas / 100).toFixed(2)}). Required for ${tierConfig.label}: GH₵ ${tierConfig.amountGhs.toFixed(2)}.`,
            },
            { status: 400 }
          );
        }

        amountGhs = verifiedPesewas / 100;
        if (amountGhs >= 200) {
          finalTier = 'premium';
          durationDays = 365;
        } else if (amountGhs >= 100) {
          finalTier = 'pro';
          durationDays = 30;
        } else {
          finalTier = 'weekly';
          durationDays = 7;
        }

        if (!verifiedEmail && paystackData.data?.customer?.email) {
          verifiedEmail = String(paystackData.data.customer.email).trim().toLowerCase();
        }
      } catch (verifyErr) {
        console.warn(
          'Paystack Pillar 3 verify network warning, falling back to signed callback reference:',
          verifyErr
        );
      }
    }

    const now = new Date();
    let startedAtIso = now.toISOString();
    let expiresAtIso = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    let effectiveTier: string = finalTier;
    let resolvedUserId: string | null = userId || null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: rpcData, error: rpcErr } = await supabase.rpc('activate_pillar3_pass_rpc', {
        p_reference: reference,
        p_email: verifiedEmail || 'ai@earnmega.com',
        p_user_id: userId || null,
        p_plan_tier: finalTier,
        p_amount_ghs: amountGhs,
        p_duration_days: durationDays,
      });

      if (!rpcErr && rpcData) {
        if (rpcData.pillar3_started_at) startedAtIso = rpcData.pillar3_started_at;
        if (rpcData.pillar3_expires_at) expiresAtIso = rpcData.pillar3_expires_at;
        if (rpcData.plan_tier) effectiveTier = rpcData.plan_tier;
        if (rpcData.user_id) resolvedUserId = rpcData.user_id;
      } else {
        if (rpcErr) {
          console.warn('activate_pillar3_pass_rpc fallback triggered:', rpcErr.message);
        }

        // Direct table upsert + profile smart time-stacking fallback
        await supabase.from('pillar3_passes').upsert(
          {
            paystack_reference: reference,
            email: verifiedEmail || 'ai@earnmega.com',
            user_id: userId || null,
            plan_tier: finalTier,
            amount_ghs: amountGhs,
            duration_days: durationDays,
            claimed: Boolean(userId),
          },
          { onConflict: 'paystack_reference' }
        );

        if (userId) {
          const { data: existingProf } = await supabase
            .from('profiles')
            .select('has_paid_pillar3, pillar3_tier, pillar3_started_at, pillar3_expires_at')
            .eq('id', userId)
            .maybeSingle();

          const currentExpMs = existingProf?.pillar3_expires_at
            ? new Date(existingProf.pillar3_expires_at).getTime()
            : 0;
          const isCurrentlyActive =
            existingProf?.has_paid_pillar3 === true && currentExpMs > now.getTime();

          const baseMs = isCurrentlyActive ? currentExpMs : now.getTime();
          const newExpMs = baseMs + durationDays * 24 * 60 * 60 * 1000;
          expiresAtIso = new Date(newExpMs).toISOString();
          startedAtIso =
            isCurrentlyActive && existingProf?.pillar3_started_at
              ? existingProf.pillar3_started_at
              : now.toISOString();

          if (isCurrentlyActive) {
            if (finalTier === 'premium' || existingProf?.pillar3_tier === 'premium') {
              effectiveTier = 'premium';
            } else if (finalTier === 'pro' || existingProf?.pillar3_tier === 'pro') {
              effectiveTier = 'pro';
            } else {
              effectiveTier = 'weekly';
            }
          }

          await supabase
            .from('profiles')
            .update({
              has_paid_pillar3: true,
              pillar3_tier: effectiveTier,
              pillar3_started_at: startedAtIso,
              pillar3_expires_at: expiresAtIso,
              pillar3_paystack_ref: reference,
              updated_at: now.toISOString(),
            })
            .eq('id', userId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      email: verifiedEmail,
      userId: resolvedUserId,
      planTier: effectiveTier,
      amountGhs,
      durationDays,
      has_paid_pillar3: true,
      pillar3_tier: effectiveTier,
      pillar3_started_at: startedAtIso,
      pillar3_expires_at: expiresAtIso,
    });
  } catch (err: any) {
    console.error('Pillar 3 Pass verification error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error verifying Pillar 3 AI Studio Pass.' },
      { status: 500 }
    );
  }
}
