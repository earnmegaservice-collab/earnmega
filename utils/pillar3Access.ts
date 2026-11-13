// Lightweight, SSR-safe Pillar 3 access helpers & constants (no browser-only imports).
export const PILLAR3_DENIED_STORAGE_KEY = 'earnmega_pillar3_denied_diag';
export const PILLAR3_LOGIN_ATTEMPT_KEY = 'earnmega_pillar3_login_attempt';

export function hasActivePillar3Access(profile: any): boolean {
  if (!profile || profile.has_paid_pillar3 !== true) return false;
  if (!profile.pillar3_expires_at) return false;
  const expMs = new Date(profile.pillar3_expires_at).getTime();
  return Number.isFinite(expMs) && expMs > Date.now();
}
