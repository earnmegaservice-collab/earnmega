"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase";
import HorPalAffiliatePillar from "../../components/affiliate/HorPalAffiliatePillar";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../../components/auth/HorPalAuthGate";
import Pillar2AccessGate, { PaidPillar2PassData } from "../../components/affiliate/Pillar2AccessGate";
import PillarAccessGuard from "../../components/auth/PillarAccessGuard";
import { authFetch } from "../../utils/authFetch";
import {
  auditAccount,
  consumeVerifyReturn,
  EntitlementRow,
  hasPillar2Access,
  purgeLegacyAccessFlags,
} from "../../utils/pillarAccess";

function AffiliatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [pendingPaidPass, setPendingPaidPass] = useState<PaidPillar2PassData | null>(null);
  const [deniedAudit, setDeniedAudit] = useState<{
    email: string;
    entitlements: EntitlementRow | null;
  } | null>(null);
  const returningFromOAuthRef = useRef(false);

  useEffect(() => {
    const onRevoked = (e: any) => {
      if (e?.detail?.pillar && e.detail.pillar !== 2) return;
      const reason = e?.detail?.reason;
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              has_paid_pillar2: reason === "expired_renewal" ? true : false,
              is_pillar2_paid: false,
              pillar2_access: false,
            }
          : prev
      );
    };
    const onGranted = (e: any) => {
      if (e?.detail?.pillar && e.detail.pillar !== 2) return;
      const updatedProfile = e?.detail?.profile;
      setDeniedAudit(null);
      if (updatedProfile) {
        setProfile((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
    };
    const onEnforcementSync = (e: any) => {
      const updatedProfile = e?.detail?.profile;
      if (updatedProfile) {
        setProfile((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
    };
    window.addEventListener("earnmega:pillar-access-revoked", onRevoked);
    window.addEventListener("earnmega:pillar-access-granted", onGranted);
    window.addEventListener("earnmega:admin-enforcement-sync", onEnforcementSync);
    return () => {
      window.removeEventListener("earnmega:pillar-access-revoked", onRevoked);
      window.removeEventListener("earnmega:pillar-access-granted", onGranted);
      window.removeEventListener("earnmega:admin-enforcement-sync", onEnforcementSync);
    };
  }, []);

  const directBuyerProdParam = searchParams.get("prod") || searchParams.get("product");

  useEffect(() => {
    purgeLegacyAccessFlags();
    const verifyReturn = consumeVerifyReturn();
    if (verifyReturn === 2) {
      returningFromOAuthRef.current = true;
    }

    const ref = searchParams.get("ref") || searchParams.get("aff");
    const prod = searchParams.get("prod") || searchParams.get("product");
    if (ref) {
      try {
        sessionStorage.setItem("horpal_active_ref", ref);
        localStorage.setItem(
          "horpal_last_ref_attribution",
          JSON.stringify({
            code: ref,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          })
        );
        localStorage.setItem("horpal_affiliate_ref", ref);
        localStorage.setItem("horpal_ref", ref);
      } catch (_) {}
    }
    if (prod) {
      try {
        sessionStorage.setItem("horpal_active_prod", prod);
        localStorage.setItem("horpal_affiliate_prod", prod);
      } catch (_) {}
    }

    const hydrateAndAudit = async (userObj: any) => {
      const [synced, liveEnt] = await Promise.all([
        syncAuthenticatedUserProfile(userObj),
        auditAccount(userObj.id, userObj.email || "").catch(() => null),
      ]);
      const mergedProfile = liveEnt
        ? { ...(synced || {}), ...liveEnt }
        : synced || {
            id: userObj.id,
            email: userObj.email || "",
            has_paid_pillar2: false,
          };
      setProfile(mergedProfile);
      if (hasPillar2Access(liveEnt)) {
        setDeniedAudit(null);
      } else if (returningFromOAuthRef.current) {
        setDeniedAudit({
          email: userObj.email || synced?.email || "",
          entitlements: liveEnt,
        });
      }
    };

    const checkAuth = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (activeSession?.user) {
          setSession(activeSession);
          await hydrateAndAudit(activeSession.user);
        } else {
          setSession(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Affiliate auth check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (nextSession?.user) {
          setSession(nextSession);
          await hydrateAndAudit(nextSession.user);
        } else {
          setSession(null);
          setProfile(null);
          setDeniedAudit(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#050508]">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_30px_rgba(16,185,129,0.5)]"></div>
        <p className="mt-6 text-emerald-400 font-mono text-xs uppercase tracking-widest animate-pulse">
          Verifying Pillar 2 Affiliate License...
        </p>
      </div>
    );
  }

  // Allow direct course buyers arriving via ?prod=prod_X link to view & purchase the course
  if (!session?.user && directBuyerProdParam) {
    return (
      <div className="min-h-screen bg-[#050508] relative">
        <HorPalAffiliatePillar
          currentProfile={null}
          onRefreshProfile={async () => {}}
        />
      </div>
    );
  }

  // Unauthenticated Visitor on Pillar 2:
  // Step 1: Show Pillar 2 GH₵ 90.00 Access Gate (+ Worldwide Converter + Luxury Showroom View Mode + Inline Login)
  // Step 2: Once GH₵ 90.00 is paid, show HorPalAuthGate pre-filled with their email to complete signup/login
  if (!session?.user) {
    if (!pendingPaidPass) {
      return (
        <Pillar2AccessGate
          onPassVerified={(passData) => {
            setPendingPaidPass(passData);
          }}
          onAlreadyPaidLoginVerified={(authedUser, verifiedProfile) => {
            setDeniedAudit(null);
            setSession({ user: authedUser });
            setProfile(verifiedProfile);
          }}
          onBackToHome={() => {
            purgeLegacyAccessFlags();
            router.push("/");
          }}
        />
      );
    }

    return (
      <HorPalAuthGate
        defaultTargetPillar="2"
        initialEmail={pendingPaidPass.email}
        initialMode="signup"
        onAuthenticated={async (authedUser, syncedProf) => {
          setSession({ user: authedUser });
          // Verify and bind their pre-paid Pillar 2 pass via hardened server API
          try {
            const verifyRes = await authFetch("/api/paystack/verify-pillar2-pass", {
              method: "POST",
              body: JSON.stringify({
                reference: pendingPaidPass.reference,
                email: pendingPaidPass.email || authedUser.email || "",
                passType: "registration_1yr",
              }),
            });
            await verifyRes.json().catch(() => ({}));
          } catch (_) {}

          const liveEnt = await auditAccount(
            authedUser.id,
            authedUser.email || pendingPaidPass.email || ""
          ).catch(() => null);
          if (liveEnt) {
            setProfile({ ...(syncedProf || {}), ...liveEnt });
          } else if (syncedProf) {
            setProfile(syncedProf);
          }
          setPendingPaidPass(null);
        }}
        onBackToHub={() => {
          setPendingPaidPass(null);
        }}
      />
    );
  }

  // Direct Course Buyer flow (?prod=prod_X) when not yet holding full Pillar 2 Affiliate License:
  // HorPalAffiliatePillar displays ONLY that course sales page and locks Dashboard access behind hasPillar2Access.
  if (directBuyerProdParam && !hasPillar2Access(profile)) {
    return (
      <div className="min-h-screen bg-[#050508] relative">
        <HorPalAffiliatePillar
          currentProfile={profile}
          onRefreshProfile={async () => {
            const {
              data: { session: activeSession },
            } = await supabase.auth.getSession();
            if (activeSession?.user) {
              const liveEnt = await auditAccount(
                activeSession.user.id,
                activeSession.user.email || ""
              ).catch(() => null);
              if (liveEnt) {
                setProfile((prev: any) => ({ ...(prev || {}), ...liveEnt }));
              }
            }
          }}
        />
      </div>
    );
  }

  // Strict 3-Pillar Isolation:
  // If user is logged in (e.g., unpaid or paid only for Pillar 1 / Pillar 3) without active Pillar 2 license + ref,
  // SACK them immediately back to the Pillar 2 GH₵ 90.00 paywall with the Red 3-Pillar Forensic Scorecard!
  if (!hasPillar2Access(profile)) {
    const userEmail = session.user.email || profile?.email || "";
    const p1Status = profile?.has_paid_global_chat && profile?.global_chat_paystack_ref ? "✅" : "❌";
    const p3Status =
      profile?.has_paid_pillar3 &&
      profile?.pillar3_paystack_ref &&
      profile?.pillar3_expires_at &&
      new Date(profile.pillar3_expires_at) > new Date()
        ? "✅"
        : "❌";
    return (
      <Pillar2AccessGate
        initialEmail={userEmail}
        currentUserId={session.user.id}
        currentEntitlements={profile}
        initialDeniedAudit={deniedAudit}
        onPassVerified={async () => {
          const liveEnt = await auditAccount(session.user.id, userEmail).catch(() => null);
          if (liveEnt) {
            setDeniedAudit(null);
            setProfile((prev: any) => ({ ...(prev || {}), ...liveEnt }));
          }
        }}
        onAlreadyPaidLoginVerified={(authedUser, verifiedProfile) => {
          setDeniedAudit(null);
          setSession({ user: authedUser });
          setProfile(verifiedProfile);
        }}
        onBackToHome={() => {
          purgeLegacyAccessFlags();
          router.push("/");
        }}
      />
    );
  }

  return (
    <PillarAccessGuard
      pillar={2}
      renderPaywall={({ user, entitlements, recheck }) => {
        const guardEmail = user.email || "";
        return (
          <Pillar2AccessGate
            initialEmail={guardEmail}
            currentUserId={user.id}
            currentEntitlements={entitlements}
            initialDeniedAudit={{
              email: guardEmail,
              entitlements,
            }}
            onPassVerified={async () => {
              await recheck();
              const liveEnt = await auditAccount(user.id, guardEmail).catch(() => null);
              if (liveEnt) {
                setProfile((prev: any) => ({ ...(prev || {}), ...liveEnt }));
              }
            }}
            onAlreadyPaidLoginVerified={async (authedUser, verifiedProfile) => {
              setSession({ user: authedUser });
              setProfile(verifiedProfile);
              await recheck();
            }}
            onBackToHome={() => {
              purgeLegacyAccessFlags();
              router.push("/");
            }}
          />
        );
      }}
    >
      <div className="min-h-screen bg-[#050508] relative">
        <HorPalAffiliatePillar
          currentProfile={profile}
          onRefreshProfile={async () => {
            const {
              data: { session: activeSession },
            } = await supabase.auth.getSession();
            if (activeSession?.user) {
              const [synced, liveEnt] = await Promise.all([
                syncAuthenticatedUserProfile(activeSession.user),
                auditAccount(activeSession.user.id, activeSession.user.email || "").catch(() => null),
              ]);
              if (liveEnt) {
                setProfile({ ...(synced || {}), ...liveEnt });
              } else if (synced) {
                setProfile(synced);
              }
            }
          }}
        />
      </div>
    </PillarAccessGuard>
  );
}

export default function AffiliatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-emerald-400 font-mono text-sm">
          Loading...
        </div>
      }
    >
      <AffiliatePageContent />
    </Suspense>
  );
}
