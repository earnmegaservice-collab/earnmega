"use client";

import React, { useState, useEffect, Suspense, startTransition } from "react";
import dynamic from "next/dynamic";
import OnboardingFlow from "../components/profile/OnboardingFlow";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";
import ChatInterface from "../components/chat/ChatInterface";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { HorPalLandingGateway } from "../components/home/HorPalLandingGateway";
import { RadarActivationModal } from "../components/location/RadarActivationModal";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../components/auth/HorPalAuthGate";

const GlobalChatAccessGate = dynamic(() => import("../components/auth/GlobalChatAccessGate"), { ssr: false });

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
  const [pendingPassRef, setPendingPassRef] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleOpenPillar1 = () => {
      setTargetPillar("1");
      setShowGateway(false);
    };
    const handleReturnHome = () => setShowGateway(true);

    window.addEventListener("earnmega:open-pillar-1", handleOpenPillar1);
    window.addEventListener("earnmega:return-home", handleReturnHome);

    return () => {
      window.removeEventListener("earnmega:open-pillar-1", handleOpenPillar1);
      window.removeEventListener("earnmega:return-home", handleReturnHome);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

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

      if (typeof window !== "undefined") {
        const pendingTarget = localStorage.getItem("horpal_target_pillar");
        if (pendingTarget === "2") {
          localStorage.removeItem("horpal_target_pillar");
          window.location.href = "/affiliate";
          return;
        }
        if (pendingTarget === "3") {
          localStorage.removeItem("horpal_target_pillar");
          window.location.href = "/horpal-ai";
          return;
        }
        if (pendingTarget === "1") {
          localStorage.removeItem("horpal_target_pillar");
          setShowGateway(false);
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", activeSession.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error);
      }

      if (isMounted) {
        startTransition(() => {
          setSession(activeSession);
          setProfileState(data);
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
          onEnterPillar1={() => {
            localStorage.setItem("horpal_target_pillar", "1");
            setTargetPillar("1");
            if (session?.user) {
              if (profileState?.has_paid_global_chat === true) {
                setShowGateway(false);
              } else {
                setShowGlobalChatGate(true);
              }
            } else {
              setShowGlobalChatGate(true);
            }
          }}
          onEnterPillar2={() => {
            localStorage.setItem("horpal_target_pillar", "2");
            setTargetPillar("2");
            if (session?.user) {
              localStorage.removeItem("horpal_target_pillar");
              window.location.href = "/affiliate";
            } else {
              setShowGateway(false);
            }
          }}
          onEnterPillar3={() => {
            localStorage.setItem("horpal_target_pillar", "3");
            setTargetPillar("3");
            if (session?.user) {
              localStorage.removeItem("horpal_target_pillar");
              window.location.href = "/horpal-ai";
            } else {
              setShowGateway(false);
            }
          }}
        />

        <GlobalChatAccessGate
          isOpen={showGlobalChatGate}
          onClose={() => setShowGlobalChatGate(false)}
          onLoginClick={() => {
            setShowGlobalChatGate(false);
            setShowGateway(false);
          }}
          onSuccess={async (ref) => {
            setPendingPassRef(ref);
            setShowGlobalChatGate(false);
            if (session?.user) {
              await supabase
                .from("profiles")
                .update({
                  has_paid_global_chat: true,
                  global_chat_paystack_ref: ref,
                })
                .eq("id", session.user.id);
              setProfileState((prev: any) => ({ ...prev, has_paid_global_chat: true }));
              setShowGateway(false);
            } else {
              setShowGateway(false);
            }
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
            await supabase
              .from("profiles")
              .update({
                has_paid_global_chat: true,
                global_chat_paystack_ref: pendingPassRef,
              })
              .eq("id", authedUser.id);
          }
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authedUser.id)
            .single();
          setProfileState(data);
          setShowGateway(false);
        }}
        onBackToHub={() => {
          setShowGateway(true);
        }}
      />
    );
  }

  // If user is logged in and target is Pillar 1, check has_paid_global_chat
  if (targetPillar === "1" && profileState?.has_paid_global_chat !== true) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <GlobalChatAccessGate
          isOpen={true}
          onLoginClick={() => {}}
          onSuccess={async (ref) => {
            await supabase
              .from("profiles")
              .update({
                has_paid_global_chat: true,
                global_chat_paystack_ref: ref,
              })
              .eq("id", session.user.id);
            setProfileState((prev: any) => ({ ...prev, has_paid_global_chat: true }));
          }}
        />
      </div>
    );
  }

  const isProfileComplete = Boolean(profileState?.gender);

  if (!isProfileComplete) {
    return (
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
    );
  }

  return (
    <ErrorBoundary>
      <ChatInterface activeTab={appTab} setAppTab={setAppTab} />
      <RadarActivationModal />
    </ErrorBoundary>
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
