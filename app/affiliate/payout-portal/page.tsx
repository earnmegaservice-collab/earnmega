"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../utils/supabase";
import HorPalAffiliatePillar from "../../../components/affiliate/HorPalAffiliatePillar";
import HorPalAuthGate, { syncAuthenticatedUserProfile } from "../../../components/auth/HorPalAuthGate";

function PayoutPortalContent() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthProfile = async () => {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();

        if (activeSession?.user?.id) {
          setSession(activeSession);
          const synced = await syncAuthenticatedUserProfile(activeSession.user);
          if (synced) {
            setProfile(synced);
          } else {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", activeSession.user.id)
              .maybeSingle();

            if (profileData) {
              setProfile(profileData);
            } else {
              const generatedCode = `HP-${activeSession.user.id.replace(/-/g, "").substring(0, 6).toUpperCase()}`;
              setProfile({
                id: activeSession.user.id,
                email: activeSession.user.email || "",
                affiliate_code: generatedCode,
              });
            }
          }
        } else {
          setSession(null);
          setProfile(null);
          localStorage.setItem("horpal_target_pillar", "2");
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
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#070b14]">
        <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="mt-4 text-emerald-400 font-mono text-xs uppercase tracking-widest">
          Loading Global Payout Portal...
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
    <HorPalAffiliatePillar
      currentProfile={profile}
      initialSection="payouts"
      defaultFullScreenPayoutPortal={true}
      onRefreshProfile={async () => {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession();
        if (activeSession?.user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", activeSession.user.id)
            .maybeSingle();
          if (data) setProfile(data);
        }
      }}
    />
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
