'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShieldAlert, Lock, Wrench, LogOut, Sparkles, RefreshCw, ExternalLink, X } from 'lucide-react'
import toast from 'react-hot-toast'

export interface PlatformSettings {
  id: number
  maintenance_mode: boolean
  maintenance_message: string
  freeze_p1_withdrawals: boolean
  freeze_p2_withdrawals: boolean
  disable_live_streams: boolean
  disable_new_signups: boolean
  lock_pillar1: boolean
  lock_pillar2: boolean
  lock_pillar3: boolean
  p1_entry_price_ghs: number
  p2_entry_price_ghs: number
  p2_renewal_price_ghs: number
  p3_weekly_price_ghs: number
  p3_pro_price_ghs: number
  p3_premium_price_ghs: number
  global_announcement_banner: string
  full_screen_popup_title?: string
  full_screen_popup_message?: string
  full_screen_popup_cta_text?: string
  full_screen_popup_cta_url?: string
  full_screen_popup_active?: boolean
  full_screen_popup_id?: string
  pillar3_custom_system_prompt?: string
  pillar3_featured_prompts?: any[]
  p2_contest_prize_pool_ghs?: number
  p2_contest_deadline?: string
  updated_at: string
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 1,
  maintenance_mode: false,
  maintenance_message: 'Earnmega is undergoing a scheduled system upgrade. Back shortly!',
  freeze_p1_withdrawals: false,
  freeze_p2_withdrawals: false,
  disable_live_streams: false,
  disable_new_signups: false,
  lock_pillar1: false,
  lock_pillar2: false,
  lock_pillar3: false,
  p1_entry_price_ghs: 50,
  p2_entry_price_ghs: 90,
  p2_renewal_price_ghs: 45,
  p3_weekly_price_ghs: 50,
  p3_pro_price_ghs: 100,
  p3_premium_price_ghs: 200,
  global_announcement_banner: '',
  full_screen_popup_title: '',
  full_screen_popup_message: '',
  full_screen_popup_cta_text: '',
  full_screen_popup_cta_url: '',
  full_screen_popup_active: false,
  full_screen_popup_id: '',
  pillar3_custom_system_prompt: '',
  pillar3_featured_prompts: [],
  p2_contest_prize_pool_ghs: 10000,
  p2_contest_deadline: '2026-12-31',
  updated_at: new Date().toISOString()
}

const MASTER_ADMIN_EMAILS = [
  'moses@horpal.com',
  'admin@horpal.com',
  'geemingss@gmail.com',
  'earnmegaservice@gmail.com',
  'horpalservice@gmail.com',
  'geestablish@gmail.com',
  'horpal@gmail.com'
]

export interface UseAdminRealtimeEnforcementOptions {
  pillar?: 1 | 2 | 3
  onForceOpenPaywall?: (pillar: 1 | 2 | 3, reason?: string) => void
  onForceUnlockPillar?: (pillar: 1 | 2 | 3, profile: any) => void
  onSettingsChanged?: (settings: PlatformSettings) => void
  onProfileChanged?: (profile: any) => void
}

function checkIsPillar2PaidValid(profile: any): boolean {
  if (!profile) return false
  const hasPaid =
    profile.has_paid_pillar2 === true ||
    profile.is_pillar2_paid === true ||
    profile.pillar2_access === true
  if (!hasPaid) return false
  if (profile.pillar2_expires_at) {
    const exp = new Date(profile.pillar2_expires_at).getTime()
    if (!isNaN(exp) && exp <= Date.now()) {
      return false
    }
  }
  return true
}

function checkIsPillar3PaidValid(profile: any): boolean {
  if (!profile) return false
  const hasPaid =
    profile.has_paid_pillar3 === true ||
    profile.is_pillar3_paid === true ||
    profile.pillar3_access === true ||
    (profile.pillar3_tier && profile.pillar3_tier !== 'none' && profile.pillar3_tier !== 'free')
  if (!hasPaid) return false
  if (profile.pillar3_expires_at) {
    const exp = new Date(profile.pillar3_expires_at).getTime()
    if (!isNaN(exp) && exp <= Date.now()) {
      return false
    }
  }
  return true
}

function checkIsPillar1PaidValid(profile: any): boolean {
  if (!profile) return false
  return profile.has_paid_global_chat === true || profile.is_paid === true
}

export function useAdminRealtimeEnforcement(options: UseAdminRealtimeEnforcementOptions = {}) {
  const { pillar, onForceOpenPaywall, onForceUnlockPillar, onSettingsChanged, onProfileChanged } =
    options
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)
  const [profile, setProfile] = useState<any>(null)
  const [isBannedOrSuspended, setIsBannedOrSuspended] = useState(false)
  const [banReason, setBanReason] = useState<string>('')
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const mountTimestampRef = useRef<number>(Date.now())

  const prevAccessRef = useRef<{
    initialized: boolean
    p1: boolean
    p2: boolean
    p3: boolean
  }>({
    initialized: false,
    p1: false,
    p2: false,
    p3: false
  })

  const callbacksRef = useRef({
    onForceOpenPaywall,
    onForceUnlockPillar,
    onSettingsChanged,
    onProfileChanged
  })
  callbacksRef.current = {
    onForceOpenPaywall,
    onForceUnlockPillar,
    onSettingsChanged,
    onProfileChanged
  }

  const applySettings = useCallback((rawSettings: any) => {
    if (!rawSettings) return
    const payloadObj = rawSettings.settings ? rawSettings.settings : rawSettings
    const merged: PlatformSettings = {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...payloadObj,
      maintenance_mode: Boolean(payloadObj.maintenance_mode),
      freeze_p1_withdrawals: Boolean(payloadObj.freeze_p1_withdrawals),
      freeze_p2_withdrawals: Boolean(payloadObj.freeze_p2_withdrawals),
      disable_live_streams: Boolean(payloadObj.disable_live_streams),
      disable_new_signups: Boolean(payloadObj.disable_new_signups),
      lock_pillar1: Boolean(payloadObj.lock_pillar1),
      lock_pillar2: Boolean(payloadObj.lock_pillar2),
      lock_pillar3: Boolean(payloadObj.lock_pillar3),
      p1_entry_price_ghs: Number(payloadObj.p1_entry_price_ghs ?? 50),
      p2_entry_price_ghs: Number(payloadObj.p2_entry_price_ghs ?? 90),
      p2_renewal_price_ghs: Number(payloadObj.p2_renewal_price_ghs ?? 45),
      p3_weekly_price_ghs: Number(payloadObj.p3_weekly_price_ghs ?? 50),
      p3_pro_price_ghs: Number(payloadObj.p3_pro_price_ghs ?? 100),
      p3_premium_price_ghs: Number(payloadObj.p3_premium_price_ghs ?? 200),
      global_announcement_banner: String(payloadObj.global_announcement_banner ?? ''),
      full_screen_popup_title: String(payloadObj.full_screen_popup_title ?? ''),
      full_screen_popup_message: String(payloadObj.full_screen_popup_message ?? ''),
      full_screen_popup_cta_text: String(payloadObj.full_screen_popup_cta_text ?? ''),
      full_screen_popup_cta_url: String(payloadObj.full_screen_popup_cta_url ?? ''),
      full_screen_popup_active: Boolean(payloadObj.full_screen_popup_active),
      full_screen_popup_id: String(payloadObj.full_screen_popup_id ?? '')
    }
    setSettings(merged)
    callbacksRef.current.onSettingsChanged?.(merged)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('earnmega:platform-settings-updated', { detail: merged }))
      window.dispatchEvent(
        new CustomEvent('earnmega:admin-enforcement-sync', { detail: { settings: merged } })
      )
    }
  }, [])

  const applyProfile = useCallback(
    async (rawProfile: any) => {
      if (!rawProfile) return
      setProfile(rawProfile)
      callbacksRef.current.onProfileChanged?.(rawProfile)

      const emailLower = String(rawProfile.email || '').toLowerCase()
      const adminFlag =
        Boolean(rawProfile.is_admin) ||
        rawProfile.role === 'admin' ||
        MASTER_ADMIN_EMAILS.includes(emailLower)
      setIsAdminUser(adminFlag)

      // #18 Check Force Logout timestamp
      if (rawProfile.force_logout_at && !adminFlag) {
        const logoutMs = new Date(rawProfile.force_logout_at).getTime()
        if (!isNaN(logoutMs) && logoutMs > mountTimestampRef.current) {
          mountTimestampRef.current = Date.now()
          try {
            const supabase = createClient()
            await supabase.auth.signOut()
          } catch {}
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
          return
        }
      }

      // 1. Check Ban / Suspension immediately
      const banned =
        rawProfile.is_banned === true ||
        rawProfile.is_suspended === true ||
        rawProfile.status === 'banned' ||
        rawProfile.status === 'suspended'

      if (banned && !adminFlag) {
        setIsBannedOrSuspended(true)
        setBanReason(
          rawProfile.is_banned
            ? 'Your account has been permanently banned by Earnmega Trust & Safety.'
            : 'Your account has been suspended by an Administrator.'
        )
        try {
          const supabase = createClient()
          await supabase.auth.signOut()
        } catch {}
        return
      } else {
        setIsBannedOrSuspended(false)
      }

      // 2. Check Pillar 1, Pillar 2, Pillar 3 Access Transitions
      const p1Now = adminFlag || checkIsPillar1PaidValid(rawProfile)
      const p2Now = adminFlag || checkIsPillar2PaidValid(rawProfile)
      const p3Now = adminFlag || checkIsPillar3PaidValid(rawProfile)

      const prev = prevAccessRef.current

      if (prev.initialized) {
        // Pillar 1 transition
        if (prev.p1 && !p1Now) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('horpal_global_chat_unlocked')
            localStorage.removeItem('earnmega_p1_unlocked')
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-revoked', {
                detail: { pillar: 1, profile: rawProfile }
              })
            )
          }
          if (!pillar || pillar === 1) {
            callbacksRef.current.onForceOpenPaywall?.(1, 'revoked')
          }
        } else if (!prev.p1 && p1Now) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-granted', {
                detail: { pillar: 1, profile: rawProfile }
              })
            )
          }
          if (!pillar || pillar === 1) {
            callbacksRef.current.onForceUnlockPillar?.(1, rawProfile)
          }
        }

        // Pillar 2 transition
        if (prev.p2 && !p2Now) {
          const isExpiredRenewal =
            rawProfile.has_paid_pillar2 === true &&
            rawProfile.pillar2_expires_at &&
            new Date(rawProfile.pillar2_expires_at).getTime() <= Date.now()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('horpal_pillar2_unlocked')
            localStorage.removeItem('earnmega_p2_unlocked')
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-revoked', {
                detail: {
                  pillar: 2,
                  reason: isExpiredRenewal ? 'expired_renewal' : 'revoked',
                  profile: rawProfile
                }
              })
            )
          }
          if (!pillar || pillar === 2) {
            callbacksRef.current.onForceOpenPaywall?.(
              2,
              isExpiredRenewal ? 'expired_renewal' : 'revoked'
            )
          }
        } else if (!prev.p2 && p2Now) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-granted', {
                detail: { pillar: 2, profile: rawProfile }
              })
            )
          }
          if (!pillar || pillar === 2) {
            callbacksRef.current.onForceUnlockPillar?.(2, rawProfile)
          }
        }

        // Pillar 3 transition
        if (prev.p3 && !p3Now) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('horpal_pillar3_unlocked')
            localStorage.removeItem('earnmega_p3_unlocked')
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-revoked', {
                detail: { pillar: 3, profile: rawProfile }
              })
            )
          }
          if (!pillar || pillar === 3) {
            callbacksRef.current.onForceOpenPaywall?.(3, 'revoked')
          }
        } else if (!prev.p3 && p3Now) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('earnmega:pillar-access-granted', {
                detail: { pillar: 3, profile: rawProfile }
              })
            )
          }
          if (!pillar || pillar === 3) {
            callbacksRef.current.onForceUnlockPillar?.(3, rawProfile)
          }
        }
      } else {
        if (pillar === 1 && !p1Now) {
          callbacksRef.current.onForceOpenPaywall?.(1, 'unpaid')
        } else if (pillar === 2 && !p2Now) {
          const isExpiredRenewal =
            rawProfile.has_paid_pillar2 === true &&
            rawProfile.pillar2_expires_at &&
            new Date(rawProfile.pillar2_expires_at).getTime() <= Date.now()
          callbacksRef.current.onForceOpenPaywall?.(
            2,
            isExpiredRenewal ? 'expired_renewal' : 'unpaid'
          )
        } else if (pillar === 3 && !p3Now) {
          callbacksRef.current.onForceOpenPaywall?.(3, 'unpaid')
        }
      }

      prevAccessRef.current = {
        initialized: true,
        p1: p1Now,
        p2: p2Now,
        p3: p3Now
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('earnmega:admin-enforcement-sync', {
            detail: { profile: rawProfile }
          })
        )
      }
    },
    [pillar]
  )

  const pollEnforcementState = useCallback(
    async (uid: string | null) => {
      try {
        const query = uid
          ? `?userId=${encodeURIComponent(uid)}&_t=${Date.now()}`
          : `?_t=${Date.now()}`
        const res = await fetch(`/api/admin/action${query}`, {
          method: 'GET',
          cache: 'no-store'
        })
        if (!res.ok) return
        const data = await res.json()
        if (data?.settings) {
          applySettings(data.settings)
        }
        if (data?.profile) {
          await applyProfile(data.profile)
        }
      } catch {}
    },
    [applySettings, applyProfile]
  )

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let activeUid: string | null = null
    let profileChannel: any = null

    const setup = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()
        if (!mounted) return
        activeUid = user?.id || null
        setUserId(activeUid)

        if (user?.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
          setIsAdminUser(true)
        }

        await pollEnforcementState(activeUid)

        if (activeUid) {
          profileChannel = supabase
            .channel(`admin_enforcer_profile_${activeUid}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${activeUid}`
              },
              (payload: any) => {
                if (payload?.new) {
                  void applyProfile(payload.new)
                }
              }
            )
            .subscribe()
        }
      } catch {
        await pollEnforcementState(null)
      }
    }

    void setup()

    const settingsChannel = supabase
      .channel('admin_enforcer_platform_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings'
        },
        (payload: any) => {
          if (payload?.new) {
            applySettings(payload.new)
          }
        }
      )
      .subscribe()

    const broadcastChannel = supabase
      .channel('horpal_godmode_command')
      .on('broadcast', { event: 'PLATFORM_SETTINGS_UPDATED' }, (payload: any) => {
        if (payload?.payload) {
          applySettings(payload.payload)
        } else {
          void pollEnforcementState(activeUid)
        }
      })
      .on('broadcast', { event: 'GLOBAL_LOCKDOWN' }, (payload: any) => {
        if (payload?.payload?.settings) {
          applySettings(payload.payload.settings)
        } else {
          void pollEnforcementState(activeUid)
        }
      })
      .on('broadcast', { event: 'USER_TERMINATED' }, (payload: any) => {
        if (activeUid && payload?.payload?.userId === activeUid) {
          void supabase.auth.signOut().finally(() => {
            if (typeof window !== 'undefined') window.location.reload()
          })
        }
      })
      .on('broadcast', { event: 'ACCOUNT_SUSPENDED' }, (payload: any) => {
        if (activeUid && payload?.payload?.target === activeUid) {
          setIsBannedOrSuspended(true)
          void supabase.auth.signOut()
        }
      })
      .on('broadcast', { event: 'PILLAR_ACCESS_UPDATED' }, (payload: any) => {
        if (activeUid && payload?.payload?.userId === activeUid) {
          if (payload?.payload?.profile) {
            void applyProfile(payload.payload.profile)
          } else {
            void pollEnforcementState(activeUid)
          }
        }
      })
      .on('broadcast', { event: 'USER_ENFORCEMENT_UPDATED' }, (payload: any) => {
        if (activeUid && payload?.payload?.userId === activeUid) {
          if (payload?.payload?.profile) {
            void applyProfile(payload.payload.profile)
          } else {
            void pollEnforcementState(activeUid)
          }
        }
      })
      .on('broadcast', { event: 'COIN_AIRDROP_CELEBRATION' }, (payload: any) => {
        const p = payload?.payload
        if (p?.bonus) {
          toast.success(
            `🎉 ${p.message || 'Admin Bonus Airdrop'}: +${p.bonus} Coins added to your wallet!`,
            { duration: 7000 }
          )
          void pollEnforcementState(activeUid)
        }
      })
      .subscribe()

    const intervalId = setInterval(() => {
      void pollEnforcementState(activeUid)
    }, 5000)

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      activeUid = session?.user?.id || null
      setUserId(activeUid)
      void pollEnforcementState(activeUid)
    })

    return () => {
      mounted = false
      clearInterval(intervalId)
      supabase.removeChannel(settingsChannel)
      supabase.removeChannel(broadcastChannel)
      if (profileChannel) supabase.removeChannel(profileChannel)
      authSub.subscription.unsubscribe()
    }
  }, [applyProfile, applySettings, pollEnforcementState])

  return {
    settings,
    profile,
    userId,
    isAdminUser,
    isBannedOrSuspended,
    banReason,
    refreshEnforcement: () => pollEnforcementState(userId)
  }
}

export function AdminRealtimeEnforcementOverlay() {
  const { settings, isAdminUser, isBannedOrSuspended, banReason } = useAdminRealtimeEnforcement()
  const [pathname, setPathname] = useState<string>('')
  const [dismissedPopupId, setDismissedPopupId] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname)
      const updatePath = () => setPathname(window.location.pathname)
      window.addEventListener('popstate', updatePath)
      const pathTimer = setInterval(updatePath, 1000)
      return () => {
        window.removeEventListener('popstate', updatePath)
        clearInterval(pathTimer)
      }
    }
  }, [])

  const isOnAdminRoute = pathname.startsWith('/geemings-command-x9v2')

  // 1. Banned or Suspended Full-Screen Red Enforcement Screen
  if (isBannedOrSuspended && !isOnAdminRoute) {
    return (
      <div className="fixed inset-0 z-[999999] bg-gradient-to-b from-[#1f0306] via-[#0d0103] to-black flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-red-950/40 border-2 border-red-500/60 rounded-3xl p-8 shadow-[0_0_90px_rgba(239,68,68,0.35)] backdrop-blur-xl">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <ShieldAlert className="w-11 h-11 text-red-500" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-black uppercase tracking-widest mb-4">
            Access Terminated
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            ACCOUNT SUSPENDED / BANNED
          </h1>
          <p className="text-red-200/80 text-sm leading-relaxed mb-6">
            {banReason ||
              'Your Earnmega account has been suspended or banned for violating platform Trust & Safety policies. Your active session has been signed out.'}
          </p>
          <button
            onClick={async () => {
              try {
                const supabase = createClient()
                await supabase.auth.signOut()
              } catch {}
              window.location.href = '/login'
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/30"
          >
            <LogOut className="w-4 h-4" /> Return to Login
          </button>
        </div>
      </div>
    )
  }

  // 2. Global Maintenance Mode Lockdown Screen (for all non-admin users)
  if (settings.maintenance_mode && !isAdminUser && !isOnAdminRoute) {
    return (
      <div className="fixed inset-0 z-[999998] bg-gradient-to-b from-[#0b0e17] via-[#06080f] to-black flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-lg w-full bg-slate-900/80 border-2 border-amber-500/50 rounded-3xl p-8 shadow-[0_0_90px_rgba(245,158,11,0.25)] backdrop-blur-xl">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto mb-6">
            <Wrench
              className="w-10 h-10 text-amber-400 animate-spin"
              style={{ animationDuration: '6s' }}
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-widest mb-4">
            System Maintenance Lockdown
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
            Scheduled System Upgrade
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            {settings.maintenance_message ||
              'Earnmega is undergoing a scheduled system upgrade. Back shortly!'}
          </p>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Your screen will automatically resume as soon as maintenance completes.</span>
          </div>
        </div>
      </div>
    )
  }

  // 3. Per-Pillar Emergency Lockdown Screen
  const isPillar2Route = pathname.startsWith('/affiliate')
  const isPillar3Route = pathname.startsWith('/horpal-ai')
  const isPillar1Route =
    !isOnAdminRoute &&
    !isPillar2Route &&
    !isPillar3Route &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/signup')

  const lockedPillarNumber =
    !isAdminUser && !isOnAdminRoute
      ? isPillar2Route && settings.lock_pillar2
        ? 2
        : isPillar3Route && settings.lock_pillar3
        ? 3
        : isPillar1Route && settings.lock_pillar1
        ? 1
        : null
      : null

  if (lockedPillarNumber) {
    const pillarNames: Record<number, string> = {
      1: 'Pillar 1 — Global Chat & Live Arena',
      2: 'Pillar 2 — Digital Affiliate Marketplace',
      3: 'Pillar 3 — HorPal AI Studio'
    }
    return (
      <div className="fixed inset-0 z-[999990] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/90 border-2 border-amber-500/50 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-widest mb-3">
            Temporary Pillar Lockdown
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
            {pillarNames[lockedPillarNumber]} is Temporarily Locked
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Administrators are currently performing scheduled maintenance on Pillar{' '}
            {lockedPillarNumber}. Other pillars remain available!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {lockedPillarNumber !== 1 && (
              <a
                href="/"
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Go to Pillar 1
              </a>
            )}
            {lockedPillarNumber !== 2 && (
              <a
                href="/affiliate"
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition"
              >
                Go to Pillar 2
              </a>
            )}
            {lockedPillarNumber !== 3 && (
              <a
                href="/horpal-ai"
                className="flex-1 py-3 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition"
              >
                Go to Pillar 3
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  const showPopup =
    !isOnAdminRoute &&
    Boolean(settings.full_screen_popup_active) &&
    Boolean(settings.full_screen_popup_message) &&
    settings.full_screen_popup_id !== dismissedPopupId

  return (
    <>
      {/* #5 Global Sticky Announcement Marquee */}
      {settings.global_announcement_banner &&
        settings.global_announcement_banner.trim().length > 0 &&
        !isOnAdminRoute && (
          <div className="fixed top-0 left-0 right-0 z-[9990] pointer-events-none flex justify-center px-3 pt-2">
            <div className="pointer-events-auto max-w-3xl w-full bg-gradient-to-r from-amber-500/95 via-orange-500/95 to-amber-500/95 text-black px-4 py-2 rounded-xl shadow-lg border border-amber-300/60 flex items-center justify-center gap-2 text-xs sm:text-sm font-black overflow-hidden">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">{settings.global_announcement_banner}</span>
            </div>
          </div>
        )}

      {/* #6 Full-Screen Popup Broadcast Modal (With Optional CTA Link) */}
      {showPopup && (
        <div className="fixed inset-0 z-[99995] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0D0F18] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-7 text-center shadow-[0_0_80px_rgba(245,158,11,0.3)] relative">
            <button
              type="button"
              onClick={() => setDismissedPopupId(settings.full_screen_popup_id || 'dismissed')}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-2">
              Official Platform Broadcast
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              {settings.full_screen_popup_title || 'Earnmega Announcement'}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">
              {settings.full_screen_popup_message}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              {settings.full_screen_popup_cta_url && (
                <a
                  href={settings.full_screen_popup_cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setDismissedPopupId(settings.full_screen_popup_id || 'dismissed')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <span>{settings.full_screen_popup_cta_text || 'Open Link'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setDismissedPopupId(settings.full_screen_popup_id || 'dismissed')}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
