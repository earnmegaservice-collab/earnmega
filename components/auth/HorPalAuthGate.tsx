"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { countries } from "countries-list";
import { ArrowLeft, ShieldCheck, Sparkles, TrendingUp, MessageSquare } from "lucide-react";

const COUNTRY_NAME_MAP: Record<string, string> = {
  "+233": "Ghana",
  "+234": "Nigeria",
  "+254": "Kenya",
  "+27": "South Africa",
  "+237": "Cameroon",
  "+225": "Cote d'Ivoire",
  "+221": "Senegal",
  "+256": "Uganda",
  "+255": "Tanzania",
  "+250": "Rwanda",
  "+260": "Zambia",
  "+20": "Egypt",
  "+1": "United States",
  "+44": "United Kingdom",
  "+91": "India",
  "+971": "United Arab Emirates",
};

const countryOptions = Object.values(countries)
  .map((c: any) => ({
    name: c.name,
    code: `+${String(c.phone).split(",")[0]}`,
    emoji: c.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export async function syncAuthenticatedUserProfile(user: any) {
  if (!user?.id) return null;

  try {
    const meta = user.user_metadata || {};
    const deterministicCode = `HP-${user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const isGoogleUser =
      user?.app_metadata?.provider === "google" ||
      (Array.isArray(user?.identities) &&
        user.identities.some((id: any) => id.provider === "google"));

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const resolvedAffiliateCode =
      existingProfile?.affiliate_code && !existingProfile.affiliate_code.endsWith("-TEST")
        ? existingProfile.affiliate_code
        : deterministicCode;

    const existingCompleted = Boolean(
      existingProfile?.profile_completed ||
        meta?.profile_completed ||
        (existingProfile?.pillar2_first_name &&
          existingProfile?.pillar2_last_name &&
          existingProfile?.username &&
          (existingProfile?.pillar2_phone || existingProfile?.phone_number || existingProfile?.phone))
    );

    // For Google OAuth users who have NOT yet completed their Pillar 2 profile manually,
    // do NOT auto-populate first/last name, username, phone, or country from Google metadata.
    if (isGoogleUser && !existingCompleted) {
      const minimalPayload: Record<string, any> = {
        id: user.id,
        email: user.email || existingProfile?.email || "",
        pillar2_email: user.email || existingProfile?.pillar2_email || existingProfile?.email || "",
        affiliate_code: resolvedAffiliateCode,
        updated_at: new Date().toISOString(),
      };

      const { data: syncedGoogle } = await supabase
        .from("profiles")
        .upsert(minimalPayload, { onConflict: "id" })
        .select("*")
        .maybeSingle();

      return syncedGoogle || { ...existingProfile, ...minimalPayload, profile_completed: false };
    }

    const metaFullName = (meta.full_name || meta.name || "").trim();
    const metaFirstName = (
      meta.first_name ||
      (metaFullName ? metaFullName.split(/\s+/)[0] : "")
    ).trim();
    const metaLastName = (
      meta.last_name ||
      (metaFullName ? metaFullName.split(/\s+/).slice(1).join(" ") : "")
    ).trim();
    const metaUsername = (
      meta.username ||
      meta.preferred_username ||
      existingProfile?.username ||
      metaFirstName ||
      (user.email ? user.email.split("@")[0] : "")
    ).trim();
    const metaPhone = (
      meta.phone_number ||
      meta.phone ||
      existingProfile?.phone_number ||
      existingProfile?.pillar2_phone ||
      ""
    ).trim();
    const metaCountry = (
      meta.country ||
      existingProfile?.country ||
      existingProfile?.pillar2_country ||
      existingProfile?.location_country ||
      "Ghana"
    ).trim();
    const metaCurrency = (meta.currency || existingProfile?.currency || "USD").trim();

    const resolvedFirstName =
      existingProfile?.first_name ||
      existingProfile?.pillar2_first_name ||
      metaFirstName ||
      (existingProfile?.full_name ? existingProfile.full_name.trim().split(/\s+/)[0] : "") ||
      metaUsername;

    const resolvedLastName =
      existingProfile?.last_name ||
      existingProfile?.pillar2_last_name ||
      metaLastName ||
      (existingProfile?.full_name
        ? existingProfile.full_name.trim().split(/\s+/).slice(1).join(" ")
        : "");

    const resolvedFullName =
      existingProfile?.full_name ||
      metaFullName ||
      `${resolvedFirstName} ${resolvedLastName}`.trim() ||
      metaUsername;

    const upsertPayload: Record<string, any> = {
      id: user.id,
      email: user.email || existingProfile?.email || "",
      username: existingProfile?.username || metaUsername,
      full_name: resolvedFullName,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      phone_number: existingProfile?.phone_number || metaPhone || null,
      phone: existingProfile?.phone || metaPhone || null,
      country: metaCountry,
      location_country: existingProfile?.location_country || metaCountry,
      currency: metaCurrency,
      affiliate_code: resolvedAffiliateCode,
      pillar2_first_name: existingProfile?.pillar2_first_name || resolvedFirstName,
      pillar2_last_name: existingProfile?.pillar2_last_name || resolvedLastName,
      pillar2_email: user.email || existingProfile?.pillar2_email || existingProfile?.email || "",
      pillar2_phone: existingProfile?.pillar2_phone || metaPhone || null,
      pillar2_country: existingProfile?.pillar2_country || metaCountry,
      updated_at: new Date().toISOString(),
    };

    const { data: syncedProfile } = await supabase
      .from("profiles")
      .upsert(upsertPayload, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    // Best-effort profile_completed sync if column exists
    if (existingCompleted) {
      try {
        await supabase.from("profiles").update({ profile_completed: true }).eq("id", user.id);
      } catch (_) {}
    }

    return syncedProfile || { ...existingProfile, ...upsertPayload, profile_completed: existingCompleted };
  } catch (err) {
    console.error("[HorPalAuthGate] Profile sync error:", err);
    return null;
  }
}

interface HorPalAuthGateProps {
  defaultTargetPillar?: "1" | "2" | "3";
  onAuthenticated?: (user: any, profile?: any) => void;
  onBackToHub?: () => void;
}

export default function HorPalAuthGate({
  defaultTargetPillar = "1",
  onAuthenticated,
  onBackToHub,
}: HorPalAuthGateProps) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [countryName, setCountryName] = useState("Ghana");
  const [phoneCode, setPhoneCode] = useState("+233");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetPillar, setTargetPillar] = useState<"1" | "2" | "3">(defaultTargetPillar);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Purge any legacy mock/test localStorage keys immediately
      localStorage.removeItem("horpal_p2_state_v3");
      localStorage.removeItem("horpal_p2_user_state_test_bypass_id");
      localStorage.removeItem("horpal_p2_license_test_bypass_id");

      const storedTarget = localStorage.getItem("horpal_target_pillar");
      if (storedTarget === "1" || storedTarget === "2" || storedTarget === "3") {
        setTargetPillar(storedTarget);
      } else {
        setTargetPillar(defaultTargetPillar);
        localStorage.setItem("horpal_target_pillar", defaultTargetPillar);
      }
    }
  }, [defaultTargetPillar]);

  const handleCountryCodeChange = (newCode: string, selectedName?: string) => {
    setPhoneCode(newCode);
    if (selectedName) {
      setCountryName(selectedName);
    } else if (COUNTRY_NAME_MAP[newCode]) {
      setCountryName(COUNTRY_NAME_MAP[newCode]);
    }
    if (newCode === "+233") setCurrency("GHS");
    else if (newCode === "+234") setCurrency("NGN");
    else if (newCode === "+254") setCurrency("KES");
    else if (newCode === "+27") setCurrency("ZAR");
  };

  const routeAfterAuth = async (authenticatedUser: any) => {
    const syncedProfile = await syncAuthenticatedUserProfile(authenticatedUser);

    const activeDestination =
      (typeof window !== "undefined"
        ? (localStorage.getItem("horpal_target_pillar") as "1" | "2" | "3" | null)
        : null) ||
      targetPillar ||
      defaultTargetPillar;

    if (typeof window !== "undefined") {
      localStorage.removeItem("horpal_target_pillar");
      const currentPath = window.location.pathname;

      if (activeDestination === "2") {
        if (currentPath.startsWith("/affiliate")) {
          if (onAuthenticated) {
            onAuthenticated(authenticatedUser, syncedProfile);
            return;
          }
        }
        window.location.href = "/affiliate";
        return;
      }

      if (activeDestination === "3") {
        if (currentPath.startsWith("/horpal-ai")) {
          if (onAuthenticated) {
            onAuthenticated(authenticatedUser, syncedProfile);
            return;
          }
        }
        window.location.href = "/horpal-ai";
        return;
      }

      // Pillar 1
      if (onAuthenticated) {
        onAuthenticated(authenticatedUser, syncedProfile);
        return;
      }
      window.location.href = "/";
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);
    setIsSubmitting(true);

    try {
      if (authMode === "signup") {
        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        const cleanUsername = username.trim().replace(/^@+/, "");
        const cleanEmail = email.trim();

        if (!cleanFirst || !cleanLast) {
          throw new Error("Please enter both your First Name and Last Name.");
        }
        if (!cleanUsername) {
          throw new Error("Please choose a Username for your HorPal identity.");
        }
        if (!cleanEmail) {
          throw new Error("Please enter a valid email address.");
        }

        const fullName = `${cleanFirst} ${cleanLast}`.trim();
        const cleanPhoneDigits = phoneNumber.trim().replace(/^0+/, "");
        const fullPhone = cleanPhoneDigits ? `${phoneCode}${cleanPhoneDigits}` : "";

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              first_name: cleanFirst,
              last_name: cleanLast,
              username: cleanUsername,
              phone_number: fullPhone,
              phone: fullPhone,
              country: countryName,
              currency,
              profile_completed: true,
            },
          },
        });
        if (error) throw error;

        if (signUpData?.user) {
          const deterministicCode = `HP-${signUpData.user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
          await supabase.from("profiles").upsert(
            {
              id: signUpData.user.id,
              email: cleanEmail,
              username: cleanUsername,
              full_name: fullName,
              first_name: cleanFirst,
              last_name: cleanLast,
              phone_number: fullPhone || null,
              phone: fullPhone || null,
              country: countryName,
              location_country: countryName,
              currency,
              affiliate_code: deterministicCode,
              pillar2_first_name: cleanFirst,
              pillar2_last_name: cleanLast,
              pillar2_email: cleanEmail,
              pillar2_phone: fullPhone || null,
              pillar2_country: countryName,
              is_pillar2_paid: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
          try {
            await supabase
              .from("profiles")
              .update({ profile_completed: true })
              .eq("id", signUpData.user.id);
          } catch (_) {}
        }

        if (signUpData?.session && signUpData?.user) {
          await routeAfterAuth(signUpData.user);
          return;
        }

        // Attempt immediate sign-in if email confirmation is disabled on Supabase
        const { data: autoLoginData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (autoLoginData?.session && autoLoginData?.user) {
          await routeAfterAuth(autoLoginData.user);
          return;
        }

        setAuthMessage("Account created! Please check your email to verify your account, or sign in now.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data?.user) {
          await routeAfterAuth(data.user);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setAuthError("Please enter your email address first to reset your password.");
      return;
    }
    setAuthError(null);
    setAuthMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setAuthMessage("Password reset link sent! Check your email.");
    } catch (err: any) {
      setAuthError(err.message || "Failed to send reset link.");
    }
  };

  const handleGoogleSignIn = async () => {
    const activeDestination =
      (typeof window !== "undefined"
        ? (localStorage.getItem("horpal_target_pillar") as "1" | "2" | "3" | null)
        : null) ||
      targetPillar ||
      defaultTargetPillar;

    if (typeof window !== "undefined") {
      localStorage.setItem("horpal_target_pillar", activeDestination);
    }

    const redirectPath =
      activeDestination === "2"
        ? "/affiliate"
        : activeDestination === "3"
        ? "/horpal-ai"
        : "/";

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
  };

  const pillarBadge =
    targetPillar === "2"
      ? {
          label: "PILLAR 2 • AFFILIATE MARKETING HUB",
          subtitle: "Sign in or create your HorPal account to access your personalized Affiliate Dashboard.",
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
          badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        }
      : targetPillar === "3"
      ? {
          label: "PILLAR 3 • HORPAL.AI INTELLIGENCE SUITE",
          subtitle: "Sign in or create your HorPal account to unlock your personalized AI workspace.",
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-300",
        }
      : {
          label: "PILLAR 1 • GLOBAL SOCIAL & CREATOR ARENA",
          subtitle: "Sign in or create your HorPal account to connect, broadcast, and earn.",
          icon: <MessageSquare className="w-3.5 h-3.5 text-[#D4AF37]" />,
          badgeClass: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]",
        };

  return (
    <div className="min-h-screen w-full bg-[#020202] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-[#050505] to-[#020202] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Ambient Gold Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back to Hub button */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("horpal_target_pillar");
            }
            if (onBackToHub) {
              onBackToHub();
            } else {
              window.location.href = "/";
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to HorPal Hub
        </button>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase ${pillarBadge.badgeClass}`}>
          {pillarBadge.icon}
          <span>{pillarBadge.label}</span>
        </div>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.1)] z-10 flex flex-col items-center">
        {/* Brand Header */}
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFFDD0] via-[#D4AF37] to-[#AA7C11] tracking-tight mb-1">
          HorPal
        </h1>
        <p className="text-gray-400 text-xs font-medium tracking-widest uppercase mb-3">
          Connect. Elevate. Prosper.
        </p>
        <p className="text-gray-400/80 text-xs text-center mb-6 max-w-xs leading-relaxed">
          {pillarBadge.subtitle}
        </p>

        {/* Auth Mode Toggle */}
        <div className="flex w-full bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              authMode === "login"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              authMode === "signup"
                ? "bg-[#D4AF37] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3.5">
          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
              {authError}
            </div>
          )}
          {authMessage && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs text-center font-medium">
              {authMessage}
            </div>
          )}

          {authMode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 ml-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-3.5 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 ml-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-3.5 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 ml-1">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  placeholder="Choose a unique username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all"
                />
              </div>
            </>
          )}

          <div>
            {authMode === "signup" && (
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 ml-1">
                Email Address
              </label>
            )}
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 text-sm outline-none transition-all"
            />
          </div>

          {authMode === "signup" && (
            <>
              <div className="flex gap-2">
                <select
                  value={phoneCode}
                  onChange={(e) => {
                    const selectedOption = countryOptions.find((c) => c.code === e.target.value);
                    handleCountryCodeChange(e.target.value, selectedOption?.name);
                  }}
                  className="bg-[#111] border border-white/10 focus:border-[#D4AF37] rounded-xl px-3 py-3 text-white text-sm outline-none transition-all w-[38%] truncate"
                >
                  {countryOptions.map((c, idx) => (
                    <option key={`${c.name}-${idx}`} value={c.code}>
                      {c.emoji} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-[62%] bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all"
                />
              </div>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#111] border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
              >
                <option value="GHS">🇬🇭 GHS - Ghanaian Cedi (₵)</option>
                <option value="USD">🇺🇸 USD - US Dollar ($)</option>
                <option value="EUR">🇪🇺 EUR - Euro (€)</option>
                <option value="GBP">🇬🇧 GBP - British Pound (£)</option>
                <option value="NGN">🇳🇬 NGN - Nigerian Naira (₦)</option>
                <option value="KES">🇰🇪 KES - Kenyan Shilling (KSh)</option>
                <option value="ZAR">🇿🇦 ZAR - South African Rand (R)</option>
              </select>
            </>
          )}

          <div>
            {authMode === "signup" && (
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 ml-1">
                Password
              </label>
            )}
            <input
              type="password"
              placeholder="Password (min. 6 characters)"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 text-sm outline-none transition-all"
            />
          </div>

          {authMode === "login" && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-[#D4AF37] hover:underline bg-transparent border-none cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 mt-1 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#AA7C11] text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? "Authenticating..."
              : authMode === "login"
              ? "Sign In to HorPal"
              : "Create HorPal Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center w-full my-5">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="px-3 text-gray-500 text-xs font-medium uppercase">Or continue with</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-3.5 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer text-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="mt-5 flex items-center gap-1.5 text-[11px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Unified HorPal Single Sign-On across all 3 Pillars</span>
        </div>
      </div>
    </div>
  );
}
