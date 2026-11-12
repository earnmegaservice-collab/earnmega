"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase";
import HorPalAffiliatePillar from "../../components/affiliate/HorPalAffiliatePillar";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../../components/auth/HorPalAuthGate";

function AffiliatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1. Save referral tracking info (sessionStorage + 30-day localStorage attribution)
    const ref = searchParams.get("ref");
    const prod = searchParams.get("prod");
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

    // Purge any legacy test bypass caches
    localStorage.removeItem("horpal_p2_state_v3");
    localStorage.removeItem("horpal_p2_user_state_test_bypass_id");
    localStorage.removeItem("horpal_p2_license_test_bypass_id");

    // 2. Check Auth Status
    const checkAuth = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (activeSession?.user) {
          setSession(activeSession);
          localStorage.removeItem("horpal_target_pillar");
          const synced = await syncAuthenticatedUserProfile(activeSession.user);
          if (synced) {
            setProfile(synced);
          } else {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", activeSession.user.id)
              .maybeSingle();
            const isGoogle =
              activeSession.user?.app_metadata?.provider === "google" ||
              (Array.isArray(activeSession.user?.identities) &&
                activeSession.user.identities.some((id: any) => id.provider === "google"));
            setProfile(
              profileData || {
                id: activeSession.user.id,
                email: activeSession.user.email || "",
                username: isGoogle ? "" : activeSession.user.user_metadata?.username || "",
                full_name: isGoogle ? "" : activeSession.user.user_metadata?.full_name || "",
                first_name: isGoogle ? "" : activeSession.user.user_metadata?.first_name || "",
                last_name: isGoogle ? "" : activeSession.user.user_metadata?.last_name || "",
                affiliate_code: `HP-${activeSession.user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
              }
            );
          }
        } else {
          setSession(null);
          setProfile(null);
          localStorage.setItem("horpal_target_pillar", "2");
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
          localStorage.removeItem("horpal_target_pillar");
          const synced = await syncAuthenticatedUserProfile(nextSession.user);
          if (synced) setProfile(synced);
        } else {
          setSession(null);
          setProfile(null);
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
        <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin shadow-[0_0_30px_rgba(245,158,11,0.5)]"></div>
        <p className="mt-6 text-amber-500 font-mono text-xs uppercase tracking-widest animate-pulse">
          Loading Pillar 2...
        </p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <HorPalAuthGate
        defaultTargetPillar="2"
        onAuthenticated={(authedUser, syncedProf) => {
          setSession({ user: authedUser });
          if (syncedProf) setProfile(syncedProf);
        }}
        onBackToHub={() => {
          localStorage.removeItem("horpal_target_pillar");
          router.push("/");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] relative">
      <HorPalAffiliatePillar
        currentProfile={profile}
        onRefreshProfile={async () => {
          const {
            data: { session: activeSession },
          } = await supabase.auth.getSession();
          if (activeSession?.user) {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", activeSession.user.id)
              .maybeSingle();
            if (data) setProfile(data);
          }
        }}
      />
    </div>
  );
}

export default function AffiliatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-amber-500 font-mono text-sm">
          Loading...
        </div>
      }
    >
      <AffiliatePageContent />
    </Suspense>
  );
}
