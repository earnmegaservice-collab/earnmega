// Lightweight, SSR-safe Pillar 3 access helpers & constants (no browser-only imports).
export function hasActivePillar3Access(profile: any): boolean {
  if (!profile || profile.has_paid_pillar3 !== true) return false;
  const ref = typeof profile.pillar3_paystack_ref === 'string' ? profile.pillar3_paystack_ref.trim() : '';
  if (!ref || ref.startsWith('EXISTING_USER_GRANDFATHERED') || ref.startsWith('HP_TEST_')) return false;
  if (!profile.pillar3_expires_at) return false;
  const expMs = new Date(profile.pillar3_expires_at).getTime();
  return Number.isFinite(expMs) && expMs > Date.now();
}
