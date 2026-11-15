'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Key, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/utils/supabase';

export const ACTIVATED_CREDENTIALS_STORAGE_KEY = 'horpal_activated_credentials_banner_v1';

export interface ActivatedCredentialsPayload {
  email: string;
  accountPassword: string;
  pillar?: number;
  activatedAt: number;
}

export function triggerActivatedCredentialsBanner(
  email: string,
  accountPassword: string,
  pillar?: number
) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(accountPassword || '').trim();
  if (!cleanEmail || !cleanPass) return;

  const payload: ActivatedCredentialsPayload = {
    email: cleanEmail,
    accountPassword: cleanPass,
    pillar,
    activatedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(ACTIVATED_CREDENTIALS_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(ACTIVATED_CREDENTIALS_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent('horpal_credentials_activated', { detail: payload })
    );
  } catch {
    // ignore storage errors
  }

  toast.success(
    `🎉 Congratulations! Account Activated — Email: ${cleanEmail} | Password: ${cleanPass}`,
    { duration: 9000 }
  );
}

interface ActivatedCredentialsBannerProps {
  currentEmail?: string | null;
  currentPassword?: string | null;
  pillar?: number;
}

export function ActivatedCredentialsBanner({
  currentEmail,
  currentPassword,
}: ActivatedCredentialsBannerProps) {
  const [bannerData, setBannerData] = useState<ActivatedCredentialsPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const raw =
          sessionStorage.getItem(ACTIVATED_CREDENTIALS_STORAGE_KEY) ||
          localStorage.getItem(ACTIVATED_CREDENTIALS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as ActivatedCredentialsPayload;
        if (parsed?.email && parsed?.accountPassword) {
          // Keep visible for up to 24 hours unless dismissed
          if (Date.now() - (parsed.activatedAt || 0) < 24 * 60 * 60 * 1000) {
            setBannerData(parsed);
          }
        }
      } catch {
        // ignore
      }
    };

    loadFromStorage();

    const handleEvent = (e: Event) => {
      const custom = e as CustomEvent<ActivatedCredentialsPayload>;
      if (custom?.detail?.email && custom?.detail?.accountPassword) {
        setBannerData(custom.detail);
      } else {
        loadFromStorage();
      }
    };

    window.addEventListener('horpal_credentials_activated', handleEvent);
    return () => {
      window.removeEventListener('horpal_credentials_activated', handleEvent);
    };
  }, [currentEmail, currentPassword]);

  if (!bannerData) return null;

  const displayEmail = bannerData.email || currentEmail || '';
  const displayPassword = bannerData.accountPassword || currentPassword || '';

  if (!displayEmail || !displayPassword) return null;

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(displayPassword);
    setCopied(true);
    toast.success(`Password copied: ${displayPassword}`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDismiss = () => {
    setBannerData(null);
    try {
      sessionStorage.removeItem(ACTIVATED_CREDENTIALS_STORAGE_KEY);
      localStorage.removeItem(ACTIVATED_CREDENTIALS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full z-[9990] bg-gradient-to-r from-emerald-950/95 via-[#0b1528]/95 to-amber-950/95 border-b border-amber-400/40 px-3 sm:px-5 py-2.5 shadow-[0_10px_30px_rgba(16,185,129,0.2)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2 text-white">
          <span className="inline-flex items-center gap-1.5 font-black text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            🎉 Congratulations! Account Activated —
          </span>
          <span className="text-slate-200">
            Your Login Email:{' '}
            <strong className="text-white font-bold">{displayEmail}</strong>
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="inline-flex items-center gap-1.5 bg-black/50 border border-emerald-400/40 px-2.5 py-1 rounded-lg">
            <span className="text-emerald-300 font-semibold">Password:</span>
            <code className="font-mono font-black text-amber-300 tracking-wider">
              {displayPassword}
            </code>
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleCopyPassword}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs transition shadow-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>📋 Copy Password</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface AccountCredentialsCardProps {
  userId?: string | null;
  email?: string | null;
  accountPassword?: string | null;
  compact?: boolean;
}

export function AccountCredentialsCard({
  userId,
  email,
  accountPassword,
  compact = false,
}: AccountCredentialsCardProps) {
  const [resolvedEmail, setResolvedEmail] = useState<string>(email || '');
  const [resolvedPassword, setResolvedPassword] = useState<string>(accountPassword || '');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [copiedBoth, setCopiedBoth] = useState<boolean>(false);

  useEffect(() => {
    if (email) setResolvedEmail(email);
  }, [email]);

  useEffect(() => {
    if (accountPassword) setResolvedPassword(accountPassword);
  }, [accountPassword]);

  useEffect(() => {
    let cancelled = false;
    const fetchCredentials = async () => {
      try {
        let uid = userId || null;
        let mail = email || null;
        if (!uid) {
          const { data: authData } = await supabase.auth.getUser();
          uid = authData?.user?.id || null;
          mail = mail || authData?.user?.email || null;
        }
        if (mail && !cancelled) setResolvedEmail((prev) => prev || mail!);
        if (!uid) return;

        const { data: prof } = await supabase
          .from('profiles')
          .select('email, account_password')
          .eq('id', uid)
          .maybeSingle();

        if (!cancelled && prof) {
          if (prof.email) setResolvedEmail(prof.email);
          if (prof.account_password) setResolvedPassword(prof.account_password);
        }
      } catch {
        // ignore
      }
    };

    if (!resolvedPassword || !resolvedEmail) {
      fetchCredentials();
    }
    return () => {
      cancelled = true;
    };
  }, [userId, email, accountPassword]);

  const handleCopyPass = () => {
    if (!resolvedPassword) return;
    navigator.clipboard.writeText(resolvedPassword);
    setCopiedPass(true);
    toast.success('Account password copied to clipboard!');
    setTimeout(() => setCopiedPass(false), 2200);
  };

  const handleCopyBoth = () => {
    const text = `Email: ${resolvedEmail || 'N/A'} | Password: ${resolvedPassword || 'Not Set'}`;
    navigator.clipboard.writeText(text);
    setCopiedBoth(true);
    toast.success('Login Email & Password copied!');
    setTimeout(() => setCopiedBoth(false), 2200);
  };

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-amber-950/30 ${
        compact ? 'p-3.5' : 'p-4'
      } space-y-3`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Key className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
              Your HorPal Login Credentials
            </h4>
            <p className="text-[10px] text-slate-400">
              Sign in on any device using Gmail + Password or Google
            </p>
          </div>
        </div>
        {resolvedPassword && (
          <button
            type="button"
            onClick={handleCopyBoth}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1 transition cursor-pointer"
          >
            {copiedBoth ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
            <span>{copiedBoth ? 'Copied All' : 'Copy Both'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 text-xs">
        <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Login Email (Gmail)
            </span>
            <span className="text-white font-bold truncate block">
              {resolvedEmail || 'Loading...'}
            </span>
          </div>
        </div>

        <div className="bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 block font-semibold">
              Account Password
            </span>
            <span className="font-mono font-black text-sm text-amber-300 tracking-wider block">
              {resolvedPassword
                ? showPassword
                  ? resolvedPassword
                  : '•••••••••'
                : 'Not Set'}
            </span>
          </div>

          {resolvedPassword && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyPass}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                {copiedPass ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>📋 Copy</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
