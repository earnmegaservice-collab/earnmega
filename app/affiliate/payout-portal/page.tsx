"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../utils/supabase";
import HorPalAffiliatePillar from "../../../components/affiliate/HorPalAffiliatePillar";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../../../components/auth/HorPalAuthGate";
import Pillar2AccessGate, { PaidPillar2PassData } from "../../../components/affiliate/Pillar2AccessGate";
import PillarAccessGuard from "../../../components/auth/PillarAccessGuard";
import { authFetch } from "../../../utils/authFetch";
import {
  auditAccount,
  consumeVerifyReturn,
  EntitlementRow,
  hasPillar2Access,
  purgeLegacyAccessFlags,
} from "../../../utils/pillarAccess";

function PayoutPortalContent() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPaidPass, setPendingPaidPass] = useState<PaidPillar2PassData | null>(null);
  const [deniedAudit, setDeniedAudit] = useState<{
    email: string;
    entitlements: EntitlementRow | null;
  } | null>(null);
  const returningFromOAuthRef = useRef(false);

  useEffect(() => {
    purgeLegacyAccessFlags();
    const verifyReturn = consumeVerifyReturn();
    if (verifyReturn === 2) {
      returningFromOAuthRef.current = true;
    }

    const hydrateAndAudit = async (userObj: any) => {
      const [synced, liveEnt] = await Promise.all([
        syncAuthenticatedUserProfile(userObj),
        auditAccount(userObj.id, userObj.email || "").catch(() => null),
      ]);
      setProfile((prev: any) => {
        const base = prev && prev.id === userObj.id ? prev : {};
        const mergedProfile = liveEnt
          ? { ...base, ...(synced || {}), ...liveEnt }
          : synced
          ? { ...base, ...synced }
          : prev && prev.id === userObj.id
          ? prev
          : {
              id: userObj.id,
              email: userObj.email || "",
              has_paid_pillar2: false,
            };
        return mergedProfile;
      });
      if (hasPillar2Access(liveEnt)) {
        setDeniedAudit(null);
      } else if (liveEnt && returningFromOAuthRef.current) {
        setDeniedAudit({
          email: userObj.email || synced?.email || "",
          entitlements: liveEnt,
        });
      }
    };

    const loadAuthProfile = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (activeSession?.user?.id) {
          setSession(activeSession);
          await hydrateAndAudit(activeSession.user);
        } else {
          setSession(null);
          setProfile(null);
        }
      } catch (e) {
        console.error("Error loading payout portal session:", e);
      } finally {
        setLoading(false);
      }
    };

    loadAuthProfile();

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
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#070b14]">
        <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-4 text-emerald-400 font-mono text-xs uppercase tracking-widest">
          Verifying Pillar 2 License for Payout Portal...
        </p>
      </div>
    );
  }

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

  if (!hasPillar2Access(profile)) {
    const userEmail = session.user.email || profile?.email || "";
    return (
      <Pillar2AccessGate
        initialEmail={userEmail}
        currentUserId={session.user.id}
        currentEntitlements={profile}
        initialDeniedAudit={
          deniedAudit || {
            email: userEmail,
            entitlements: profile,
          }
        }
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
      <HorPalAffiliatePillar
        currentProfile={profile}
        initialSection="payouts"
        defaultFullScreenPayoutPortal={true}
        onRefreshProfile={async () => {
          const {
            data: { session: activeSession },
          } = await supabase.auth.getSession();
          if (activeSession?.user?.id) {
            const [synced, liveEnt] = await Promise.all([
              syncAuthenticatedUserProfile(activeSession.user),
              auditAccount(activeSession.user.id, activeSession.user.email || "").catch(() => null),
            ]);
            if (liveEnt) {
              setProfile((prev: any) => ({ ...(prev || {}), ...(synced || {}), ...liveEnt }));
            } else if (synced) {
              setProfile((prev: any) => ({ ...(prev || {}), ...synced }));
            }
          }
        }}
      />
    </PillarAccessGuard>
  );
}

export default function AffiliatePayoutPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-emerald-400 font-mono text-sm">
          Loading Global Payout Portal...
        </div>
      }
    >
      <PayoutPortalContent />
    </Suspense>
  );
}
