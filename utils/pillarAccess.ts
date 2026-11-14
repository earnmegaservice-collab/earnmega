import { supabase } from './supabase';

export type PillarId = 1 | 2 | 3;

export const APP_DATA_VERSION = 'v_clean_slate_2026_11_14';
export const RESET_VERSION_STORAGE_KEY = 'earnmega_reset_version';

export const ENTITLEMENT_COLUMNS =
  'has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_expires_at, pillar2_paystack_ref, has_paid_pillar3, pillar3_expires_at, pillar3_paystack_ref, pillar3_tier';

export interface EntitlementRow {
  id?: string;
  email?: string | null;
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

export const PILLAR_META: Record<
  PillarId,
  { name: string; shortName: string; price: string; path: string }
> = {
  1: {
    name: 'Global Chat',
    shortName: 'Pillar 1 (Global Chat - GH₵ 50)',
    price: 'GH₵ 50.00',
    path: '/',
  },
  2: {
    name: 'Affiliate Hub',
    shortName: 'Pillar 2 (Affiliate Hub - GH₵ 90)',
    price: 'GH₵ 90.00',
    path: '/affiliate',
  },
  3: {
    name: 'AI Studio',
    shortName: 'Pillar 3 (AI Studio - GH₵ 50/100/200)',
    price: 'GH₵ 50 / 100 / 200',
    path: '/horpal-ai',
  },
};

export interface PillarEntitlementState {
  userId: string;
  email: string;
  p1Paid: boolean;
  p1Ref: string | null;
  p2Paid: boolean;
  p2Ref: string | null;
  p2ExpiresAt: string | null;
  p2DaysLeft: number;
  p3Paid: boolean;
  p3Ref: string | null;
  p3Tier: string;
  p3ExpiresAt: string | null;
  p3DaysLeft: number;
}

export interface PillarAuditResult {
  allowed: boolean;
  targetPillar: PillarId;
  state: PillarEntitlementState;
  otherPaidPillars: PillarId[];
  denialReason: string | null;
}

export interface PhonePassportData {
  userId: string;
  email: string;
  pillar1Paid: boolean;
  pillar2Paid: boolean;
  pillar3Paid: boolean;
  pillar2ExpiresAt: string | null;
  pillar3ExpiresAt: string | null;
  pillar3Tier: string;
  updatedAt: string;
}

export interface SavedPhoneAccount {
  userId: string;
  email: string;
  pillar1Paid: boolean;
  pillar2Paid: boolean;
  pillar3Paid: boolean;
  lastActiveAt: string;
}

export interface VerifyPillarStatusResponse {
  allowed: boolean;
  pillar: PillarId;
  userId: string;
  email: string;
  pillar1Paid: boolean;
  pillar2Paid: boolean;
  pillar3Paid: boolean;
  entitlements: PillarEntitlementState;
  entitlementRow: EntitlementRow;
  bounceMessage: string | null;
}

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
  'horpal_global_chat_unlocked_v2',
  'horpal_pillar2_paid_v1',
  'horpal_pillar3_unlocked_v1',
  'horpal_p1_paid',
  'horpal_p2_paid',
  'horpal_p3_paid',
  'earnmega_p1_unlocked',
  'earnmega_p2_unlocked',
  'earnmega_p3_unlocked',
];
const LEGACY_PREFIXES = ['horpal_p2_license_'];
const SAVED_ACCOUNTS_STORAGE_KEY = 'earnmega_saved_phone_accounts_v1';

export function isValidPaystackRef(ref: unknown): boolean {
  if (typeof ref !== 'string') return false;
  const trimmed = ref.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('EXISTING_USER_GRANDFATHERED')) return false;
  if (trimmed.startsWith('HP_TEST_')) return false;
  return true;
}

/**
 * PHASE 1.4: Client-Side Cache Buster (`APP_DATA_VERSION = 'v_clean_slate_2026_11_14'`)
 * On app load, if `localStorage.getItem('earnmega_reset_version') !== 'v_clean_slate_2026_11_14'`,
 * clear all old localStorage and sessionStorage keys (groups, chats, fake unlocks)
 * and set `'earnmega_reset_version' = 'v_clean_slate_2026_11_14'`.
 */
export function enforceCleanSlateVersion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const currentVersion = window.localStorage.getItem(RESET_VERSION_STORAGE_KEY);
    if (currentVersion !== APP_DATA_VERSION) {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(RESET_VERSION_STORAGE_KEY, APP_DATA_VERSION);
      return true;
    }
  } catch {
    // Ignore storage errors in restricted webviews
  }
  return false;
}

export function purgeLegacyAccessFlags(): void {
  if (typeof window === 'undefined') return;
  enforceCleanSlateVersion();
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of LEGACY_EXACT_KEYS) store.removeItem(k);
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) store.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export function getPhonePassportKey(userId: string): string {
  return `earnmega_phone_passport_${userId}`;
}

export function savePhonePassport(
  userId: string,
  data: {
    email?: string;
    pillar1Paid: boolean;
    pillar2Paid: boolean;
    pillar3Paid: boolean;
    pillar2ExpiresAt?: string | null;
    pillar3ExpiresAt?: string | null;
    pillar3Tier?: string;
  }
): void {
  if (typeof window === 'undefined' || !userId) return;
  enforceCleanSlateVersion();
  try {
    const existing = readPhonePassport(userId);
    const email = (data.email || existing?.email || '').trim().toLowerCase();
    const payload: PhonePassportData = {
      userId,
      email,
      pillar1Paid: Boolean(data.pillar1Paid),
      pillar2Paid: Boolean(data.pillar2Paid),
      pillar3Paid: Boolean(data.pillar3Paid),
      pillar2ExpiresAt: data.pillar2ExpiresAt ?? existing?.pillar2ExpiresAt ?? null,
      pillar3ExpiresAt: data.pillar3ExpiresAt ?? existing?.pillar3ExpiresAt ?? null,
      pillar3Tier: data.pillar3Tier ?? existing?.pillar3Tier ?? 'none',
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(getPhonePassportKey(userId), JSON.stringify(payload));

    if (email) {
      recordSavedPhoneAccount({
        userId,
        email,
        pillar1Paid: payload.pillar1Paid,
        pillar2Paid: payload.pillar2Paid,
        pillar3Paid: payload.pillar3Paid,
        lastActiveAt: payload.updatedAt,
      });
    }
  } catch {
    // Ignore storage errors
  }
}

export function readPhonePassport(userId?: string | null): PhonePassportData | null {
  if (typeof window === 'undefined' || !userId) return null;
  enforceCleanSlateVersion();
  try {
    const raw = window.localStorage.getItem(getPhonePassportKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PhonePassportData;
    if (!parsed || parsed.userId !== userId) return null;

    const nowMs = Date.now();
    let p2Valid = Boolean(parsed.pillar2Paid);
    if (p2Valid && parsed.pillar2ExpiresAt) {
      const exp = new Date(parsed.pillar2ExpiresAt).getTime();
      if (Number.isNaN(exp) || exp <= nowMs) {
        p2Valid = false;
      }
    }

    let p3Valid = Boolean(parsed.pillar3Paid);
    if (p3Valid && parsed.pillar3ExpiresAt) {
      const exp = new Date(parsed.pillar3ExpiresAt).getTime();
      if (Number.isNaN(exp) || exp <= nowMs) {
        p3Valid = false;
      }
    }

    return {
      ...parsed,
      pillar1Paid: Boolean(parsed.pillar1Paid),
      pillar2Paid: p2Valid,
      pillar3Paid: p3Valid,
    };
  } catch {
    return null;
  }
}

export function recordSavedPhoneAccount(account: SavedPhoneAccount): void {
  if (typeof window === 'undefined' || !account.email) return;
  try {
    const existing = getSavedPhoneAccounts();
    const cleanEmail = account.email.trim().toLowerCase();
    const filtered = existing.filter(
      (item) => item.email.toLowerCase() !== cleanEmail && item.userId !== account.userId
    );
    const updated: SavedPhoneAccount[] = [
      {
        ...account,
        email: cleanEmail,
        lastActiveAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 6);
    window.localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function getSavedPhoneAccounts(): SavedPhoneAccount[] {
  if (typeof window === 'undefined') return [];
  enforceCleanSlateVersion();
  try {
    const raw = window.localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.email === 'string' && item.email.length > 0);
  } catch {
    return [];
  }
}

export function hasPillar1Access(p: EntitlementRow | null | undefined): boolean {
  return Boolean(p) && p!.has_paid_global_chat === true && isValidPaystackRef(p!.global_chat_paystack_ref);
}

export function hasPillar2Access(
  p: EntitlementRow | null | undefined,
  now: number = Date.now()
): boolean {
  if (!p || p.has_paid_pillar2 !== true || !isValidPaystackRef(p.pillar2_paystack_ref)) return false;
  if (!p.pillar2_expires_at) return false;
  const exp = new Date(p.pillar2_expires_at).getTime();
  return Number.isFinite(exp) && exp > now;
}

export function hasPillar3Access(
  p: EntitlementRow | null | undefined,
  now: number = Date.now()
): boolean {
  if (!p || p.has_paid_pillar3 !== true || !isValidPaystackRef(p.pillar3_paystack_ref) || !p.pillar3_expires_at) {
    return false;
  }
  const tier = String(p.pillar3_tier || 'none').toLowerCase();
  if (!tier || tier === 'none') return false;
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
  return {
    pillar1: hasPillar1Access(p),
    pillar2: hasPillar2Access(p),
    pillar3: hasPillar3Access(p),
  };
}

export function computeDaysLeft(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function buildEntitlementStateFromRow(
  userId: string,
  fallbackEmail: string,
  data: any
): PillarEntitlementState {
  const p1Paid = hasPillar1Access(data);
  const p2Paid = hasPillar2Access(data);
  const p3Paid = hasPillar3Access(data);

  return {
    userId,
    email: String(data?.email || fallbackEmail || '').trim(),
    p1Paid,
    p1Ref: p1Paid ? String(data?.global_chat_paystack_ref) : null,
    p2Paid,
    p2Ref: p2Paid ? String(data?.pillar2_paystack_ref) : null,
    p2ExpiresAt: data?.pillar2_expires_at || null,
    p2DaysLeft: computeDaysLeft(data?.pillar2_expires_at),
    p3Paid,
    p3Ref: p3Paid ? String(data?.pillar3_paystack_ref) : null,
    p3Tier: p3Paid ? String(data?.pillar3_tier || 'pro') : 'none',
    p3ExpiresAt: data?.pillar3_expires_at || null,
    p3DaysLeft: computeDaysLeft(data?.pillar3_expires_at),
  };
}

/**
 * PHASE 3.2: Exact Bounce-Back Warning Messages per Pillar
 */
export function getBounceBackWarningMessage(pillar: PillarId, email: string): string {
  const displayEmail = (email || 'your account').trim();
  if (pillar === 1) {
    return `🚫 ACCESS DENIED: Your account (${displayEmail}) has NOT been paid for Pillar 1! Please pay GH₵ 50.00 below before you can enter Global Chat.`;
  }
  if (pillar === 2) {
    return `🚫 ACCESS DENIED: Your account (${displayEmail}) has NOT been paid for Pillar 2! (Even if you paid for another pillar, Pillar 2 requires its own GH₵ 90.00 Affiliate License). Pay below to enter.`;
  }
  return `🚫 ACCESS DENIED: Your account (${displayEmail}) has NOT been paid for Pillar 3! Please choose a GH₵ 50 / GH₵ 100 / GH₵ 200 plan below to enter AI Studio.`;
}

/**
 * PHASE 4.2: Smart Welcome Header when a phone is already unlocked for another pillar
 */
export function getPhoneWelcomeHeaderMessage(
  targetPillar: PillarId,
  email: string,
  unlocked: { pillar1Paid: boolean; pillar2Paid: boolean; pillar3Paid: boolean }
): string | null {
  const cleanEmail = (email || '').trim();
  if (!cleanEmail) return null;

  const unlockedNames: string[] = [];
  if (unlocked.pillar1Paid && targetPillar !== 1) unlockedNames.push('Pillar 1 ✅');
  if (unlocked.pillar2Paid && targetPillar !== 2) unlockedNames.push('Pillar 2 ✅');
  if (unlocked.pillar3Paid && targetPillar !== 3) unlockedNames.push('Pillar 3 ✅');

  if (unlockedNames.length === 0) return null;

  const unlockedSummary = unlockedNames.join(' & ');
  if (targetPillar === 2) {
    return `👋 Welcome back, ${cleanEmail}! Your phone is unlocked for ${unlockedSummary}, but Pillar 2 is still locked 🔒. Tap 'Pay GH₵ 90.00' below to unlock Pillar 2 on this same account!`;
  }
  if (targetPillar === 3) {
    return `👋 Welcome back, ${cleanEmail}! Your phone is unlocked for ${unlockedSummary}, but Pillar 3 is still locked 🔒. Tap a plan below to unlock Pillar 3 on this same account!`;
  }
  return `👋 Welcome back, ${cleanEmail}! Your phone is unlocked for ${unlockedSummary}, but Pillar 1 is still locked 🔒. Tap 'Pay GH₵ 50.00' below to unlock Pillar 1 on this same account!`;
}

/**
 * PHASE 2.1 & PHASE 3.2: Dedicated Server Verification Helper
 * Queries `/api/auth/verify-pillar-status?userId=${user.id}&pillar=${targetPillar}`
 * using `SUPABASE_SERVICE_ROLE_KEY` on the server with `Cache-Control: no-store`.
 */
export async function verifyPillarStatusFromServer(
  userId: string,
  targetPillar: PillarId,
  fallbackEmail = ''
): Promise<VerifyPillarStatusResponse> {
  purgeLegacyAccessFlags();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const url = `/api/auth/verify-pillar-status?userId=${encodeURIComponent(userId)}&pillar=${targetPillar}&_t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const json = await res.json();
      const email = String(json.email || fallbackEmail || '').trim();
      const entitlements: PillarEntitlementState = json.entitlements || {
        userId,
        email,
        p1Paid: Boolean(json.pillar1Paid),
        p1Ref: json.entitlements?.p1Ref || null,
        p2Paid: Boolean(json.pillar2Paid),
        p2Ref: json.entitlements?.p2Ref || null,
        p2ExpiresAt: json.entitlements?.p2ExpiresAt || null,
        p2DaysLeft: Number(json.entitlements?.p2DaysLeft || 0),
        p3Paid: Boolean(json.pillar3Paid),
        p3Ref: json.entitlements?.p3Ref || null,
        p3Tier: String(json.entitlements?.p3Tier || 'none'),
        p3ExpiresAt: json.entitlements?.p3ExpiresAt || null,
        p3DaysLeft: Number(json.entitlements?.p3DaysLeft || 0),
      };

      const entitlementRow: EntitlementRow = {
        id: userId,
        email,
        has_paid_global_chat: entitlements.p1Paid,
        global_chat_paystack_ref: entitlements.p1Paid ? entitlements.p1Ref || 'VERIFIED_P1' : null,
        has_paid_pillar2: entitlements.p2Paid,
        pillar2_paystack_ref: entitlements.p2Paid ? entitlements.p2Ref || 'VERIFIED_P2' : null,
        pillar2_expires_at: entitlements.p2ExpiresAt,
        has_paid_pillar3: entitlements.p3Paid,
        pillar3_paystack_ref: entitlements.p3Paid ? entitlements.p3Ref || 'VERIFIED_P3' : null,
        pillar3_expires_at: entitlements.p3ExpiresAt,
        pillar3_tier: entitlements.p3Tier,
      };

      savePhonePassport(userId, {
        email,
        pillar1Paid: Boolean(json.pillar1Paid),
        pillar2Paid: Boolean(json.pillar2Paid),
        pillar3Paid: Boolean(json.pillar3Paid),
        pillar2ExpiresAt: entitlements.p2ExpiresAt,
        pillar3ExpiresAt: entitlements.p3ExpiresAt,
        pillar3Tier: entitlements.p3Tier,
      });

      const allowed = Boolean(json.allowed);
      return {
        allowed,
        pillar: targetPillar,
        userId,
        email,
        pillar1Paid: Boolean(json.pillar1Paid),
        pillar2Paid: Boolean(json.pillar2Paid),
        pillar3Paid: Boolean(json.pillar3Paid),
        entitlements,
        entitlementRow,
        bounceMessage: allowed ? null : getBounceBackWarningMessage(targetPillar, email),
      };
    }
  } catch (err) {
    console.error('[verifyPillarStatusFromServer] Server check failed, falling back to direct profile check:', err);
  }

  const state = await fetchLivePillarEntitlements(userId, fallbackEmail);
  const allowed =
    targetPillar === 1 ? state.p1Paid : targetPillar === 2 ? state.p2Paid : state.p3Paid;

  const entitlementRow: EntitlementRow = {
    id: userId,
    email: state.email || fallbackEmail,
    has_paid_global_chat: state.p1Paid,
    global_chat_paystack_ref: state.p1Ref,
    has_paid_pillar2: state.p2Paid,
    pillar2_paystack_ref: state.p2Ref,
    pillar2_expires_at: state.p2ExpiresAt,
    has_paid_pillar3: state.p3Paid,
    pillar3_paystack_ref: state.p3Ref,
    pillar3_expires_at: state.p3ExpiresAt,
    pillar3_tier: state.p3Tier,
  };

  return {
    allowed,
    pillar: targetPillar,
    userId,
    email: state.email || fallbackEmail,
    pillar1Paid: state.p1Paid,
    pillar2Paid: state.p2Paid,
    pillar3Paid: state.p3Paid,
    entitlements: state,
    entitlementRow,
    bounceMessage: allowed ? null : getBounceBackWarningMessage(targetPillar, state.email || fallbackEmail),
  };
}

/**
 * Fresh, uncached read of the signed-in user's entitlement columns straight from Supabase REST.
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
    await supabase.rpc('claim_paid_passes_for_user_rpc', {
      p_user_id: userId,
      p_email: email || '',
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Claim any parked passes and verify via `/api/auth/verify-pillar-status` (`SUPABASE_SERVICE_ROLE_KEY`).
 * Used by all verification flows across Pillars 1, 2, and 3.
 */
export async function auditAccount(
  userId: string,
  email?: string | null,
  targetPillar: PillarId = 1
): Promise<EntitlementRow | null> {
  await claimPendingPasses(userId, email);
  const verified = await verifyPillarStatusFromServer(userId, targetPillar, email || '');
  return verified.entitlementRow;
}

export async function fetchLivePillarEntitlements(
  userId: string,
  fallbackEmail = ''
): Promise<PillarEntitlementState> {
  purgeLegacyAccessFlags();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_paystack_ref, pillar2_expires_at, has_paid_pillar3, pillar3_paystack_ref, pillar3_tier, pillar3_expires_at'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return {
      userId,
      email: fallbackEmail,
      p1Paid: false,
      p1Ref: null,
      p2Paid: false,
      p2Ref: null,
      p2ExpiresAt: null,
      p2DaysLeft: 0,
      p3Paid: false,
      p3Ref: null,
      p3Tier: 'none',
      p3ExpiresAt: null,
      p3DaysLeft: 0,
    };
  }

  const state = buildEntitlementStateFromRow(userId, fallbackEmail, data);
  savePhonePassport(userId, {
    email: state.email,
    pillar1Paid: state.p1Paid,
    pillar2Paid: state.p2Paid,
    pillar3Paid: state.p3Paid,
    pillar2ExpiresAt: state.p2ExpiresAt,
    pillar3ExpiresAt: state.p3ExpiresAt,
    pillar3Tier: state.p3Tier,
  });

  return state;
}

export async function auditPillarEntry(
  userId: string,
  targetPillar: PillarId,
  fallbackEmail = ''
): Promise<PillarAuditResult> {
  const verified = await verifyPillarStatusFromServer(userId, targetPillar, fallbackEmail);
  const state = verified.entitlements;

  const otherPaidPillars: PillarId[] = [];
  if (targetPillar !== 1 && state.p1Paid) otherPaidPillars.push(1);
  if (targetPillar !== 2 && state.p2Paid) otherPaidPillars.push(2);
  if (targetPillar !== 3 && state.p3Paid) otherPaidPillars.push(3);

  return {
    allowed: verified.allowed,
    targetPillar,
    state,
    otherPaidPillars,
    denialReason: verified.allowed
      ? null
      : getBounceBackWarningMessage(targetPillar, state.email || fallbackEmail),
  };
}

// ----------------------------------------------------------------------------
// Google OAuth return tracking (Phase 2 & Phase 3).
// ----------------------------------------------------------------------------
export const VERIFY_TARGET_KEY = 'verifying_pillar_target';

export function oauthRedirectFor(pillar: PillarId): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${PILLAR_META[pillar].path}?verify_pillar=${pillar}`;
}

export async function startGoogleVerification(pillar: PillarId): Promise<{ error?: string }> {
  try {
    sessionStorage.setItem(VERIFY_TARGET_KEY, `pillar${pillar}`);
  } catch {}
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: oauthRedirectFor(pillar) },
  });
  if (error) {
    try {
      sessionStorage.removeItem(VERIFY_TARGET_KEY);
    } catch {}
    return { error: error.message || 'Google Sign-In failed.' };
  }
  return {};
}

export function consumeVerifyReturn(): PillarId | null {
  if (typeof window === 'undefined') return null;
  let fromUrl: number | null = null;
  try {
    const raw = new URLSearchParams(window.location.search).get('verify_pillar');
    if (raw === '1' || raw === '2' || raw === '3') fromUrl = Number(raw);
  } catch {}

  let fromStore: number | null = null;
  try {
    const stored = sessionStorage.getItem(VERIFY_TARGET_KEY);
    const m = /^pillar([123])$/.exec(stored || '');
    if (m) fromStore = Number(m[1]);
  } catch {}

  const target = fromUrl ?? fromStore;
  if (!target) return null;

  try {
    sessionStorage.removeItem(VERIFY_TARGET_KEY);
  } catch {}
  if (fromUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('verify_pillar');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch {}
  }
  return target as PillarId;
}
