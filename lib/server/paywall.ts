// Server-only paywall helpers shared by every payment-verification route.
//
// Design rules (fail CLOSED everywhere):
//   * Entitlements are only ever written here, with the Supabase service-role key,
//     AFTER the reference has been verified live against the Paystack API.
//   * The acting user is derived from the verified `Authorization: Bearer <jwt>` header,
//     NEVER from a `userId` field in the request body.
//   * A missing Paystack secret, a Paystack network error, or an `HP_TEST_` reference
//     is a hard failure - there is no "fall back to the client's word" path.
//   * One Paystack reference can unlock exactly ONE pillar for exactly ONE account.
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export type PillarNumber = 1 | 2 | 3;

export class PaywallError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function paywallErrorResponse(err: unknown) {
  if (err instanceof PaywallError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status });
  }
  console.error('[paywall] unexpected error:', err);
  return NextResponse.json(
    { success: false, error: 'Unexpected error while verifying your payment. Please try again.' },
    { status: 500 }
  );
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new PaywallError(503, 'Payment verification is temporarily unavailable (server configuration).');
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Resolve the caller from a verified Supabase access token. Returns null when absent/invalid. */
export async function getAuthedUser(request: Request, admin: SupabaseClient): Promise<User | null> {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(match[1].trim());
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireAuthedUser(request: Request, admin: SupabaseClient): Promise<User> {
  const user = await getAuthedUser(request, admin);
  if (!user) throw new PaywallError(401, 'Please sign in to your account first, then try again.');
  return user;
}

// ----------------------------------------------------------------------------
// Paystack
// ----------------------------------------------------------------------------
export interface PaystackTx {
  reference: string;
  amountPesewas: number;
  currency: string;
  email: string;
  metadata: Record<string, any>;
  paidAt: string | null;
}

export async function fetchPaystackTransaction(rawReference: unknown): Promise<PaystackTx> {
  const reference = String(rawReference ?? '').trim();
  if (!reference || reference.length > 120 || !/^[A-Za-z0-9._=\-]+$/.test(reference)) {
    throw new PaywallError(400, 'Please enter a valid Paystack reference.');
  }
  if (/^HP_TEST_/i.test(reference)) {
    throw new PaywallError(400, 'Test references are not accepted. A real Paystack payment is required.');
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret === 'sk_test_placeholder') {
    throw new PaywallError(503, 'Payment verification is temporarily unavailable. Please try again shortly.');
  }

  let res: Response;
  try {
    res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new PaywallError(502, 'Could not reach Paystack to verify this payment. Please try again in a moment.');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new PaywallError(502, 'Paystack returned an unreadable response. Please try again.');
  }

  if (res.status === 404 || !json?.status || !json?.data) {
    throw new PaywallError(404, 'Paystack could not find a payment with this reference.');
  }
  if (json.data.status !== 'success') {
    throw new PaywallError(402, 'This Paystack payment was not successful, so it cannot unlock access.');
  }

  let metadata: Record<string, any> = {};
  const rawMeta = json.data.metadata;
  if (rawMeta && typeof rawMeta === 'object') {
    metadata = rawMeta;
  } else if (typeof rawMeta === 'string' && rawMeta.trim().startsWith('{')) {
    try {
      metadata = JSON.parse(rawMeta);
    } catch {
      metadata = {};
    }
  }

  return {
    reference: String(json.data.reference || reference),
    amountPesewas: Number(json.data.amount || 0),
    currency: String(json.data.currency || '').toUpperCase(),
    email: String(json.data.customer?.email || '').trim().toLowerCase(),
    metadata,
    paidAt: json.data.paid_at || null,
  };
}

/** Which pillar did the payer say they were buying? (null = metadata does not say.) */
export function resolveMetadataPillar(meta: Record<string, any> | undefined | null): PillarNumber | null {
  if (!meta) return null;
  const target = String(meta.target_pillar ?? '').trim();
  if (target === '1' || target === '2' || target === '3') return Number(target) as PillarNumber;

  const paymentType = String(meta.payment_type ?? '').toUpperCase();
  if (paymentType === 'GLOBAL_CHAT_PASS' || paymentType === 'P1_LIFETIME_PASS') return 1;
  if (paymentType.startsWith('PILLAR3') || paymentType.startsWith('P3_')) return 3;
  if (paymentType.startsWith('PILLAR2') || paymentType.startsWith('P2_')) return 2;

  const fields = Array.isArray(meta.custom_fields) ? meta.custom_fields : [];
  for (const f of fields) {
    if (f?.variable_name === 'pass_type' && /pillar\s*2/i.test(String(f?.value ?? ''))) return 2;
  }
  return null;
}

export interface PillarPrice {
  pillar: PillarNumber;
  amountGhs: number;
  tier: string | null; // pillar 3 only
  durationDays: number | null; // pillar 2 / 3
}

/** Server-side price rules. The CLIENT never decides what a payment is worth. */
export function priceForPayment(pillar: PillarNumber, tx: PaystackTx): PillarPrice {
  if (tx.currency !== 'GHS') {
    throw new PaywallError(400, 'This payment was not settled in GHS, so it cannot be matched to a pillar price.');
  }
  const p = tx.amountPesewas;
  const amountGhs = Number((p / 100).toFixed(2));

  if (pillar === 1) {
    if (p < 5000) {
      throw new PaywallError(400, `Pillar 1 costs GH₵ 50.00 but this payment was GH₵ ${amountGhs.toFixed(2)}.`);
    }
    return { pillar, amountGhs, tier: null, durationDays: null };
  }

  if (pillar === 2) {
    // GH₵ 90 registration or GH₵ 45 annual renewal - both buy 365 days.
    if (p < 4500) {
      throw new PaywallError(400, `Pillar 2 costs GH₵ 90.00 (GH₵ 45.00 renewal) but this payment was GH₵ ${amountGhs.toFixed(2)}.`);
    }
    return { pillar, amountGhs, tier: null, durationDays: 365 };
  }

  if (p >= 20000) return { pillar, amountGhs, tier: 'premium', durationDays: 365 };
  if (p >= 10000) return { pillar, amountGhs, tier: 'pro', durationDays: 30 };
  if (p >= 5000) return { pillar, amountGhs, tier: 'weekly', durationDays: 7 };
  throw new PaywallError(400, `Pillar 3 starts at GH₵ 50.00 but this payment was GH₵ ${amountGhs.toFixed(2)}.`);
}

// ----------------------------------------------------------------------------
// Entitlement binding
// ----------------------------------------------------------------------------
const LEDGERS: Record<PillarNumber, { table: string; ownerCol: string }> = {
  1: { table: 'global_chat_passes', ownerCol: 'claimed_by_user_id' },
  2: { table: 'pillar2_passes', ownerCol: 'claimed_by_user_id' },
  3: { table: 'pillar3_passes', ownerCol: 'user_id' },
};

async function assertReferenceAvailable(
  admin: SupabaseClient,
  pillar: PillarNumber,
  reference: string,
  userId: string | null
) {
  for (const key of [1, 2, 3] as PillarNumber[]) {
    const { table, ownerCol } = LEDGERS[key];
    const { data, error } = await admin
      .from(table)
      .select(`paystack_reference, ${ownerCol}`)
      .eq('paystack_reference', reference)
      .maybeSingle();
    if (error || !data) continue;
    if (key !== pillar) {
      throw new PaywallError(409, `This Paystack reference was already used to unlock Pillar ${key}. One payment unlocks one pillar only.`);
    }
    const owner = (data as any)[ownerCol] as string | null;
    if (owner && owner !== userId) {
      throw new PaywallError(409, 'This Paystack reference has already been claimed by another account.');
    }
  }
}

export interface BindResult {
  bound: boolean; // true when written onto a user's profile
  email: string;
  amountGhs: number;
  tier: string | null;
  expiresAt: string | null;
}

const MISSING_FN = (e: any) =>
  e && (e.code === 'PGRST202' || /could not find the function/i.test(String(e.message || '')));

function mapRpcError(e: any): PaywallError {
  const msg = String(e?.message || '');
  if (msg.includes('REFERENCE_ALREADY_CLAIMED')) {
    return new PaywallError(409, 'This Paystack reference has already been claimed by another account.');
  }
  if (msg.includes('REFERENCE_USED_FOR_OTHER_PILLAR')) {
    return new PaywallError(409, 'This Paystack reference was already used to unlock a different pillar.');
  }
  console.error('[paywall] bind rpc error:', e);
  return new PaywallError(500, 'Could not record your payment against your account. Please contact support with your reference.');
}

/**
 * Atomically record the verified payment in its pillar ledger and (when `user` is known) switch on
 * that ONE pillar for that ONE user. Without a user the pass is parked, unclaimed, against the
 * Paystack-verified payer email and is claimed when that email's owner signs in.
 */
export async function bindVerifiedPayment(
  admin: SupabaseClient,
  pillar: PillarNumber,
  tx: PaystackTx,
  price: PillarPrice,
  user: User | null
): Promise<BindResult> {
  await assertReferenceAvailable(admin, pillar, tx.reference, user?.id ?? null);

  const email = tx.email || user?.email?.toLowerCase() || '';
  const { data, error } = await admin.rpc('bind_pillar_payment_rpc', {
    p_pillar: pillar,
    p_reference: tx.reference,
    p_email: email,
    p_user_id: user?.id ?? null,
    p_amount_ghs: price.amountGhs,
    p_tier: price.tier,
    p_duration_days: price.durationDays,
  });

  if (error) {
    if (!MISSING_FN(error)) throw mapRpcError(error);
    await bindViaLegacyRpc(admin, pillar, email, tx, price, user);
    return { bound: Boolean(user), email, amountGhs: price.amountGhs, tier: price.tier, expiresAt: null };
  }

  return {
    bound: Boolean(user),
    email,
    amountGhs: price.amountGhs,
    tier: (data as any)?.tier ?? price.tier,
    expiresAt: (data as any)?.expires_at ?? null,
  };
}

// Used only until the hardening migration is applied (the new RPC does not exist yet).
async function bindViaLegacyRpc(
  admin: SupabaseClient,
  pillar: PillarNumber,
  email: string,
  tx: PaystackTx,
  price: PillarPrice,
  user: User | null
) {
  const userId = user?.id ?? null;
  const common = { p_reference: tx.reference, p_email: email, p_user_id: userId };
  let res;
  if (pillar === 1) {
    res = await admin.rpc('activate_pillar1_pass_rpc', { ...common, p_amount_ghs: price.amountGhs });
  } else if (pillar === 2) {
    res = await admin.rpc('activate_pillar2_license_rpc', {
      ...common,
      p_amount_ghs: price.amountGhs,
      p_pass_type: price.amountGhs >= 90 ? 'registration_1yr' : 'renewal_1yr',
    });
  } else {
    res = await admin.rpc('activate_pillar3_pass_rpc', {
      ...common,
      p_plan_tier: price.tier,
      p_amount_ghs: price.amountGhs,
      p_duration_days: price.durationDays,
    });
  }
  if (res.error) throw mapRpcError(res.error);
}

/**
 * Product-purchase routes (record-sale / verify-product-purchase) unlock Pillar 2 for the buyer.
 * They must never accept a reference that was paid for Pillar 1 or Pillar 3 (cross-pillar replay).
 * Returns a human message when the reference belongs to another pillar, otherwise null.
 */
export async function findOtherPillarConflict(
  admin: SupabaseClient,
  reference: string,
  metadata: Record<string, any> | undefined | null
): Promise<string | null> {
  const metaPillar = resolveMetadataPillar(metadata);
  if (metaPillar === 1 || metaPillar === 3) {
    return `This payment was made for Pillar ${metaPillar}. Each pillar needs its own payment.`;
  }
  for (const key of [1, 3] as PillarNumber[]) {
    const { data } = await admin
      .from(LEDGERS[key].table)
      .select('paystack_reference')
      .eq('paystack_reference', reference)
      .maybeSingle();
    if (data) return `This payment was already used to unlock Pillar ${key}. Each pillar needs its own payment.`;
  }
  return null;
}
export const ENTITLEMENT_SELECT =
  'has_paid_global_chat, global_chat_paystack_ref, has_paid_pillar2, pillar2_expires_at, pillar2_paystack_ref, has_paid_pillar3, pillar3_expires_at, pillar3_paystack_ref, pillar3_tier';

export async function readEntitlements(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from('profiles').select(ENTITLEMENT_SELECT).eq('id', userId).maybeSingle();
  return data || null;
}

// ----------------------------------------------------------------------------
// Live per-pillar access check (mirrors utils/pillarAccess.ts exactly)
// ----------------------------------------------------------------------------
export function profileHasPillar(pillar: PillarNumber, p: any): boolean {
  if (!p) return false;
  const now = Date.now();
  if (pillar === 1) {
    return p.has_paid_global_chat === true && Boolean(p.global_chat_paystack_ref);
  }
  if (pillar === 2) {
    const notExpired = !p.pillar2_expires_at || new Date(p.pillar2_expires_at).getTime() > now;
    return p.has_paid_pillar2 === true && Boolean(p.pillar2_paystack_ref) && notExpired;
  }
  const exp = p.pillar3_expires_at ? new Date(p.pillar3_expires_at).getTime() : 0;
  return p.has_paid_pillar3 === true && Boolean(p.pillar3_paystack_ref) && exp > now;
}

export async function requirePillarAccess(request: Request, pillar: PillarNumber) {
  const admin = getAdminClient();
  const user = await requireAuthedUser(request, admin);
  const profile = await readEntitlements(admin, user.id);
  if (!profileHasPillar(pillar, profile)) {
    throw new PaywallError(403, `Pillar ${pillar} access is locked for this account. Please complete the Pillar ${pillar} payment.`);
  }
  return { admin, user, profile };
}

// ----------------------------------------------------------------------------
// One shared handler for every "verify a Paystack reference for pillar N" route
// ----------------------------------------------------------------------------
export async function processPillarPayment(opts: {
  request: Request;
  pillar: PillarNumber;
  reference: unknown;
  /** Recovery endpoint: caller must be signed in and metadata must positively confirm the pillar. */
  requireAuth?: boolean;
  strictMetadata?: boolean;
}) {
  const { request, pillar, reference, requireAuth = false, strictMetadata = false } = opts;
  const admin = getAdminClient();
  const user = requireAuth ? await requireAuthedUser(request, admin) : await getAuthedUser(request, admin);

  const tx = await fetchPaystackTransaction(reference);

  const metaPillar = resolveMetadataPillar(tx.metadata);
  if (metaPillar && metaPillar !== pillar) {
    throw new PaywallError(409, `This payment was made for Pillar ${metaPillar}, not Pillar ${pillar}. Each pillar needs its own payment.`);
  }
  if (strictMetadata && metaPillar !== pillar) {
    throw new PaywallError(400, `Paystack does not confirm this payment was made for Pillar ${pillar}, so it cannot unlock it.`);
  }

  const price = priceForPayment(pillar, tx);
  const bind = await bindVerifiedPayment(admin, pillar, tx, price, user);
  const entitlements = user ? await readEntitlements(admin, user.id) : null;

  return {
    success: true as const,
    pillar,
    reference: tx.reference,
    email: tx.email,
    amountGhs: price.amountGhs,
    planTier: price.tier,
    durationDays: price.durationDays,
    bound: bind.bound,
    pendingClaim: !bind.bound,
    entitlements,
  };
}
