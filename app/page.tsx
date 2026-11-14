"use client";

import React, { useState, useEffect, Suspense, startTransition, useRef } from "react";
import dynamic from "next/dynamic";
import OnboardingFlow from "../components/profile/OnboardingFlow";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";
import { authFetch } from "../utils/authFetch";
import ChatInterface from "../components/chat/ChatInterface";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { HorPalLandingGateway } from "../components/home/HorPalLandingGateway";
import { RadarActivationModal } from "../components/location/RadarActivationModal";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../components/auth/HorPalAuthGate";
import PillarAccessGuard from "../components/auth/PillarAccessGuard";
import { useAdminRealtimeEnforcement } from "../hooks/useAdminRealtimeEnforcement";
import {
  auditAccount,
  consumeVerifyReturn,
  EntitlementRow,
  fetchLiveEntitlements,
  hasPillar1Access,
  hasPillar2Access,
  hasPillar3Access,
  PillarId,
  purgeLegacyAccessFlags,
  verifyPillarStatusFromServer,
} from "../utils/pillarAccess";

const GlobalChatAccessGate = dynamic(() => import("../components/auth/GlobalChatAccessGate"), { ssr: false });
const Pillar3AccessGate = dynamic(() => import("../components/auth/Pillar3AccessGate"), { ssr: false });

function HomeContent() {
  const { isLoading } = useAuth();
  const [appTab, setAppTab] = useState<"explore" | "find" | "chats" | "status" | "profile" | "live">("chats");
  const [showGateway, setShowGateway] = useState(true);
  const [targetPillar, setTargetPillar] = useState<"1" | "2" | "3">("1");
  const [session, setSession] = useState<any>(null);
  const [profileState, setProfileState] = useState<any>(null);
  const [isGateLoading, setIsGateLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showGlobalChatGate, setShowGlobalChatGate] = useState(false);
  const [showPillar3Gate, setShowPillar3Gate] = useState(false);
  const [pendingPassRef, setPendingPassRef] = useState<string | null>(null);
  const [p1DeniedAudit, setP1DeniedAudit] = useState<{ email: string; entitlements: EntitlementRow | null } | null>(null);
  const pendingVerifyRef = useRef<PillarId | null>(null);

  useAdminRealtimeEnforcement({
    pillar: 1,
    onForceOpenPaywall: (pillarNum) => {
      if (pillarNum === 1) {
        setShowGateway(true);
        setShowGlobalChatGate(true);
      } else if (pillarNum === 3) {
        setShowPillar3Gate(true);
      }
    },
    onForceUnlockPillar: (pillarNum, updatedProfile) => {
      if (updatedProfile) {
        setProfileState((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
      if (pillarNum === 1) {
        setP1DeniedAudit(null);
        setShowGlobalChatGate(false);
        setShowGateway(false);
      } else if (pillarNum === 3) {
        setShowPillar3Gate(false);
      }
    },
    onProfileChanged: (updatedProfile) => {
      if (updatedProfile) {
        setProfileState((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
    },
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleOpenPillar1 = () => {
      setTargetPillar("1");
      if (hasPillar1Access(profileState)) {
        setShowGateway(false);
      } else {
        setShowGlobalChatGate(true);
      }
    };
    const handleReturnHome = () => setShowGateway(true);

    window.addEventListener("earnmega:open-pillar-1", handleOpenPillar1);
    window.addEventListener("earnmega:return-home", handleReturnHome);

    return () => {
      window.removeEventListener("earnmega:open-pillar-1", handleOpenPillar1);
      window.removeEventListener("earnmega:return-home", handleReturnHome);
    };
  }, [profileState]);

  useEffect(() => {
    let isMounted = true;
    purgeLegacyAccessFlags();

    const verifyTarget = consumeVerifyReturn();
    if (verifyTarget === 2) {
      window.location.href = "/affiliate?verify_pillar=2";
      return;
    }
    if (verifyTarget === 3) {
      window.location.href = "/horpal-ai?verify_pillar=3";
      return;
    }
    if (verifyTarget === 1) {
      pendingVerifyRef.current = 1;
      setShowGateway(true);
      setShowGlobalChatGate(true);
    }

    const loadUserAndProfile = async (activeSession: any) => {
      if (!activeSession?.user?.id) {
        if (isMounted) {
          startTransition(() => {
            setSession(null);
            setProfileState(null);
            setIsGateLoading(false);
          });
        }
        return;
      }

      await syncAuthenticatedUserProfile(activeSession.user);

      let liveEnt: EntitlementRow | null = null;
      try {
        liveEnt =
          pendingVerifyRef.current === 1
            ? await auditAccount(activeSession.user.id, activeSession.user.email)
            : await fetchLiveEntitlements(activeSession.user.id);
      } catch (_) {}

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", activeSession.user.id)
        .single();

      const merged = data || liveEnt ? { ...(data || {}), ...(liveEnt || {}) } : null;

      // Strict Google OAuth / Gate Verification for Pillar 1
      if (pendingVerifyRef.current === 1) {
        pendingVerifyRef.current = null;
        if (hasPillar1Access(merged)) {
          if (isMounted) {
            startTransition(() => {
              setSession(activeSession);
              setProfileState(merged);
              setP1DeniedAudit(null);
              setShowGlobalChatGate(false);
              setShowGateway(false);
              setIsGateLoading(false);
            });
          }
          return;
        }

        const deniedEmail = activeSession.user.email || "this account";
        if (isMounted) {
          startTransition(() => {
            setSession(activeSession);
            setProfileState(merged);
            setP1DeniedAudit({ email: deniedEmail, entitlements: liveEnt || merged });
            setShowGateway(true);
            setShowGlobalChatGate(true);
            setIsGateLoading(false);
          });
        }
        return;
      }

      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error);
      }

      if (isMounted) {
        startTransition(() => {
          setSession(activeSession);
          setProfileState(merged);
          setIsGateLoading(false);
        });
      }
    };

    const initializeApp = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (!isMounted) return;

        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        await loadUserAndProfile(activeSession);
      } catch (error) {
        console.error("Initialization Error:", error);
        if (isMounted) {
          startTransition(() => {
            setIsGateLoading(false);
          });
        }
      }
    };

    initializeApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) return;
        await loadUserAndProfile(nextSession);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-emerald-400/50 tracking-widest text-xs font-mono uppercase">
        SYNCHRONIZING ENVIRONMENT...
      </div>
    );
  }

  if (showGateway) {
    return (
      <>
        <HorPalLandingGateway
          activeEmail={session?.user?.email || profileState?.email || null}
          pillar1Unlocked={Boolean(session?.user && hasPillar1Access(profileState))}
          pillar2Unlocked={Boolean(session?.user && hasPillar2Access(profileState))}
          pillar3Unlocked={Boolean(session?.user && hasPillar3Access(profileState))}
          onEnterPillar1={() => {
            setTargetPillar("1");
            if (session?.user && hasPillar1Access(profileState)) {
              setShowGateway(false);
            } else {
              setShowGlobalChatGate(true);
            }
          }}
          onEnterPillar2={() => {
            window.location.href = "/affiliate";
          }}
          onEnterPillar3={() => {
            if (session?.user && hasPillar3Access(profileState)) {
              window.location.href = "/horpal-ai";
            } else {
              setShowPillar3Gate(true);
            }
          }}
        />

        <GlobalChatAccessGate
          isOpen={showGlobalChatGate}
          onClose={() => setShowGlobalChatGate(false)}
          currentUser={session?.user}
          currentProfile={profileState}
          initialDeniedAudit={p1DeniedAudit}
          onLoginClick={() => {
            if (session?.user && hasPillar1Access(profileState)) {
              setShowGlobalChatGate(false);
              setShowGateway(false);
            }
          }}
          onPaidLoginSuccess={async (authUser, prof) => {
            setSession({ user: authUser });
            const verified = await verifyPillarStatusFromServer(
              authUser.id,
              1,
              authUser?.email || ""
            );
            if (!verified.allowed) {
              setP1DeniedAudit({
                email: verified.email || authUser?.email || "this account",
                entitlements: verified.entitlementRow,
              });
              return;
            }
            const { data: fullProf } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", authUser.id)
              .maybeSingle();
            setProfileState({ ...(fullProf || {}), ...(verified.entitlementRow || prof || {}) });
            setP1DeniedAudit(null);
            setShowGlobalChatGate(false);
            setShowGateway(false);
          }}
          onUnpaidDenied={(deniedEmail, ents) => {
            setP1DeniedAudit({ email: deniedEmail, entitlements: ents ?? null });
            setShowGateway(true);
            setShowGlobalChatGate(true);
          }}
          onSuccess={async (ref) => {
            setPendingPassRef(ref);
            if (session?.user?.id) {
              const freshEnt = await fetchLiveEntitlements(session.user.id).catch(() => null);
              const { data: fullProf } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();
              const merged = { ...(fullProf || {}), ...(freshEnt || {}) };
              setProfileState(merged);
              if (hasPillar1Access(merged)) {
                setP1DeniedAudit(null);
                setShowGlobalChatGate(false);
                setShowGateway(false);
              }
            } else {
              setShowGlobalChatGate(false);
              setShowGateway(false);
            }
          }}
        />

        <Pillar3AccessGate
          isOpen={showPillar3Gate}
          onClose={() => setShowPillar3Gate(false)}
          currentUser={session?.user}
          currentProfile={profileState}
          onAccessGranted={(authedUser, updatedProfile) => {
            setSession({ user: authedUser });
            setProfileState(updatedProfile);
            setShowPillar3Gate(false);
            window.location.href = "/horpal-ai";
          }}
        />
      </>
    );
  }

  if (isGateLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-neutral-950">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
        <p className="mt-6 text-indigo-400 font-mono text-xs uppercase tracking-widest animate-pulse">
          Initializing System...
        </p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <HorPalAuthGate
        defaultTargetPillar={targetPillar}
        onAuthenticated={async (authedUser) => {
          setSession({ user: authedUser });
          if (pendingPassRef) {
            await authFetch('/api/paystack/verify-global-pass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: pendingPassRef, email: authedUser?.email }),
            }).catch(() => {});
          }
          const verified = await verifyPillarStatusFromServer(
            authedUser.id,
            1,
            authedUser.email || ""
          );
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authedUser.id)
            .single();
          const merged = { ...(data || {}), ...(verified.entitlementRow || {}) };
          setProfileState(merged);
          if (!verified.allowed) {
            if (typeof window !== "undefined" && typeof navigator !== "undefined") {
              try {
                navigator.vibrate?.([200, 100, 200]);
              } catch {}
            }
            setP1DeniedAudit({
              email: verified.email || authedUser.email || "this account",
              entitlements: verified.entitlementRow,
            });
            setShowGateway(true);
            setShowGlobalChatGate(true);
            return;
          }
          setShowGateway(false);
        }}
        onBackToHub={() => {
          setShowGateway(true);
        }}
      />
    );
  }

  const isProfileComplete = Boolean(profileState?.gender);

  return (
    <PillarAccessGuard
      pillar={1}
      renderPaywall={({ user: guardUser, entitlements, recheck }) => (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <GlobalChatAccessGate
            isOpen={true}
            currentUser={guardUser}
            currentProfile={entitlements}
            initialDeniedAudit={
              guardUser ? { email: guardUser.email || "this account", entitlements } : p1DeniedAudit
            }
            onLoginClick={() => void recheck()}
            onPaidLoginSuccess={async (authUser, prof) => {
              setSession({ user: authUser });
              setProfileState((prev: any) => ({ ...(prev || {}), ...(prof || {}) }));
              setP1DeniedAudit(null);
              await recheck();
            }}
            onUnpaidDenied={(deniedEmail, ents) => {
              setP1DeniedAudit({ email: deniedEmail, entitlements: ents ?? null });
            }}
            onSuccess={async () => {
              setP1DeniedAudit(null);
              await recheck();
            }}
          />
        </div>
      )}
    >
      {!isProfileComplete ? (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] text-zinc-100 p-6 text-center font-sans relative bg-[#050505]">
          <div className="fixed inset-0 z-0 pointer-events-none cinematic-bg opacity-100"></div>
          <Suspense
            fallback={
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
            }
          >
            <OnboardingFlow onComplete={() => window.location.reload()} />
          </Suspense>
        </div>
      ) : (
        <ErrorBoundary>
          <ChatInterface activeTab={appTab} setAppTab={setAppTab} />
          <RadarActivationModal />
        </ErrorBoundary>
      )}
    </PillarAccessGuard>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-neutral-950">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
          <p className="mt-6 text-indigo-400 font-mono text-xs uppercase tracking-widest animate-pulse">
            Initializing System...
          </p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
