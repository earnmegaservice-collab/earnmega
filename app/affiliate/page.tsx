"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase";
import HorPalAffiliatePillar from "../../components/affiliate/HorPalAffiliatePillar";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../../components/auth/HorPalAuthGate";
import Pillar2AccessGate, {
  PaidPillar2PassData,
  PILLAR2_PASS_STORAGE_KEY,
} from "../../components/affiliate/Pillar2AccessGate";

function AffiliatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [pendingPaidPass, setPendingPaidPass] = useState<PaidPillar2PassData | null>(null);

  const directBuyerProdParam = searchParams.get("prod") || searchParams.get("product");

  useEffect(() => {
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

    // Purge any legacy test bypass caches
    localStorage.removeItem("horpal_p2_state_v3");
    localStorage.removeItem("horpal_p2_user_state_test_bypass_id");
    localStorage.removeItem("horpal_p2_license_test_bypass_id");

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
            setProfile(
              profileData || {
                id: activeSession.user.id,
                email: activeSession.user.email || "",
                has_paid_pillar2: false,
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
            setSession({ user: authedUser });
            setProfile(verifiedProfile);
          }}
          onBackToHome={() => {
            localStorage.removeItem("horpal_target_pillar");
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
          // Ensure their pre-paid Pillar 2 pass is bound to their user ID
          try {
            await supabase.rpc("activate_pillar2_license_rpc", {
              p_reference: pendingPaidPass.reference,
              p_email: pendingPaidPass.email || authedUser.email || "",
              p_user_id: authedUser.id,
              p_amount_ghs: 90,
              p_pass_type: "registration_1yr",
            });
            localStorage.removeItem(PILLAR2_PASS_STORAGE_KEY);
          } catch (_) {}

          const { data: refreshed } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authedUser.id)
            .maybeSingle();

          setProfile(
            refreshed || {
              ...(syncedProf || {}),
              has_paid_pillar2: true,
              pillar2_paid_at: pendingPaidPass.paidAt,
              pillar2_expires_at: pendingPaidPass.expiresAt,
            }
          );
        }}
        onBackToHub={() => {
          setPendingPaidPass(null);
        }}
      />
    );
  }

  // Strict 3-Pillar Isolation:
  // If user is logged in (e.g., paid for Pillar 1 or Pillar 3) but has_paid_pillar2 !== true,
  // SACK them immediately back to the Pillar 2 GH₵ 90.00 paywall!
  if (profile?.has_paid_pillar2 !== true && !directBuyerProdParam) {
    const userEmail = session.user.email || profile?.email || "your account";
    const p1Status = profile?.has_paid_global_chat ? "✅" : "❌";
    const p3Status =
      profile?.has_paid_pillar3 &&
      profile?.pillar3_expires_at &&
      new Date(profile.pillar3_expires_at) > new Date()
        ? "✅"
        : "❌";
    return (
      <Pillar2AccessGate
        initialEmail={userEmail}
        currentUserId={session.user.id}
        sackedNotice={`🚫 Pillar 2 Access Required: Your account (${userEmail}) has [Pillar 1: ${p1Status}] [Pillar 3: ${p3Status}], but you have not activated your Pillar 2 Affiliate License (GH₵ 90.00) yet.`}
        onPassVerified={async (passData) => {
          const { data: updatedProf } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          setProfile(
            updatedProf || {
              ...(profile || {}),
              has_paid_pillar2: true,
              pillar2_paid_at: passData.paidAt,
              pillar2_expires_at: passData.expiresAt,
              pillar2_paystack_ref: passData.reference,
            }
          );
        }}
        onAlreadyPaidLoginVerified={(authedUser, verifiedProfile) => {
          setSession({ user: authedUser });
          setProfile(verifiedProfile);
        }}
        onBackToHome={() => {
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
        <div className="min-h-screen bg-[#050508] flex items-center justify-center text-emerald-400 font-mono text-sm">
          Loading...
        </div>
      }
    >
      <AffiliatePageContent />
    </Suspense>
  );
}
