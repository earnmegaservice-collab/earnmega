// Lightweight, SSR-safe Pillar 3 access helpers & constants (no browser-only imports).
export function hasActivePillar3Access(profile: any): boolean {
  if (!profile || profile.has_paid_pillar3 !== true || !profile.pillar3_paystack_ref) return false;
  if (!profile.pillar3_expires_at) return false;
  const expMs = new Date(profile.pillar3_expires_at).getTime();
  return Number.isFinite(expMs) && expMs > Date.now();
}
