// Single source of truth for "does this account own Pillar N?" on the client.
//
// Rules:
//   * Access comes ONLY from the authenticated user's live row in public.profiles
//     (fetched with `cache: 'no-store'`). Being signed in grants nothing.
//   * Nothing in localStorage / sessionStorage is ever consulted to unlock a pillar.
//
// The pure predicates here are mirrored server-side in lib/server/paywall.ts (profileHasPillar).
import { supabase } from './supabase';

export type PillarId = 1 | 2 | 3;

export const ENTITLEMENT_COLUMNS =
  'has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_expires_at, pillar2_paystack_ref, has_paid_pillar3, pillar3_expires_at, pillar3_paystack_ref, pillar3_tier';

export interface EntitlementRow {
  has_paid_global_chat?: boolean | null;
  global_chat_paystack_ref?: string | null;
  has_paid_pillar2?: boolean | null;
  pillar2_expires_at?: string | null;
  pillar2_paystack_ref?: string | null;
  has_paid_pillar3?: boolean | null;
  pillar3_expires_at?: string | null;
  pillar3_paystack_ref?: string | null;
  pillar3_tier?: string | null;
}

export const PILLAR_META: Record<PillarId, { name: string; shortName: string; price: string; path: string }> = {
  1: { name: 'Global Chat', shortName: 'Pillar 1 (Global Chat - GH₵ 50)', price: 'GH₵ 50.00', path: '/' },
  2: { name: 'Affiliate Hub', shortName: 'Pillar 2 (Affiliate Hub - GH₵ 90)', price: 'GH₵ 90.00', path: '/affiliate' },
  3: { name: 'AI Studio', shortName: 'Pillar 3 (AI Studio - GH₵ 50/100/200)', price: 'GH₵ 50 / 100 / 200', path: '/horpal-ai' },
};

export function hasPillar1Access(p: EntitlementRow | null | undefined): boolean {
  return Boolean(p) && p!.has_paid_global_chat === true && Boolean(p!.global_chat_paystack_ref);
}

export function hasPillar2Access(p: EntitlementRow | null | undefined, now: number = Date.now()): boolean {
  if (!p || p.has_paid_pillar2 !== true || !p.pillar2_paystack_ref) return false;
  return !p.pillar2_expires_at || new Date(p.pillar2_expires_at).getTime() > now;
}

export function hasPillar3Access(p: EntitlementRow | null | undefined, now: number = Date.now()): boolean {
  if (!p || p.has_paid_pillar3 !== true || !p.pillar3_paystack_ref || !p.pillar3_expires_at) return false;
  const exp = new Date(p.pillar3_expires_at).getTime();
  return Number.isFinite(exp) && exp > now;
}

export function hasPillarAccess(pillar: PillarId, p: EntitlementRow | null | undefined): boolean {
  if (pillar === 1) return hasPillar1Access(p);
  if (pillar === 2) return hasPillar2Access(p);
  return hasPillar3Access(p);
}

export interface PillarScorecard {
  pillar1: boolean;
  pillar2: boolean;
  pillar3: boolean;
}

export function getScorecard(p: EntitlementRow | null | undefined): PillarScorecard {
  return { pillar1: hasPillar1Access(p), pillar2: hasPillar2Access(p), pillar3: hasPillar3Access(p) };
}

/**
 * Fresh, uncached read of the signed-in user's entitlement columns straight from Supabase REST.
 * Throws on any transport/auth problem so callers fail CLOSED (never "assume paid").
 */
export async function fetchLiveEntitlements(userId: string): Promise<EntitlementRow | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('No active session.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase is not configured.');

  const res = await fetch(
    `${url}/rest/v1/profiles?select=${encodeURIComponent(ENTITLEMENT_COLUMNS)}&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
  if (!res.ok) throw new Error(`Entitlement lookup failed (${res.status}).`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? (rows[0] as EntitlementRow) : null;
}

/** Ask the DB to attach any already-paid, still-unclaimed passes (matched by the verified email). */
export async function claimPendingPasses(userId: string, email?: string | null): Promise<void> {
  try {
    await supabase.rpc('claim_paid_passes_for_user_rpc', { p_user_id: userId, p_email: email || '' });
  } catch (_) {
    // Non-fatal: the live entitlement read below is what decides access.
  }
}

/** Claim any parked passes, then read the live entitlements. Used by every verification flow. */
export async function auditAccount(userId: string, email?: string | null): Promise<EntitlementRow | null> {
  await claimPendingPasses(userId, email);
  return fetchLiveEntitlements(userId);
}

// ----------------------------------------------------------------------------
// Google OAuth return tracking (Phase 2). These keys only remember WHICH gate to reopen -
// they never grant access.
// ----------------------------------------------------------------------------
export const VERIFY_TARGET_KEY = 'verifying_pillar_target';

export function oauthRedirectFor(pillar: PillarId): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${PILLAR_META[pillar].path}?verify_pillar=${pillar}`;
}

export async function startGoogleVerification(pillar: PillarId): Promise<{ error?: string }> {
  try {
    sessionStorage.setItem(VERIFY_TARGET_KEY, `pillar${pillar}`);
  } catch (_) {}
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: oauthRedirectFor(pillar) },
  });
  if (error) {
    try {
      sessionStorage.removeItem(VERIFY_TARGET_KEY);
    } catch (_) {}
    return { error: error.message || 'Google Sign-In failed.' };
  }
  return {};
}

/**
 * Called once on page load. Returns the pillar whose verification gate must be reopened after a
 * Google OAuth round-trip (from `?verify_pillar=N` and/or sessionStorage), then clears the markers.
 */
export function consumeVerifyReturn(): PillarId | null {
  if (typeof window === 'undefined') return null;
  let fromUrl: number | null = null;
  try {
    const raw = new URLSearchParams(window.location.search).get('verify_pillar');
    if (raw === '1' || raw === '2' || raw === '3') fromUrl = Number(raw);
  } catch (_) {}

  let fromStore: number | null = null;
  try {
    const stored = sessionStorage.getItem(VERIFY_TARGET_KEY);
    const m = /^pillar([123])$/.exec(stored || '');
    if (m) fromStore = Number(m[1]);
  } catch (_) {}

  const target = fromUrl ?? fromStore;
  if (!target) return null;

  try {
    sessionStorage.removeItem(VERIFY_TARGET_KEY);
  } catch (_) {}
  if (fromUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('verify_pillar');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch (_) {}
  }
  return target as PillarId;
}

// ----------------------------------------------------------------------------
// Legacy local-storage purge (Phase 1). Nothing here is ever read to unlock a pillar; this just
// removes stale grants that older builds wrote so a shared phone can never inherit them.
// ----------------------------------------------------------------------------
const LEGACY_EXACT_KEYS = [
  'has_paid',
  'pillar1_paid',
  'pillar2_paid',
  'pillar3_paid',
  'affiliate_paid',
  'is_registered',
  'horpal_unlocked',
  'earnmega_access',
  'horpal_pillar2_paid_pass_v1',
  'horpal_gate_login_attempt',
  'earnmega_pillar3_login_attempt',
  'earnmega_pillar3_denied_diag',
  'horpal_denied_gate_email',
  'horpal_target_pillar',
  'horpal_p2_state_v3',
  'horpal_p2_user_state_test_bypass_id',
  'horpal_p2_license_test_bypass_id',
];
const LEGACY_PREFIXES = ['horpal_p2_license_'];

export function purgeLegacyAccessFlags(): void {
  if (typeof window === 'undefined') return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of LEGACY_EXACT_KEYS) store.removeItem(k);
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) store.removeItem(key);
      }
    } catch (_) {}
  }
}
