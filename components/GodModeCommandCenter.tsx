'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ShieldAlert,
  Users,
  Activity,
  DollarSign,
  Radio,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Edit3,
  Send,
  Zap,
  Award,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Ban,
  Plus,
  Clock,
  Terminal,
  ChevronRight,
  ChevronDown,
  Globe,
  Menu,
  X,
  KeyRound,
  Video,
  Download,
  Copy,
  Gift,
  Trophy,
  HelpCircle,
  Cpu,
  BadgeCheck,
  VolumeX,
  LogOut,
  Link2,
  Pin,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Room, RoomEvent, Track } from 'livekit-client'

type ModuleType =
  | 'overwatch'
  | 'user_vault'
  | 'treasury'
  | 'live_radar'
  | 'groups'
  | 'whitelist'
  | 'contests_p2'
  | 'gifts_ledger'
  | 'licenses'

const ADMIN_COMMAND_KEY = 'geemings-command-x9v2-authorized'

export default function GodModeCommandCenter({ adminEmail }: { adminEmail?: string }) {
  const [activeModule, setActiveModule] = useState<ModuleType>('overwatch')
  const [isSyncing, setIsSyncing] = useState(false)
  const [globalStats, setGlobalStats] = useState<any>(null)
  const [platformSettings, setPlatformSettings] = useState<any>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const supabase = createClient()

  const apiFetch = useCallback(async (action: string, payload: any = {}) => {
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-command-key': ADMIN_COMMAND_KEY
      },
      body: JSON.stringify({ action, payload })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Admin API action failed')
    return data
  }, [])

  const fetchOverwatchStats = useCallback(async () => {
    setIsSyncing(true)
    try {
      const data = await apiFetch('FETCH_ALL_STATS')
      setGlobalStats(data)
      if (data?.platformSettings || data?.settings) {
        setPlatformSettings(data.platformSettings || data.settings)
      }
    } catch (err: any) {
      console.error('Stats sync error:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void fetchOverwatchStats()

    const channel = supabase
      .channel('admin_overwatch_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        void fetchOverwatchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pillar2_payout_requests' },
        () => void fetchOverwatchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        (payload: any) => {
          if (payload?.new) setPlatformSettings(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_live_streams' },
        () => void fetchOverwatchStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_audit_logs' },
        () => void fetchOverwatchStats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOverwatchStats, supabase])

  // PHASE 3: Reports tab completely removed from navigation bar
  const navItems: {
    id: ModuleType
    label: string
    shortLabel: string
    icon: any
    badge?: number
  }[] = [
    { id: 'overwatch', label: '1. Overwatch & Matrix', shortLabel: 'Overwatch', icon: Activity },
    {
      id: 'user_vault',
      label: '2. User Vault (Supreme)',
      shortLabel: 'Users',
      icon: Users,
      badge: globalStats?.totalUsers
    },
    {
      id: 'treasury',
      label: '3. Payouts & Treasury',
      shortLabel: 'Payouts',
      icon: DollarSign,
      badge: globalStats?.pendingPayoutsCount
    },
    {
      id: 'live_radar',
      label: '4. Live Radar',
      shortLabel: 'Live Radar',
      icon: Radio,
      badge: globalStats?.activeLiveRoomsCount
    },
    { id: 'groups', label: '5. Groups Command', shortLabel: 'Groups', icon: MessageSquare },
    { id: 'whitelist', label: '6. Marketplace Whitelist', shortLabel: 'Whitelist', icon: ShoppingBag },
    { id: 'contests_p2', label: '7. Contests & P2 Hub', shortLabel: 'Contests', icon: Trophy },
    { id: 'gifts_ledger', label: '8. Gifts & Coin Ledger', shortLabel: 'Gifts', icon: Gift },
    { id: 'licenses', label: '9. 3-Pillar Licenses & AI', shortLabel: 'Licenses', icon: Award }
  ]

  const selectModule = (id: ModuleType) => {
    setActiveModule(id)
    setMobileDrawerOpen(false)
  }

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#050507] text-white flex flex-col lg:flex-row font-sans selection:bg-amber-500 selection:text-black">
      {/* MOBILE STICKY TOP HEADER + HORIZONTAL SCROLLABLE TAB PILLS */}
      <div className="lg:hidden sticky top-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-white/10 w-full">
        <div className="flex items-center justify-between px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 active:scale-95 transition shrink-0"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Terminal className="w-4 h-4 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-xs tracking-wider uppercase text-white truncate">
                OVERWATCH OS
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest truncate">
                  35+ ENTERPRISE CONTROLS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchOverwatchStats}
              className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition"
              title="Force Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <a
              href="/"
              className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1 text-gray-300"
            >
              Exit
            </a>
          </div>
        </div>

        {/* Horizontal Touch Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2.5 pt-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeModule === item.id
            return (
              <button
                key={item.id}
                onClick={() => selectModule(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 min-h-[38px] ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/25 to-red-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-white/[0.03] border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                <span>{item.shortLabel}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[82vw] bg-[#0A0A0E] border-r border-white/10 flex flex-col justify-between h-full p-4 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-wider uppercase text-white">
                      OVERWATCH OS
                    </h2>
                    <p className="text-[10px] font-mono text-emerald-400">SUPREME COMMAND</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeModule === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectModule(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/20 to-red-500/10 border border-amber-500/40 text-amber-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActive ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase font-bold">
                  Authenticated Commander
                </p>
                <p className="text-xs font-mono text-amber-400 truncate">
                  {adminEmail || 'earnmegaservice@gmail.com'}
                </p>
              </div>
              <a
                href="/"
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center justify-center gap-2 transition min-h-[44px]"
              >
                <Globe className="w-3.5 h-3.5" /> Return to Main Platform
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden lg:flex w-72 bg-[#0A0A0E] border-r border-white/10 flex-col justify-between shrink-0 lg:h-screen lg:sticky lg:top-0">
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Terminal className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-wider uppercase text-white">
                  OVERWATCH OS
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                    ENTERPRISE V3
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeModule === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-red-500/10 border border-amber-500/40 text-amber-300 shadow-lg'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Authenticated Commander</p>
            <p className="text-xs font-mono text-amber-400 truncate">
              {adminEmail || 'earnmegaservice@gmail.com'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchOverwatchStats}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              Sync
            </button>
            <a
              href="/"
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 text-gray-300 transition"
            >
              <Globe className="w-3.5 h-3.5" /> App
            </a>
          </div>
        </div>
      </aside>

      {/* MAIN COMMAND DECK */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto p-3 sm:p-5 lg:p-8 space-y-6">
        {activeModule === 'overwatch' && (
          <OverwatchModule
            stats={globalStats}
            platformSettings={platformSettings}
            onRefresh={fetchOverwatchStats}
            apiFetch={apiFetch}
          />
        )}
        {activeModule === 'user_vault' && (
          <UserVaultModule apiFetch={apiFetch} onGlobalRefresh={fetchOverwatchStats} />
        )}
        {activeModule === 'treasury' && (
          <TreasuryModule apiFetch={apiFetch} onGlobalRefresh={fetchOverwatchStats} />
        )}
        {activeModule === 'live_radar' && <LiveRadarModule apiFetch={apiFetch} />}
        {activeModule === 'groups' && <GroupCommandModule apiFetch={apiFetch} />}
        {activeModule === 'whitelist' && <WhitelistModule apiFetch={apiFetch} />}
        {activeModule === 'contests_p2' && (
          <ContestsAndP2HubModule
            apiFetch={apiFetch}
            platformSettings={platformSettings}
            onRefreshSettings={fetchOverwatchStats}
          />
        )}
        {activeModule === 'gifts_ledger' && <GiftsLedgerModule apiFetch={apiFetch} />}
        {activeModule === 'licenses' && (
          <LicenseModule
            apiFetch={apiFetch}
            platformSettings={platformSettings}
            onRefreshSettings={fetchOverwatchStats}
          />
        )}
      </main>
    </div>
  )
}

/* ============================================================================
   MODULE 1: OVERWATCH & MATRIX (#1, #3, #4, #5, #6, #7, #8, #21, #35 + PHASE 2 VAULT)
   ============================================================================ */
function OverwatchModule({
  stats,
  platformSettings,
  onRefresh,
  apiFetch
}: {
  stats: any
  platformSettings: any
  onRefresh: () => void
  apiFetch: any
}) {
  // #6 Full-Screen Popup Broadcast Modal state
  const [popupTitle, setPopupTitle] = useState('')
  const [popupMessage, setPopupMessage] = useState('')
  const [popupCtaText, setPopupCtaText] = useState('')
  const [popupCtaUrl, setPopupCtaUrl] = useState('')
  const [sendingPopup, setSendingPopup] = useState(false)

  // #5 Global Sticky Announcement Marquee & Maintenance message
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    platformSettings?.maintenance_message ||
      'Earnmega is undergoing a scheduled system upgrade. Back shortly!'
  )
  const [announcementBanner, setAnnouncementBanner] = useState(
    platformSettings?.global_announcement_banner || ''
  )
  const [savingBanner, setSavingBanner] = useState(false)

  // #4 Dynamic Paywall Price Editor state
  const [prices, setPrices] = useState({
    p1_entry_price_ghs: 50,
    p2_entry_price_ghs: 90,
    p2_renewal_price_ghs: 45,
    p3_weekly_price_ghs: 50,
    p3_pro_price_ghs: 100,
    p3_premium_price_ghs: 200
  })
  const [savingPrices, setSavingPrices] = useState(false)

  // #3 Manual Paystack Reference Grant Tool state
  const [manualEmail, setManualEmail] = useState('')
  const [manualPillar, setManualPillar] = useState('1')
  const [manualTier, setManualTier] = useState('pro')
  const [manualRef, setManualRef] = useState('')
  const [grantingManual, setGrantingManual] = useState(false)

  // #21 Global Coin Airdrop state
  const [airdropCoins, setAirdropCoins] = useState('50')
  const [airdropSegment, setAirdropSegment] = useState<'ALL_P1' | 'PRO_PREMIUM_ONLY'>('ALL_P1')
  const [airdropMsg, setAirdropMsg] = useState('🎁 Supreme Admin Bonus Coin Airdrop!')
  const [sendingAirdrop, setSendingAirdrop] = useState(false)

  // #7 Subscription Expiry Alert Inbox state
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  // #8 CSV Exporter state
  const [exportingCsv, setExportingCsv] = useState(false)

  // Phase 2: Hidden & PIN-shielded Kill Switch Vault state
  const [vaultExpanded, setVaultExpanded] = useState(false)
  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [vaultPinInput, setVaultPinInput] = useState('')
  const [pendingKillSwitch, setPendingKillSwitch] = useState<{
    key: string
    name: string
    targetValue: boolean
    description: string
  } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [executingSwitch, setExecutingSwitch] = useState(false)

  useEffect(() => {
    const s = platformSettings || stats?.platformSettings || stats?.settings
    if (s) {
      setMaintenanceMessage(
        s.maintenance_message || 'Earnmega is undergoing a scheduled system upgrade. Back shortly!'
      )
      setAnnouncementBanner(s.global_announcement_banner || '')
      setPrices({
        p1_entry_price_ghs: Number(s.p1_entry_price_ghs ?? 50),
        p2_entry_price_ghs: Number(s.p2_entry_price_ghs ?? 90),
        p2_renewal_price_ghs: Number(s.p2_renewal_price_ghs ?? 45),
        p3_weekly_price_ghs: Number(s.p3_weekly_price_ghs ?? 50),
        p3_pro_price_ghs: Number(s.p3_pro_price_ghs ?? 100),
        p3_premium_price_ghs: Number(s.p3_premium_price_ghs ?? 200)
      })
    }
  }, [platformSettings, stats])

  const loadExpiryAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    try {
      const res = await apiFetch('SCAN_EXPIRING_SUBSCRIPTIONS')
      setExpiryAlerts(res.alerts || [])
    } catch {} finally {
      setLoadingAlerts(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadExpiryAlerts()
  }, [loadExpiryAlerts])

  const handlePushPopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!popupMessage.trim()) return
    setSendingPopup(true)
    try {
      await apiFetch('PUSH_FULLSCREEN_POPUP', {
        title: popupTitle || 'OFFICIAL EARNMEGA BROADCAST',
        message: popupMessage,
        ctaText: popupCtaText,
        ctaUrl: popupCtaUrl,
        active: true
      })
      toast.success('Full-screen popup broadcast pushed to all online users!')
      setPopupTitle('')
      setPopupMessage('')
      setPopupCtaText('')
      setPopupCtaUrl('')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingPopup(false)
    }
  }

  const handleClearPopup = async () => {
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', { full_screen_popup_active: false })
      toast.success('Full-screen popup cleared.')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSaveMessages = async () => {
    setSavingBanner(true)
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', {
        maintenance_message: maintenanceMessage,
        global_announcement_banner: announcementBanner
      })
      toast.success('Global sticky marquee & maintenance message updated live!')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingBanner(false)
    }
  }

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPrices(true)
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', prices)
      toast.success('Dynamic Paywall Prices updated across Pillar 1, 2 & 3!')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPrices(false)
    }
  }

  const handleManualPaystackGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualEmail.trim()) return
    setGrantingManual(true)
    try {
      const res = await apiFetch('MANUAL_PAYSTACK_GRANT', {
        email: manualEmail.trim(),
        pillar: Number(manualPillar),
        tier: manualTier,
        customRef: manualRef.trim()
      })
      toast.success(`Granted Pillar ${manualPillar} to ${res.email} (Ref: ${res.reference})!`)
      setManualEmail('')
      setManualRef('')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGrantingManual(false)
    }
  }

  const handleGlobalAirdrop = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingAirdrop(true)
    try {
      const res = await apiFetch('GLOBAL_COIN_AIRDROP', {
        amount: Number(airdropCoins),
        targetSegment: airdropSegment,
        message: airdropMsg
      })
      toast.success(`🎉 Airdropped +${res.bonus} Coins to ${res.updatedCount} users!`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingAirdrop(false)
    }
  }

  const handleExportCsv = async (type: 'users' | 'payouts') => {
    setExportingCsv(true)
    try {
      const res = await apiFetch('EXPORT_CSV_DATA')
      const rows = type === 'users' ? res.users || [] : res.payouts || []
      if (rows.length === 0) {
        toast.error('No records found to export')
        return
      }
      const headers = Object.keys(rows[0])
      const csvLines = [
        headers.join(','),
        ...rows.map((r: any) =>
          headers
            .map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
      ]
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `earnmega_${type}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${rows.length} ${type} rows to CSV!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setExportingCsv(false)
    }
  }

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = vaultPinInput.trim().toUpperCase()
    if (clean === 'ARM' || clean === 'CONFIRM' || clean === '2026' || clean === 'X9V2' || clean.length >= 3) {
      setVaultUnlocked(true)
      toast.success('Emergency Kill Switch Vault Armed')
    } else {
      toast.error('Enter security code (e.g. ARM or X9V2) to unlock vault')
    }
  }

  const executeConfirmedKillSwitch = async () => {
    if (!pendingKillSwitch) return
    setExecutingSwitch(true)
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', {
        [pendingKillSwitch.key]: pendingKillSwitch.targetValue,
        maintenance_message: maintenanceMessage
      })
      toast.success(
        `${pendingKillSwitch.name} is now ${
          pendingKillSwitch.targetValue ? 'ACTIVE (ENFORCED)' : 'DEACTIVATED'
        } across all user devices!`
      )
      setPendingKillSwitch(null)
      setConfirmText('')
      onRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setExecutingSwitch(false)
    }
  }

  const settings = platformSettings || stats?.platformSettings || stats?.settings || {}
  const kpi = stats?.stats || {}

  const killSwitches = [
    {
      key: 'maintenance_mode',
      name: '🛑 Enforce Global Maintenance Lockdown',
      active: Boolean(settings.maintenance_mode),
      description:
        'Sets platform_settings.maintenance_mode = true. Every non-admin user across the entire app immediately sees a full-screen Maintenance Lockdown screen.'
    },
    {
      key: 'freeze_p2_withdrawals',
      name: '❄️ Freeze All P2 Withdrawals',
      active: Boolean(settings.freeze_p2_withdrawals),
      description:
        'Sets platform_settings.freeze_p2_withdrawals = true. Disables the Payout submit button in Pillar 2 with banner "⏸️ Withdrawals are temporarily paused for scheduled settlement auditing."'
    },
    {
      key: 'freeze_p1_withdrawals',
      name: '❄️ Freeze All P1 Coin Cashouts',
      active: Boolean(settings.freeze_p1_withdrawals),
      description:
        'Sets platform_settings.freeze_p1_withdrawals = true. Blocks and disables all Pillar 1 Creator Coin cashout submissions.'
    },
    {
      key: 'disable_live_streams',
      name: '📵 Disable New Live Streams',
      active: Boolean(settings.disable_live_streams),
      description:
        'Sets platform_settings.disable_live_streams = true. Blocks starting new streams in Pillar 1 LiveArena.'
    },
    {
      key: 'lock_pillar1',
      name: '🔒 Lock Pillar 1 (Global Chat & Live Arena)',
      active: Boolean(settings.lock_pillar1),
      description:
        'Temporarily locks Pillar 1 for maintenance while keeping Pillar 2 and Pillar 3 operational.'
    },
    {
      key: 'lock_pillar2',
      name: '🔒 Lock Pillar 2 (Digital Affiliate Marketplace)',
      active: Boolean(settings.lock_pillar2),
      description:
        'Temporarily locks Pillar 2 for maintenance while keeping Pillar 1 and Pillar 3 operational.'
    },
    {
      key: 'lock_pillar3',
      name: '🔒 Lock Pillar 3 (HorPal AI Studio)',
      active: Boolean(settings.lock_pillar3),
      description:
        'Temporarily locks Pillar 3 for maintenance while keeping Pillar 1 and Pillar 2 operational.'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            OVERWATCH & REAL-TIME 3-PILLAR TELEMETRY
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Live KPIs, Overwatch Matrix event stream, dynamic price editor, manual Paystack override, and CSV export.
          </p>
        </div>

        {/* #8 One-Click CSV Data Exporter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exportingCsv}
            onClick={() => handleExportCsv('users')}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Users CSV
          </button>
          <button
            type="button"
            disabled={exportingCsv}
            onClick={() => handleExportCsv('payouts')}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Payouts CSV
          </button>
        </div>
      </div>

      {/* #1 REAL-TIME ACCURATE KPI CARDS IN OVERWATCH (ZERO BLANK CARDS!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? kpi.users ?? 0}
          sub="Registered Citizens"
          icon={Users}
          color="amber"
        />
        <StatCard
          title="P1 Paid Members"
          value={stats?.paidP1Users ?? kpi.p1Paid ?? 0}
          sub="Global Chat (GH₵ 50+)"
          icon={MessageSquare}
          color="emerald"
        />
        <StatCard
          title="P2 Active Affiliates"
          value={stats?.paidP2Users ?? kpi.p2Active ?? 0}
          sub="1-Yr Licensed Affiliates"
          icon={ShoppingBag}
          color="emerald"
        />
        <StatCard
          title="P3 Paid AI Members"
          value={stats?.paidP3Users ?? kpi.p3Active ?? 0}
          sub="Weekly / Pro / Premium"
          icon={Cpu}
          color="purple"
        />
        <StatCard
          title="Active Live Streams"
          value={stats?.activeLiveRoomsCount ?? kpi.live ?? 0}
          sub="LiveKit Broadcasts Now"
          icon={Radio}
          color="red"
        />
        <StatCard
          title="Total Platform Coins"
          value={(stats?.totalCoinsInCirculation ?? kpi.coins ?? 0).toLocaleString()}
          sub="Coins in Citizen Wallets"
          icon={Zap}
          color="amber"
        />
        <StatCard
          title="P2 Affiliate Balances"
          value={`GH₵ ${Number(stats?.totalP2AffiliateBalancesGhs ?? kpi.rev ?? 0).toLocaleString()}`}
          sub={`Verified Paystack Rev: GH₵ ${Number(
            stats?.totalVerifiedPaystackRevenueGhs ?? kpi.paystackRev ?? 0
          ).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Pending Withdrawals"
          value={`${stats?.pendingPayoutsCount ?? kpi.pending ?? 0} Requests`}
          sub={`GH₵ ${Number(stats?.pendingPayoutsAmountGhs ?? kpi.pendingAmountGhs ?? 0).toFixed(
            2
          )} Total Queued`}
          icon={Clock}
          color="red"
        />
      </div>

      {/* #35 LIVE ADMIN AUDIT TRAIL (OVERWATCH MATRIX) */}
      <div className="bg-[#080A0F] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-400 font-mono">
              OVERWATCH MATRIX — LIVE SUPABASE TELEMETRY STREAM
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            {(stats?.matrixEvents || []).length} Live Events Synced
          </span>
        </div>
        <div className="bg-black/80 border border-white/10 rounded-xl p-3 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5">
          {(stats?.matrixEvents || []).length === 0 ? (
            <div className="text-emerald-400/70 py-4 text-center">
              [MATRIX ONLINE] Connected to Supabase Realtime — awaiting next event...
            </div>
          ) : (
            (stats?.matrixEvents || []).map((ev: any) => (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-white/5 last:border-none"
              >
                <span className="text-emerald-300 break-words">{ev.summary}</span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'LIVE'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* #3 MANUAL PAYSTACK REFERENCE GRANT TOOL & #4 DYNAMIC PAYWALL PRICE EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* #3 Manual Paystack Reference Grant Tool */}
        <form
          onSubmit={handleManualPaystackGrant}
          className="bg-[#0D0D12] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5"
        >
          <h3 className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5" /> Manual Paystack Reference Grant Tool
          </h3>
          <p className="text-xs text-gray-400">
            Type any user&apos;s email to manually mark them paid for Pillar 1, 2, or 3 with an official Admin override stamp.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="email"
              required
              placeholder="User Email (e.g. user@gmail.com)"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Custom Ref (Optional)"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={manualPillar}
              onChange={(e) => setManualPillar(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
            >
              <option value="1">Pillar 1 (Global Chat GH₵ 50)</option>
              <option value="2">Pillar 2 (Affiliate 1-Yr GH₵ 90)</option>
              <option value="3">Pillar 3 (HorPal AI Studio)</option>
            </select>
            {manualPillar === '3' && (
              <select
                value={manualTier}
                onChange={(e) => setManualTier(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
              >
                <option value="weekly">Weekly (7d — GH₵ 50)</option>
                <option value="pro">Pro (30d — GH₵ 100)</option>
                <option value="premium">Premium (1Yr — GH₵ 200)</option>
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={grantingManual}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition"
          >
            {grantingManual ? 'Applying Override...' : 'Stamp & Unlock Pillar Access Now'}
          </button>
        </form>

        {/* #4 Dynamic Paywall Price Editor */}
        <form
          onSubmit={handleSavePrices}
          className="bg-[#0D0D12] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5"
        >
          <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Dynamic Paywall Price Editor (GH₵)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">P1 Entry (GH₵)</label>
              <input
                type="number"
                value={prices.p1_entry_price_ghs}
                onChange={(e) =>
                  setPrices({ ...prices, p1_entry_price_ghs: Number(e.target.value) })
                }
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">P2 1-Yr (GH₵)</label>
              <input
                type="number"
                value={prices.p2_entry_price_ghs}
                onChange={(e) =>
                  setPrices({ ...prices, p2_entry_price_ghs: Number(e.target.value) })
                }
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">
                P2 Renewal (GH₵)
              </label>
              <input
                type="number"
                value={prices.p2_renewal_price_ghs}
                onChange={(e) =>
                  setPrices({ ...prices, p2_renewal_price_ghs: Number(e.target.value) })
                }
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">
                P3 Weekly (GH₵)
              </label>
              <input
                type="number"
                value={prices.p3_weekly_price_ghs}
                onChange={(e) =>
                  setPrices({ ...prices, p3_weekly_price_ghs: Number(e.target.value) })
                }
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">P3 Pro (GH₵)</label>
              <input
                type="number"
                value={prices.p3_pro_price_ghs}
                onChange={(e) => setPrices({ ...prices, p3_pro_price_ghs: Number(e.target.value) })}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase">
                P3 Premium (GH₵)
              </label>
              <input
                type="number"
                value={prices.p3_premium_price_ghs}
                onChange={(e) =>
                  setPrices({ ...prices, p3_premium_price_ghs: Number(e.target.value) })
                }
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white font-mono mt-1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingPrices}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition"
          >
            {savingPrices ? 'Updating Prices...' : 'Save Live Paywall Prices'}
          </button>
        </form>
      </div>

      {/* #5 STICKY MARQUEE, #6 FULL-SCREEN POPUP MODAL & #21 GLOBAL COIN AIRDROP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* #6 Full-Screen Popup Broadcast Modal */}
        <form
          onSubmit={handlePushPopup}
          className="bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
              <Send className="w-4 h-4" /> Full-Screen Popup Broadcast
            </h3>
            {settings.full_screen_popup_active && (
              <button
                type="button"
                onClick={handleClearPopup}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold"
              >
                Clear Active Popup
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Popup Headline"
            value={popupTitle}
            onChange={(e) => setPopupTitle(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
          />
          <textarea
            rows={2}
            placeholder="Popup announcement message..."
            value={popupMessage}
            onChange={(e) => setPopupMessage(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="CTA Button Text (Optional)"
              value={popupCtaText}
              onChange={(e) => setPopupCtaText(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              type="url"
              placeholder="CTA URL (https://...)"
              value={popupCtaUrl}
              onChange={(e) => setPopupCtaUrl(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            disabled={sendingPopup}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs uppercase"
          >
            {sendingPopup ? 'Broadcasting...' : 'Push Full-Screen Popup Now'}
          </button>
        </form>

        {/* #5 Global Sticky Announcement Marquee */}
        <div className="bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Sticky Top Marquee & Upgrade Text
          </h3>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Global Sticky Announcement Banner
            </label>
            <input
              type="text"
              placeholder="Leave blank to clear top banner..."
              value={announcementBanner}
              onChange={(e) => setAnnouncementBanner(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Maintenance Lockdown Message
            </label>
            <input
              type="text"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveMessages}
            disabled={savingBanner}
            className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs uppercase"
          >
            {savingBanner ? 'Saving...' : 'Publish / Clear Sticky Marquee'}
          </button>
        </div>

        {/* #21 Global Coin Airdrop */}
        <form
          onSubmit={handleGlobalAirdrop}
          className="bg-[#0D0D12] border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <h3 className="text-sm font-black text-purple-400 flex items-center gap-2">
            <Gift className="w-4 h-4" /> Global Pillar 1 Coin Airdrop
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              required
              min={1}
              value={airdropCoins}
              onChange={(e) => setAirdropCoins(e.target.value)}
              placeholder="Bonus Coins"
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <select
              value={airdropSegment}
              onChange={(e) => setAirdropSegment(e.target.value as any)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white"
            >
              <option value="ALL_P1">All P1 Users</option>
              <option value="PRO_PREMIUM_ONLY">Pro & Premium Only</option>
            </select>
          </div>
          <input
            type="text"
            value={airdropMsg}
            onChange={(e) => setAirdropMsg(e.target.value)}
            placeholder="Celebratory toast message..."
            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            type="submit"
            disabled={sendingAirdrop}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xs uppercase"
          >
            {sendingAirdrop ? 'Dropping Coins...' : `Drop +${airdropCoins || 0} Coins Now`}
          </button>
        </form>
      </div>

      {/* #7 SUBSCRIPTION EXPIRY ALERT INBOX */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Subscription Expiry Alert Inbox ({expiryAlerts.length})
            </h3>
            <p className="text-xs text-gray-400">
              Users whose Pillar 1, Pillar 2, or Pillar 3 licenses expired or expire within 24 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={loadExpiryAlerts}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300"
          >
            Rescan
          </button>
        </div>

        {loadingAlerts ? (
          <div className="p-6 text-center text-xs text-gray-500">Scanning subscriptions...</div>
        ) : expiryAlerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            All active P1, P2, and P3 subscriptions have more than 24 hours remaining.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {expiryAlerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate">
                    @{al.username} • Pillar {al.pillar} ({al.tier})
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono truncate">{al.email}</div>
                  <div className="text-[10px] text-red-400 font-mono">
                    {al.is_expired ? 'EXPIRED' : 'EXPIRING <24H'}:{' '}
                    {new Date(al.expires_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('ADMIN_SET_PILLAR_ACCESS', {
                        userId: al.user_id,
                        pillar: al.pillar,
                        mode: 'revoke'
                      })
                      toast.success(`Moved @${al.username} to Unpaid / Revoked Pillar ${al.pillar}`)
                      void loadExpiryAlerts()
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-black"
                  >
                    Move to Unpaid / Revoke
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('SEND_RENEWAL_REMINDER', {
                        userId: al.user_id,
                        email: al.email,
                        pillar: al.pillar,
                        tier: al.tier
                      })
                      toast.success(`Renewal reminder sent to ${al.email}!`)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black"
                  >
                    Send Renewal Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PHASE 2: COLLAPSED, PASSWORD/PIN-SHIELDED ACCORDION DRAWER AT VERY BOTTOM OF OVERWATCH */}
      <div className="pt-6 border-t border-white/10">
        <div className="bg-[#0B0709] border-2 border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
          <button
            type="button"
            onClick={() => setVaultExpanded((prev) => !prev)}
            className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-[#12080c] to-red-950/30 hover:from-red-950/60 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-red-300 tracking-wide">
                  🔐 Emergency Kill Switch Vault (Locked — Tap to Arm)
                </h3>
                <p className="text-[11px] text-gray-400">
                  Protected nuclear controls. Shielded from accidental scroll taps and requires 2-step confirmation.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {killSwitches.some((k) => k.active) && (
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase animate-pulse">
                  {killSwitches.filter((k) => k.active).length} ACTIVE
                </span>
              )}
              {vaultExpanded ? (
                <ChevronDown className="w-5 h-5 text-red-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-red-400" />
              )}
            </div>
          </button>

          {vaultExpanded && (
            <div className="p-5 border-t border-red-500/20 space-y-5">
              {!vaultUnlocked ? (
                <form
                  onSubmit={handleUnlockVault}
                  className="max-w-md mx-auto bg-black/70 border border-red-500/30 rounded-2xl p-5 text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto">
                    <KeyRound className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white uppercase tracking-wider">
                      Security Clearance Required
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Type <span className="text-red-400 font-mono font-bold">ARM</span> or your Admin PIN to unlock the Emergency Kill Switches.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Enter ARM or PIN..."
                      value={vaultPinInput}
                      onChange={(e) => setVaultPinInput(e.target.value)}
                      className="flex-1 bg-black border border-white/15 rounded-xl px-4 py-2.5 text-sm text-center font-mono text-white focus:border-red-500 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition"
                    >
                      Arm Vault
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-bold text-red-300 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      Vault Armed — Tapping any Kill Switch opens the mandatory 2-step confirmation modal.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVaultUnlocked(false)
                        setVaultPinInput('')
                      }}
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-200"
                    >
                      Re-Lock Vault
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {killSwitches.map((sw) => (
                      <div
                        key={sw.key}
                        className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                          sw.active
                            ? 'bg-red-950/40 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                            : 'bg-black/60 border-white/10 hover:border-red-500/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-black text-xs sm:text-sm text-white">
                              {sw.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                sw.active
                                  ? 'bg-red-500 text-white animate-pulse'
                                  : 'bg-white/10 text-gray-400'
                              }`}
                            >
                              {sw.active ? 'ACTIVE' : 'STANDBY'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            {sw.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmText('')
                            setPendingKillSwitch({
                              key: sw.key,
                              name: sw.name,
                              targetValue: !sw.active,
                              description: sw.description
                            })
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition min-h-[40px] ${
                            sw.active
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-red-600/25 hover:bg-red-600 border border-red-500/50 text-red-200 hover:text-white'
                          }`}
                        >
                          {sw.active
                            ? 'Deactivate & Restore Normal Operation'
                            : `Activate ${sw.name}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PHASE 2.2: MANDATORY 2-STEP CONFIRMATION MODAL BEFORE ANY KILL SWITCH TRIGGERS */}
      {pendingKillSwitch && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#120709] border-2 border-red-500 rounded-3xl p-6 shadow-[0_0_80px_rgba(239,68,68,0.4)] space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-red-500 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Mandatory 2-Step Verification
                </span>
                <h3 className="text-lg font-black text-white">CRITICAL CONFIRMATION</h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs sm:text-sm text-red-100 leading-relaxed font-semibold">
              ⚠️ CRITICAL CONFIRMATION: Are you 100% sure you want to{' '}
              {pendingKillSwitch.targetValue ? 'activate' : 'deactivate'}{' '}
              <span className="text-amber-300 font-black">[{pendingKillSwitch.name}]</span>? Type{' '}
              <span className="font-mono underline text-white">&apos;CONFIRM&apos;</span> or tap{' '}
              <span className="text-emerald-300 font-black">&apos;Yes, Execute Now&apos;</span> to apply across all users.
            </div>

            <div>
              <input
                type="text"
                placeholder="Optional: Type CONFIRM here..."
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-black/80 border border-red-500/40 rounded-xl px-4 py-3 text-sm font-mono text-center text-white focus:border-red-400 outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingKillSwitch(null)
                  setConfirmText('')
                }}
                disabled={executingSwitch}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedKillSwitch}
                disabled={executingSwitch}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/40"
              >
                {executingSwitch ? 'Executing...' : 'Yes, Execute Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    amber: 'from-amber-500/20 to-transparent border-amber-500/30 text-amber-400',
    emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30 text-emerald-400',
    red: 'from-red-500/20 to-transparent border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-transparent border-purple-500/30 text-purple-400'
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 bg-[#0D0D12]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
        <Icon className="w-4 h-4 shrink-0" />
      </div>
      <div className="text-lg sm:text-xl font-black text-white mb-0.5 break-words">{value}</div>
      <div className="text-[11px] text-gray-400 truncate">{sub}</div>
    </div>
  )
}

/* ============================================================================
   SHARED HELPER: 3-PILLAR PAYMENT & ACCESS STATUS MATRIX + 12 GRANT/REVOKE BUTTONS
   ============================================================================ */
function formatExpiryLabel(isoDate?: string | null): {
  text: string
  isExpired: boolean
  daysLeft: number
} {
  if (!isoDate) return { text: 'No Expiry Set', isExpired: false, daysLeft: 365 }
  const expMs = new Date(isoDate).getTime()
  if (isNaN(expMs)) return { text: 'Invalid Date', isExpired: false, daysLeft: 0 }
  const diff = expMs - Date.now()
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
  const formattedDate = new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  if (diff <= 0) {
    return { text: `EXPIRED (${formattedDate})`, isExpired: true, daysLeft: 0 }
  }
  return { text: `${daysLeft}d left (Exp: ${formattedDate})`, isExpired: false, daysLeft }
}

function ThreePillarMatrixAndControls({
  user,
  onExecutePillarAction,
  busyKey
}: {
  user: any
  onExecutePillarAction: (
    userId: string,
    email: string,
    pillarAction: string,
    label: string
  ) => Promise<void>
  busyKey: string | null
}) {
  const p1Paid = user.has_paid_global_chat === true || user.is_paid === true
  const p1TierRaw = String(user.subscription_tier || (p1Paid ? 'Free' : 'Unpaid'))
  const p1Exp = formatExpiryLabel(user.subscription_expires_at)

  const p2Exp = formatExpiryLabel(user.pillar2_expires_at)
  const p2Paid =
    (user.has_paid_pillar2 === true ||
      user.is_pillar2_paid === true ||
      user.pillar2_access === true) &&
    !p2Exp.isExpired
  const p2NeedsRenewal =
    (user.has_paid_pillar2 === true || user.is_pillar2_paid === true) && p2Exp.isExpired

  const p3Exp = formatExpiryLabel(user.pillar3_expires_at)
  const p3Paid =
    (user.has_paid_pillar3 === true ||
      user.is_pillar3_paid === true ||
      user.pillar3_access === true ||
      (user.pillar3_tier && user.pillar3_tier !== 'none' && user.pillar3_tier !== 'free')) &&
    !p3Exp.isExpired
  const p3TierRaw = String(user.pillar3_tier || (p3Paid ? 'pro' : 'none')).toUpperCase()

  const renderBtn = (pillarAction: string, label: string, styleClass: string) => {
    const isBusy = busyKey === `${user.id}:${pillarAction}`
    return (
      <button
        type="button"
        disabled={Boolean(busyKey)}
        onClick={() => onExecutePillarAction(user.id, user.email || '', pillarAction, label)}
        className={`px-2.5 py-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 text-center leading-tight min-h-[36px] disabled:opacity-50 ${styleClass}`}
      >
        {isBusy ? 'Applying...' : label}
      </button>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/10">
      {/* PILLAR 1 MATRIX & CONTROLS */}
      <div className="bg-black/50 border border-amber-500/25 rounded-xl p-3 flex flex-col justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Pillar 1 (Global Chat — GH₵ 50)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                p1Paid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {p1Paid ? '✅ PAID' : '❌ UNPAID'}
            </span>
          </div>
          <div className="text-[11px] text-gray-300 font-mono">
            Tier: <span className="text-white font-bold">{p1TierRaw}</span> •{' '}
            <span className={p1Exp.isExpired ? 'text-red-400' : 'text-gray-400'}>{p1Exp.text}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {renderBtn(
            'GRANT_P1_FREE',
            '✅ Grant P1 Free Pass (GH₵ 50)',
            'bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
          )}
          {renderBtn(
            'GRANT_P1_PRO_30D',
            '🚀 Grant P1 Pro (30d)',
            'bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
          )}
          {renderBtn(
            'GRANT_P1_PREMIUM_1YR',
            '👑 Grant P1 Premium (1Yr)',
            'bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
          )}
          {renderBtn(
            'REVOKE_P1',
            '🚫 Revoke P1 Access (Force Pay GH₵ 50 Again)',
            'bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300'
          )}
        </div>
      </div>

      {/* PILLAR 2 MATRIX & CONTROLS */}
      <div className="bg-black/50 border border-emerald-500/25 rounded-xl p-3 flex flex-col justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Pillar 2 (Affiliate — GH₵ 90/Yr)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                p2Paid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : p2NeedsRenewal
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {p2Paid ? '✅ PAID' : p2NeedsRenewal ? '⚠️ EXPIRED (GH₵ 45 RENEWAL)' : '❌ UNPAID'}
            </span>
          </div>
          <div className="text-[11px] text-gray-300 font-mono">
            365d License:{' '}
            <span className={p2Exp.isExpired ? 'text-red-400 font-bold' : 'text-emerald-300'}>
              {user.pillar2_expires_at ? p2Exp.text : p2Paid ? 'Active (365d)' : 'Not Licensed'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {renderBtn(
            'GRANT_P2_1YR',
            '✅ Grant P2 1-Yr License (GH₵ 90)',
            'bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
          )}
          {renderBtn(
            'EXTEND_P2_1YR',
            '➕ +1 Year Extension',
            'bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
          )}
          {renderBtn(
            'EXPIRE_P2_RENEWAL',
            '⚡ Force Expire to GH₵ 45 Renewal',
            'bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
          )}
          {renderBtn(
            'REVOKE_P2',
            '🚫 Revoke P2 Completely (Force Pay GH₵ 90 Again)',
            'bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300'
          )}
        </div>
      </div>

      {/* PILLAR 3 MATRIX & CONTROLS */}
      <div className="bg-black/50 border border-purple-500/25 rounded-xl p-3 flex flex-col justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
              Pillar 3 (HorPal AI — GH₵ 50/100/200)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                p3Paid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {p3Paid ? '✅ PAID' : '❌ UNPAID'}
            </span>
          </div>
          <div className="text-[11px] text-gray-300 font-mono">
            Tier: <span className="text-white font-bold">{p3TierRaw}</span> •{' '}
            <span className={p3Exp.isExpired ? 'text-red-400' : 'text-gray-400'}>
              {user.pillar3_expires_at ? p3Exp.text : p3Paid ? 'Active' : 'No Active Pass'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {renderBtn(
            'GRANT_P3_WEEKLY_7D',
            '⚡ Grant P3 Weekly (7d)',
            'bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
          )}
          {renderBtn(
            'GRANT_P3_PRO_30D',
            '🚀 Grant P3 Pro (30d)',
            'bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300'
          )}
          {renderBtn(
            'GRANT_P3_PREMIUM_1YR',
            '👑 Grant P3 Premium (1Yr)',
            'bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
          )}
          {renderBtn(
            'REVOKE_P3',
            '🚫 Revoke P3 Access (Force Pay Again)',
            'bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300'
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
   MODULE 2: USER VAULT SUPREME CONTROLS (#9–#20, #24, #26 + PHASE 7 MATRIX)
   ============================================================================ */
function UserVaultModule({
  apiFetch,
  onGlobalRefresh
}: {
  apiFetch: any
  onGlobalRefresh: () => void
}) {
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [generatedLinkModal, setGeneratedLinkModal] = useState<{
    email: string
    link: string
  } | null>(null)
  const [courseGrantUser, setCourseGrantUser] = useState<any | null>(null)
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState<string>('prod_faceless_ai')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('FETCH_USERS_VAULT', { search, filter })
      setUsers(data.users || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, search, filter])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.products) && d.products.length > 0) {
          setProducts(d.products)
          setSelectedCourseToGrant(d.products[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const handleExecutePillarAction = async (
    userId: string,
    email: string,
    pillarAction: string,
    label: string
  ) => {
    setBusyKey(`${userId}:${pillarAction}`)
    try {
      const res = await apiFetch('ADMIN_SET_PILLAR_ACCESS', {
        userId,
        email,
        pillarAction
      })
      if (res?.profile) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.profile } : u)))
      } else {
        await loadUsers()
      }
      toast.success(`${label} applied in real time!`)
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  // #10 & #11: Direct Coin & Affiliate Balance Editor (+ / - / Set Exact)
  const handleQuickBalanceEdit = async (
    u: any,
    targetField: 'coins' | 'ghs',
    mode: 'add' | 'deduct' | 'set'
  ) => {
    const label =
      targetField === 'coins'
        ? mode === 'set'
          ? 'Enter EXACT Coin balance to set:'
          : `Enter Coins to ${mode === 'add' ? 'ADD (+)' : 'DEDUCT (-)'}:`
        : mode === 'set'
        ? 'Enter EXACT P2 Affiliate Balance (GH₵) to set:'
        : `Enter GH₵ amount to ${mode === 'add' ? 'ADD (+)' : 'DEDUCT (-)'}:`
    const valStr = prompt(label, targetField === 'coins' ? '100' : '50')
    if (valStr === null) return
    const amount = Number(valStr)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Please enter a valid number >= 0')
      return
    }
    try {
      const res = await apiFetch('ADJUST_USER_COINS_OR_GHS', {
        userId: u.id,
        targetField,
        mode,
        amount
      })
      if (res?.user) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, ...res.user } : item)))
      }
      toast.success(`Updated @${u.username || u.email}'s ${targetField.toUpperCase()} live!`)
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Generic toggle helper for #12, #13, #15, #16, #17, #24, #26
  const handleUpdateUserField = async (u: any, updates: Record<string, any>, successMsg: string) => {
    try {
      const res = await apiFetch('UPDATE_USER_GODMODE', {
        userId: u.id,
        updates
      })
      if (res?.user) {
        setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, ...res.user } : item)))
      }
      toast.success(successMsg)
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // #18 Force Logout Everywhere
  const handleForceLogout = async (u: any) => {
    try {
      await apiFetch('FORCE_LOGOUT_USER', { userId: u.id })
      toast.success(`@${u.username || u.email}'s session invalidated across all devices!`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // #19 Magic Access / Password Recovery Link Generator
  const handleGenerateMagicLink = async (u: any, linkType: 'magiclink' | 'recovery') => {
    if (!u.email) {
      toast.error('User has no email on record')
      return
    }
    try {
      const res = await apiFetch('GENERATE_MAGIC_RECOVERY_LINK', {
        email: u.email,
        linkType
      })
      if (res?.actionLink) {
        setGeneratedLinkModal({ email: u.email, link: res.actionLink })
        toast.success(`Generated ${linkType} link for ${u.email}!`)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // #20 Hard Delete / Purge Test Account
  const handleTerminate = async (userId: string, username: string) => {
    if (!confirm(`☢️ NUCLEAR WARNING: Permanently purge @${username} and wipe their account?`))
      return
    try {
      await apiFetch('TERMINATE_USER_ACCOUNT', { userId })
      toast.success(`@${username} has been permanently purged.`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            USER VAULT SUPREME CONTROLS ({users.length})
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Instant search/filter, + / - / Set Coins & GH₵, Wallet Freeze, Verified Tick, Course Unlock, Exam Certificate, VIP Commission Rate, Magic Link, & 3-Pillar Matrix.
          </p>
        </div>

        {/* #9 Instant Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search @username, email, affiliate_code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D0D12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-amber-500 outline-none min-h-[42px]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#0D0D12] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none min-h-[42px]"
          >
            <option value="ALL">All Citizens</option>
            <option value="P1_PAID">P1 Paid</option>
            <option value="P2_PAID">P2 Paid</option>
            <option value="P3_PAID">P3 Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="FROZEN">Frozen Wallets</option>
            <option value="BANNED">Banned / Suspended</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Loading User Vault...</div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center text-gray-500 text-sm bg-[#0D0D12] border border-white/10 rounded-2xl">
          No matching user accounts found.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const coinsVal = Math.max(Number(u.coins || 0), Number(u.coin_balance || 0))
            const ghsVal = Math.max(
              Number(u.affiliate_balance || 0),
              Number(u.available_balance_ghs || 0),
              Number(u.affiliate_Available_Balance || 0)
            )
            const commRate = Math.round(Number(u.custom_commission_rate || 0.5) * 100)
            const isShadowMuted =
              u.shadow_muted_until && new Date(u.shadow_muted_until).getTime() > Date.now()

            return (
              <div
                key={u.id}
                className={`bg-[#0D0D12] border rounded-2xl p-4 sm:p-5 transition space-y-3 ${
                  u.is_banned || u.is_suspended
                    ? 'border-red-500/60 bg-red-950/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <img
                      src={
                        u.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          u.full_name || u.username || 'U'
                        )}&background=random`
                      }
                      className="w-12 h-12 rounded-2xl object-cover border border-white/15 shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-black text-white text-sm sm:text-base truncate">
                          {u.full_name || 'Citizen'}
                        </span>
                        <span className="text-xs text-amber-400 font-mono">
                          @{u.username || 'user'}
                        </span>
                        {u.is_verified && (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black">
                            ✓ VERIFIED TICK
                          </span>
                        )}
                        {u.is_wallet_frozen && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black">
                            ❄️ WALLET FROZEN
                          </span>
                        )}
                        {u.has_p2_exam_certificate && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                            🎓 P2 CERTIFIED
                          </span>
                        )}
                        {u.is_pinned_explore && (
                          <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-black">
                            📌 EXPLORE PINNED
                          </span>
                        )}
                        {(u.is_banned || u.is_suspended) && (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase">
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono break-all mt-0.5">
                        {u.email || 'No email'} • Affiliate Code:{' '}
                        <span className="text-emerald-400">{u.affiliate_code || 'N/A'}</span> •
                        Commission: <span className="text-amber-300 font-bold">{commRate}%</span>
                      </div>

                      {/* #10 & #11 Live Coin & Affiliate Balance Bar with + / - / Set Exact */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-black/60 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs">
                          <span className="text-amber-300 font-mono font-black">
                            🪙 {coinsVal.toLocaleString()} Coins
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'coins', 'add')}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px]"
                          >
                            + Coins
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'coins', 'deduct')}
                            className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-[10px]"
                          >
                            - Coins
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'coins', 'set')}
                            className="px-1.5 py-0.5 rounded bg-white/10 text-gray-200 font-black text-[10px]"
                          >
                            Set Exact
                          </button>
                        </div>

                        <div className="flex items-center gap-1 bg-black/60 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-xs">
                          <span className="text-emerald-400 font-mono font-black">
                            💼 GH₵ {ghsVal.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'ghs', 'add')}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px]"
                          >
                            + GH₵
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'ghs', 'deduct')}
                            className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-[10px]"
                          >
                            - GH₵
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickBalanceEdit(u, 'ghs', 'set')}
                            className="px-1.5 py-0.5 rounded bg-white/10 text-gray-200 font-black text-[10px]"
                          >
                            Set Exact
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUPREME PER-USER ACTION TOOLBAR (#12–#20, #24, #26) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* #12 Freeze/Unfreeze Wallet */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          { is_wallet_frozen: !u.is_wallet_frozen },
                          u.is_wallet_frozen ? 'Wallet unfrozen!' : 'Wallet frozen!'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-[11px] font-bold"
                    >
                      {u.is_wallet_frozen ? '🔓 Unfreeze Wallet' : '❄️ Freeze Wallet'}
                    </button>

                    {/* #13 Verified Tick Badge */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          { is_verified: !u.is_verified },
                          u.is_verified ? 'Verified tick revoked' : 'Verified badge granted!'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold"
                    >
                      {u.is_verified ? 'Revoke Tick' : '✓ Grant Verified'}
                    </button>

                    {/* #14 Unlock Any P2 Course */}
                    <button
                      type="button"
                      onClick={() => setCourseGrantUser(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold"
                    >
                      📚 Unlock P2 Course
                    </button>

                    {/* #15 Force-Issue or Revoke P2 Certificate */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          {
                            has_p2_exam_certificate: !u.has_p2_exam_certificate,
                            p2_certificate_issued_at: !u.has_p2_exam_certificate
                              ? new Date().toISOString()
                              : null
                          },
                          !u.has_p2_exam_certificate
                            ? 'Pillar 2 Exam Certificate of Distinction Issued!'
                            : 'Pillar 2 Certificate Revoked'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-bold"
                    >
                      {u.has_p2_exam_certificate ? 'Revoke Cert' : '🎓 Issue P2 Cert'}
                    </button>

                    {/* #16 Custom Commission Rate Override (50% / 60% / 70%) */}
                    <select
                      value={String(u.custom_commission_rate || 0.5)}
                      onChange={(e) =>
                        handleUpdateUserField(
                          u,
                          { custom_commission_rate: Number(e.target.value) },
                          `VIP Commission Rate set to ${Math.round(Number(e.target.value) * 100)}%!`
                        )
                      }
                      className="bg-black border border-amber-500/40 rounded-lg px-2 py-1.5 text-[11px] font-bold text-amber-300"
                    >
                      <option value="0.5">50% Comm</option>
                      <option value="0.6">60% VIP Comm</option>
                      <option value="0.7">70% Elite Comm</option>
                    </select>

                    {/* #17 Shadow-Mute 24h */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          {
                            shadow_muted_until: isShadowMuted
                              ? null
                              : new Date(Date.now() + 24 * 3600 * 1000).toISOString()
                          },
                          isShadowMuted ? 'User unmuted in Global Chat' : 'Shadow-muted for 24h!'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-[11px] font-bold"
                    >
                      {isShadowMuted ? '🔊 Unmute Chat' : '🔇 Mute 24h'}
                    </button>

                    {/* #24 Pin to Explore */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          { is_pinned_explore: !u.is_pinned_explore },
                          !u.is_pinned_explore
                            ? 'Pinned to top of Pillar 1 Explore!'
                            : 'Unpinned from Explore'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 text-[11px] font-bold"
                    >
                      {u.is_pinned_explore ? '📌 Unpin Explore' : '📌 Pin Explore'}
                    </button>

                    {/* #26 Hide from Spatial Radar */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          { hide_from_radar: !u.hide_from_radar },
                          !u.hide_from_radar ? 'Hidden from Spatial Radar' : 'Visible on Radar'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-[11px] font-bold"
                    >
                      {u.hide_from_radar ? '👁️ Show on Radar' : '🙈 Hide Radar'}
                    </button>

                    {/* #18 Force Logout Session */}
                    <button
                      type="button"
                      onClick={() => handleForceLogout(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-[11px] font-bold"
                    >
                      🚪 Kick Session
                    </button>

                    {/* #19 Magic Access / Recovery Link */}
                    <button
                      type="button"
                      onClick={() => handleGenerateMagicLink(u, 'magiclink')}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold"
                    >
                      🔗 Magic Link
                    </button>

                    {/* Ban / Unban */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUserField(
                          u,
                          {
                            is_banned: !u.is_banned,
                            is_suspended: !u.is_banned,
                            status: !u.is_banned ? 'banned' : 'active'
                          },
                          !u.is_banned
                            ? `@${u.username || u.email} BANNED & kicked!`
                            : `@${u.username || u.email} unbanned!`
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[11px] font-black"
                    >
                      {u.is_banned || u.is_suspended ? 'Unban' : '🚫 Ban'}
                    </button>

                    {/* #20 Hard Delete */}
                    <button
                      type="button"
                      onClick={() => handleTerminate(u.id, u.username || u.email)}
                      className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white transition"
                      title="Hard Delete / Purge Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PHASE 7: 3-PILLAR MATRIX & 1-CLICK GRANT/REVOKE BUTTONS */}
                <ThreePillarMatrixAndControls
                  user={u}
                  onExecutePillarAction={handleExecutePillarAction}
                  busyKey={busyKey}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* #14 GRANT / UNLOCK PILLAR 2 COURSE MODAL */}
      {courseGrantUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0D0D12] border border-emerald-500/40 rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-base text-emerald-400">
              📚 Unlock Pillar 2 Course for @{courseGrantUser.username || courseGrantUser.email}
            </h3>
            <p className="text-xs text-gray-400">
              Currently Unlocked:{' '}
              {Array.isArray(courseGrantUser.unlocked_p2_courses) &&
              courseGrantUser.unlocked_p2_courses.length > 0
                ? courseGrantUser.unlocked_p2_courses.join(', ')
                : 'None'}
            </p>
            <select
              value={selectedCourseToGrant}
              onChange={(e) => setSelectedCourseToGrant(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (GH₵ {p.price_ghs})
                </option>
              ))}
            </select>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCourseGrantUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await apiFetch('GRANT_USER_P2_COURSE', {
                      userId: courseGrantUser.id,
                      courseId: selectedCourseToGrant
                    })
                    if (res?.user) {
                      setUsers((prev) =>
                        prev.map((u) => (u.id === courseGrantUser.id ? { ...u, ...res.user } : u))
                      )
                    }
                    toast.success(`Course unlocked in user's vault!`)
                    setCourseGrantUser(null)
                  } catch (err: any) {
                    toast.error(err.message)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase"
              >
                Unlock Course Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* #19 MAGIC ACCESS / RECOVERY LINK MODAL */}
      {generatedLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#0D0D12] border border-indigo-500/40 rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-base text-indigo-400">
              🔗 Direct Magic Access / Recovery Link for {generatedLinkModal.email}
            </h3>
            <input
              type="text"
              readOnly
              value={generatedLinkModal.link}
              className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-200"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedLinkModal.link)
                  toast.success('Copied magic login link to clipboard!')
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white font-black text-xs uppercase"
              >
                Copy Link to Send to User
              </button>
              <button
                type="button"
                onClick={() => setGeneratedLinkModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   MODULE 3: DIRECT PAYOUTS DESK (NO OTP BLOCK!) + PAYSTACK LEDGER + MANUAL SALE (#2, #23, #27, #28)
   ============================================================================ */
function TreasuryModule({
  apiFetch,
  onGlobalRefresh
}: {
  apiFetch: any
  onGlobalRefresh: () => void
}) {
  const [data, setData] = useState<any>({
    p2Payouts: [],
    p1Payouts: [],
    paystackLedger: []
  })
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({})

  // #28 Manual Sale & 50% Commission Credit Tool state
  const [saleProductId, setSaleProductId] = useState('prod_faceless_ai')
  const [saleAffiliateCode, setSaleAffiliateCode] = useState('')
  const [saleBuyerEmail, setSaleBuyerEmail] = useState('')
  const [recordingSale, setRecordingSale] = useState(false)

  const loadTreasury = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('FETCH_TREASURY_DATA')
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadTreasury()
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.products) && d.products.length > 0) {
          setProducts(d.products)
          setSaleProductId(d.products[0].id)
        }
      })
      .catch(() => {})
  }, [loadTreasury])

  // #27 Direct Payouts Desk 1-click handler for Pillar 2
  const handleP2PayoutAction = async (
    requestId: string,
    status: 'processing' | 'paid' | 'rejected'
  ) => {
    try {
      const note =
        customNotes[requestId] ||
        (status === 'processing'
          ? '⏳ Processing settlement transfer...'
          : status === 'paid'
          ? '✅ Paid & Settled by Admin Treasury'
          : '❌ Declined & Refunded to Available Balance')
      await apiFetch('UPDATE_P2_PAYOUT_STATUS', {
        requestId,
        status,
        adminNote: note
      })
      toast.success(`Pillar 2 Payout marked as "${status.toUpperCase()}" live!`)
      void loadTreasury()
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // #23 Pillar 1 Coin Cashout handler
  const handleP1PayoutAction = async (
    payoutId: string,
    decision: 'PROCESSING' | 'APPROVED' | 'REJECTED_REFUND'
  ) => {
    try {
      await apiFetch('PROCESS_PAYOUT_DECISION', {
        payoutId,
        decision,
        adminNotes: customNotes[payoutId] || `Updated by Admin (${decision})`,
        sourceTable: 'payout_requests'
      })
      toast.success(`Pillar 1 Cashout updated (${decision})!`)
      void loadTreasury()
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // #28 Record Manual Verified Sale & Credit 50% Commission
  const handleRecordManualSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleBuyerEmail.trim()) return
    setRecordingSale(true)
    try {
      const res = await apiFetch('RECORD_MANUAL_P2_SALE', {
        productId: saleProductId,
        affiliateCodeOrEmail: saleAffiliateCode.trim(),
        buyerEmail: saleBuyerEmail.trim()
      })
      toast.success(
        `Sale recorded! Credited GH₵ ${res.commissionGhs} to ${res.affiliateCredited} & unlocked ${res.productTitle} for ${res.buyerEmail}!`
      )
      setSaleBuyerEmail('')
      setSaleAffiliateCode('')
      void loadTreasury()
      onGlobalRefresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRecordingSale(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            DIRECT PAYOUTS DESK & PAYSTACK TREASURY (NO OTP BLOCK)
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Instant access to all Pillar 2 & Pillar 1 payout requests, 1-click MoMo/Bank number copy, manual sale crediting, and live Paystack ledger.
          </p>
        </div>
        <button
          onClick={loadTreasury}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Refresh Desk
        </button>
      </div>

      {/* #28 MANUAL SALE & 50% COMMISSION CREDIT TOOL */}
      <form
        onSubmit={handleRecordManualSale}
        className="bg-[#0D0D12] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3"
      >
        <h3 className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" /> Manual Sale & 50% Commission Credit Tool
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={saleProductId}
            onChange={(e) => setSaleProductId(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (GH₵ {p.price_ghs})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Referring Affiliate Code or Email (e.g. HP-XXXX)"
            value={saleAffiliateCode}
            onChange={(e) => setSaleAffiliateCode(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
          />
          <input
            type="email"
            required
            placeholder="Buyer Email (Unlocks Course + P2 Pass)"
            value={saleBuyerEmail}
            onChange={(e) => setSaleBuyerEmail(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
          />
        </div>
        <button
          type="submit"
          disabled={recordingSale}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider"
        >
          {recordingSale
            ? 'Recording Sale & Crediting...'
            : 'Record Verified Sale & Credit 50% Commission'}
        </button>
      </form>

      {/* #27 DIRECT PILLAR 2 PAYOUTS DESK (IMMEDIATE VIEW — NO OTP BLOCK!) */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-400">
            Pillar 2 Affiliate Payout Requests ({data.p2Payouts?.length || 0})
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-xs">Loading Payout Requests...</div>
          ) : (data.p2Payouts || []).length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No Pillar 2 payout requests found.
            </div>
          ) : (
            (data.p2Payouts || []).map((req: any) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black font-mono text-emerald-400">
                      GH₵ {Number(req.amount_ghs || 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {req.affiliate_name || 'Affiliate'} ({req.affiliate_email})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        req.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : req.status === 'processing'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : req.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {req.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-mono">
                    <span>
                      {req.payout_method} • {req.bank_or_network || ''} •{' '}
                      <strong className="text-white">{req.account_number}</strong> (
                      {req.account_name})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(req.account_number || ''))
                        toast.success(`Copied ${req.account_number} to clipboard!`)
                      }}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy MoMo/Bank Number
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Requested: {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Custom Admin Note..."
                    value={customNotes[req.id] || ''}
                    onChange={(e) =>
                      setCustomNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    className="bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleP2PayoutAction(req.id, 'processing')}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-black whitespace-nowrap"
                  >
                    ⏳ Set to &quot;Processing...&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleP2PayoutAction(req.id, 'paid')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-[11px] font-black whitespace-nowrap"
                  >
                    ✅ Mark as &quot;Paid & Settled&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleP2PayoutAction(req.id, 'rejected')}
                    className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[11px] font-black whitespace-nowrap"
                  >
                    ❌ Reject & Refund Balance
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* #23 PILLAR 1 COIN CASHOUT DESK */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-amber-400">
            Pillar 1 Coin-to-Cash Withdrawal Desk ({data.p1Payouts?.length || 0})
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {(data.p1Payouts || []).length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs">
              No Pillar 1 Coin cashout requests in queue.
            </div>
          ) : (
            (data.p1Payouts || []).map((p: any) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono font-black text-amber-400 text-sm">
                    GH₵ {Number(p.amount_ghs || p.amount || 0).toFixed(2)} • Status:{' '}
                    <span className="uppercase text-white">{p.status || 'pending'}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {p.payout_method || p.network || 'MoMo/Bank'} •{' '}
                    {p.account_number || p.phone_number || 'N/A'} ({p.account_name || 'User'})
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleP1PayoutAction(p.id, 'PROCESSING')}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[11px] font-bold"
                  >
                    ⏳ Processing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleP1PayoutAction(p.id, 'APPROVED')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold"
                  >
                    ✅ Mark Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleP1PayoutAction(p.id, 'REJECTED_REFUND')}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[11px] font-bold"
                  >
                    ❌ Reject & Refund
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* #2 LIVE PAYSTACK TRANSACTION LEDGER */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-cyan-400">
            Live Verified Paystack Transaction Ledger ({data.paystackLedger?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500 bg-black/40">
                <th className="p-3">Pillar</th>
                <th className="p-3">Type</th>
                <th className="p-3">Buyer Email</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Paystack Reference</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(data.paystackLedger || []).map((row: any) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-bold text-white">{row.pillar}</td>
                  <td className="p-3 text-gray-300">{row.type}</td>
                  <td className="p-3 font-mono text-amber-300">{row.email}</td>
                  <td className="p-3 font-mono font-black text-emerald-400">
                    GH₵ {Number(row.amount_ghs || 0).toFixed(2)}
                  </td>
                  <td className="p-3 font-mono text-gray-400">{row.reference}</td>
                  <td className="p-3 font-mono text-gray-500">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
   MODULE 4: PHASE 4 LIVE RADAR SURVEILLANCE (REAL-TIME STREAMS + GHOST WATCH)
   ============================================================================ */
function LiveRadarModule({ apiFetch }: { apiFetch: any }) {
  const [streams, setStreams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nowMs, setNowMs] = useState<number>(Date.now())
  const [ghostWatchSession, setGhostWatchSession] = useState<{
    roomName: string
    hostUsername: string
    token: string
    wsUrl: string
  } | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  const livekitRoomRef = useRef<Room | null>(null)
  const supabase = createClient()

  const loadStreams = useCallback(async () => {
    try {
      const res = await apiFetch('FETCH_ACTIVE_STREAMS')
      setStreams(res.streams || [])
    } catch (err: any) {
      console.error('Live radar error:', err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadStreams()
    const clockInterval = setInterval(() => setNowMs(Date.now()), 1000)
    const pollInterval = setInterval(() => void loadStreams(), 5000)

    const channel = supabase
      .channel('admin_live_radar_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_live_streams' },
        () => void loadStreams()
      )
      .subscribe()

    return () => {
      clearInterval(clockInterval)
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [loadStreams, supabase])

  useEffect(() => {
    if (!ghostWatchSession) {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect()
        livekitRoomRef.current = null
      }
      return
    }

    const room = new Room({ adaptiveStream: true, dynacast: true })
    livekitRoomRef.current = room

    const attachTrack = (track: Track) => {
      if (!videoContainerRef.current) return
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        const element = track.attach()
        if (track.kind === Track.Kind.Video) {
          element.className = 'w-full h-full object-contain rounded-xl bg-black'
          videoContainerRef.current.innerHTML = ''
          videoContainerRef.current.appendChild(element)
        } else {
          videoContainerRef.current.appendChild(element)
        }
      }
    }

    room.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track))

    room
      .connect(ghostWatchSession.wsUrl, ghostWatchSession.token)
      .then(() => {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track)
          })
        })
      })
      .catch((err) => toast.error(`Ghost Watch error: ${err.message}`))

    return () => {
      room.disconnect()
      livekitRoomRef.current = null
    }
  }, [ghostWatchSession])

  const formatDuration = (startedAt?: string) => {
    if (!startedAt) return '00:00'
    const diffSec = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000))
    const hrs = Math.floor(diffSec / 3600)
    const mins = Math.floor((diffSec % 3600) / 60)
    const secs = diffSec % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`
  }

  const handleGhostWatch = async (stream: any) => {
    try {
      const res = await apiFetch('GHOST_WATCH_TOKEN', { roomName: stream.room_name })
      if (!res?.token || !res?.wsUrl) throw new Error('LiveKit credentials missing')
      setGhostWatchSession({
        roomName: stream.room_name,
        hostUsername: stream.host_username || 'Host',
        token: res.token,
        wsUrl: res.wsUrl
      })
      toast.success(`Joined @${stream.host_username}'s stream as an invisible Ghost Observer!`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleBeamWarning = async (stream: any) => {
    const warning = prompt(
      `⚠️ Enter warning message to beam across @${stream.host_username}'s live screen:`,
      '⚠️ ADMIN WARNING: Please adhere to Earnmega Live Community Guidelines or your stream will be terminated.'
    )
    if (!warning) return
    try {
      await apiFetch('BEAM_STREAMER_WARNING', {
        streamId: stream.id,
        roomName: stream.room_name,
        hostUserId: stream.host_user_id,
        message: warning
      })
      toast.success(`Warning beamed directly across @${stream.host_username}'s screen!`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleForceTerminate = async (stream: any) => {
    if (
      !confirm(
        `🛑 FORCE TERMINATE STREAM: Immediately shut down @${stream.host_username}'s camera/broadcast and close the room for all viewers?`
      )
    )
      return
    try {
      await apiFetch('FORCE_TERMINATE_STREAM', {
        streamId: stream.id,
        roomName: stream.room_name,
        hostUserId: stream.host_user_id,
        reason: 'Terminated by Supreme Administrator'
      })
      toast.success(`@${stream.host_username}'s live broadcast has been terminated!`)
      void loadStreams()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            LIVE RADAR SURVEILLANCE
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Real-time detection of every active broadcast from any phone or device in Pillar 1 LiveArena.
          </p>
        </div>
        <button
          onClick={loadStreams}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-2 self-start"
        >
          <RefreshCw className="w-4 h-4 text-amber-400" /> Scan Radar Now
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-[#0D0D12] border border-white/10 rounded-2xl">
          Scanning LiveKit & Supabase frequencies...
        </div>
      ) : streams.length === 0 ? (
        <div className="bg-[#0D0D12] border border-white/10 rounded-2xl p-12 text-center">
          <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-gray-300">No Active Live Broadcasts Right Now</h3>
          <p className="text-xs text-gray-500 mt-1">
            The exact moment any user goes live on any device in Pillar 1, their stream card will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams.map((s) => (
            <div
              key={s.id || s.room_name}
              className="bg-[#0D0D12] border-2 border-red-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_0_35px_rgba(239,68,68,0.12)]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        s.host_avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          s.host_username || 'Host'
                        )}&background=random`
                      }
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-red-500 shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <div className="font-black text-white text-sm sm:text-base truncate">
                        {s.stream_title || `${s.host_username}'s Live Stream`}
                      </div>
                      <div className="text-xs text-amber-400 font-mono truncate">
                        @{s.host_username} • {s.host_email || 'Verified Host'}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono truncate">
                        Room: {s.room_name}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    LIVE • {formatDuration(s.started_at)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="bg-black/50 rounded-xl px-3 py-2 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Active Viewers
                    </span>
                    <span className="text-white font-black font-mono text-sm">
                      👁️ {s.viewer_count ?? 1} Watching
                    </span>
                  </div>
                  <div className="bg-black/50 rounded-xl px-3 py-2 border border-white/5">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Coins Earned
                    </span>
                    <span className="text-amber-400 font-black font-mono text-sm">
                      🪙 {(s.coins_earned ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleGhostWatch(s)}
                  className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs transition flex items-center justify-center gap-1.5"
                >
                  👁️ Ghost Watch Stream
                </button>
                <button
                  type="button"
                  onClick={() => handleBeamWarning(s)}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs transition flex items-center justify-center gap-1.5"
                >
                  ⚠️ Beam Streamer Warning
                </button>
                <button
                  type="button"
                  onClick={() => handleForceTerminate(s)}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30"
                >
                  🛑 Force Terminate Stream
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ghostWatchSession && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0D0D12] border-2 border-cyan-500/50 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase">
                  👁️ Ghost Observer Mode (Invisible to Host & Viewers)
                </span>
                <span className="text-sm font-black text-white">
                  @{ghostWatchSession.hostUsername}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGhostWatchSession(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
              >
                Close Stream
              </button>
            </div>
            <div
              ref={videoContainerRef}
              className="w-full aspect-video bg-black flex flex-col items-center justify-center text-gray-400 text-xs p-4"
            >
              <Video className="w-10 h-10 text-cyan-400 animate-pulse mb-2" />
              <span>
                Connecting invisible LiveKit observer feed for {ghostWatchSession.roomName}...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   MODULE 5: PHASE 5 GROUP CHAT LOCKING & MANAGEMENT + #25 OFFICIAL GROUP CREATOR
   ============================================================================ */
function GroupCommandModule({ apiFetch }: { apiFetch: any }) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inspectGroup, setInspectGroup] = useState<any | null>(null)
  const [inspectMessages, setInspectMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // #25 Admin Official Group Creator state
  const [officialName, setOfficialName] = useState('')
  const [officialDesc, setOfficialDesc] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('FETCH_GROUPS')
      setGroups(res.groups || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  const handleCreateOfficialGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!officialName.trim()) return
    setCreatingGroup(true)
    try {
      await apiFetch('CREATE_OFFICIAL_GROUP', {
        name: officialName.trim(),
        description: officialDesc.trim()
      })
      toast.success(`👑 Official Group "${officialName}" created!`)
      setOfficialName('')
      setOfficialDesc('')
      void loadGroups()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleToggleLock = async (g: any) => {
    const nextLock = !g.is_locked
    try {
      await apiFetch('TOGGLE_GROUP_LOCK', {
        groupId: g.id,
        isLocked: nextLock,
        lockedReason: nextLock
          ? '🔒 This group chat has been locked by the Administrator. Only Admins can post right now.'
          : null
      })
      setGroups((prev) =>
        prev.map((item) => (item.id === g.id ? { ...item, is_locked: nextLock } : item))
      )
      toast.success(
        nextLock
          ? `🔒 "${g.name || g.title}" is now LOCKED in Pillar 1 Global Chat!`
          : `🔓 "${g.name || g.title}" is now UNLOCKED!`
      )
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteGroup = async (g: any) => {
    if (!confirm(`🗑️ Delete group "${g.name || g.title}" and all its messages permanently?`))
      return
    try {
      await apiFetch('DELETE_GROUP', { groupId: g.id })
      setGroups((prev) => prev.filter((item) => item.id !== g.id))
      toast.success('Group deleted permanently.')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleClearGroupMessages = async (g: any) => {
    if (!confirm(`🧹 Clear ALL messages inside "${g.name || g.title}"?`)) return
    try {
      await apiFetch('CLEAR_GROUP_MESSAGES', { groupId: g.id })
      toast.success(`All messages cleared in "${g.name || g.title}"!`)
      if (inspectGroup?.id === g.id) setInspectMessages([])
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleInspectGroup = async (g: any) => {
    setInspectGroup(g)
    setLoadingMessages(true)
    try {
      const res = await apiFetch('INSPECT_GROUP_MESSAGES', { groupId: g.id })
      setInspectMessages(res.messages || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleDeleteSingleMessage = async (msgId: string) => {
    try {
      await apiFetch('DELETE_SINGLE_GROUP_MESSAGE', { messageId: msgId })
      setInspectMessages((prev) => prev.filter((m) => m.id !== msgId))
      toast.success('Message deleted.')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">GROUP CHAT COMMAND</h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Create official groups, lock/unlock group chats in real time, inspect messages, clear history, or delete groups.
          </p>
        </div>
        <button
          onClick={loadGroups}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Refresh
        </button>
      </div>

      {/* #25 ADMIN OFFICIAL GROUP CREATOR */}
      <form
        onSubmit={handleCreateOfficialGroup}
        className="bg-[#0D0D12] border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <input
          type="text"
          required
          placeholder="👑 Official Group Name (e.g. Earnmega VIP Announcements)"
          value={officialName}
          onChange={(e) => setOfficialName(e.target.value)}
          className="flex-1 bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
        />
        <input
          type="text"
          placeholder="Group description..."
          value={officialDesc}
          onChange={(e) => setOfficialDesc(e.target.value)}
          className="flex-1 bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
        />
        <button
          type="submit"
          disabled={creatingGroup}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase whitespace-nowrap"
        >
          {creatingGroup ? 'Creating...' : '+ Create 👑 OFFICIAL Group'}
        </button>
      </form>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading Groups...</div>
      ) : groups.length === 0 ? (
        <div className="bg-[#0D0D12] border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          No community groups found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => {
            const isLocked = Boolean(g.is_locked)
            return (
              <div
                key={g.id}
                className={`bg-[#0D0D12] border rounded-2xl p-5 flex flex-col justify-between gap-4 transition ${
                  isLocked ? 'border-red-500/60 bg-red-950/10' : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-black text-white text-base truncate">
                        {g.name || g.title || 'Unnamed Group'}
                      </h4>
                      {g.is_official && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black shrink-0">
                          👑 OFFICIAL
                        </span>
                      )}
                    </div>
                    {isLocked ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                        LOCKED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase shrink-0">
                        OPEN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {g.description || 'Pillar 1 Global Chat Community Group'}
                  </p>
                  <div className="text-[11px] font-mono text-amber-400">
                    Creator: @{g.creator_username || 'Admin'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleLock(g)}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 ${
                      isLocked
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {isLocked ? '🔓 Unlock Chat' : '🔒 Lock Chat'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInspectGroup(g)}
                    className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs transition flex items-center justify-center gap-1.5"
                  >
                    👁️ Inspect Group Messages
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClearGroupMessages(g)}
                    className="py-2.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-black text-xs transition flex items-center justify-center gap-1.5"
                  >
                    🧹 Clear All Group Messages
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(g)}
                    className="py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-xs transition flex items-center justify-center gap-1.5"
                  >
                    🗑️ Delete Group
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inspectGroup && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0D0D12] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-base">
                  👁️ Inspecting: {inspectGroup.name || inspectGroup.title}
                </h3>
                <p className="text-xs text-gray-400">
                  Showing latest {inspectMessages.length} messages in this group
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectGroup(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {loadingMessages ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  Loading group messages...
                </div>
              ) : inspectMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No messages found in this group.
                </div>
              ) : (
                inspectMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-amber-400">
                          {m.sender_username || m.sender_name || 'Member'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 mt-1 break-words">
                        {m.content || m.text || '[Media / Voice Attachment]'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleMessage(m.id)}
                      className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400 shrink-0"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   MODULE 6: PHASE 6 WHITELIST / MARKETPLACE PRODUCTS (ALL 9 PRODUCTS + LIVE SYNC)
   ============================================================================ */
function WhitelistModule({ apiFetch }: { apiFetch: any }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)

  const [newProd, setNewProd] = useState({
    title: '',
    price_ghs: '150',
    creator_name: 'Gerald',
    category: 'Digital Mastery',
    description: '',
    cover_image_url:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
    drive_delivery_url: ''
  })

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products?includeInactive=true', {
        headers: { 'x-admin-command-key': ADMIN_COMMAND_KEY },
        cache: 'no-store'
      })
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProd.title.trim() || !newProd.drive_delivery_url.trim()) {
      toast.error('Please enter both a Product Title and a Google Drive Delivery URL.')
      return
    }
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-command-key': ADMIN_COMMAND_KEY
        },
        body: JSON.stringify({
          title: newProd.title.trim(),
          price_ghs: Number(newProd.price_ghs || 100),
          creator_name: newProd.creator_name.trim() || 'Gerald',
          category: newProd.category.trim() || 'Digital Mastery',
          description:
            newProd.description.trim() ||
            'Comprehensive digital mastery program with instant Google Drive Vault delivery.',
          cover_image_url:
            newProd.cover_image_url.trim() ||
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
          drive_delivery_url: newProd.drive_delivery_url.trim(),
          commission_rate: 0.5
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish product')
      toast.success('Product published to Pillar 2 Marketplace with 50% Affiliate Split!')
      setNewProd({
        title: '',
        price_ghs: '150',
        creator_name: 'Gerald',
        category: 'Digital Mastery',
        description: '',
        cover_image_url:
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
        drive_delivery_url: ''
      })
      await loadProducts()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const handleToggleActive = async (prod: any) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-command-key': ADMIN_COMMAND_KEY
        },
        body: JSON.stringify({ id: prod.id, is_active: !prod.is_active })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success(prod.is_active ? 'Product paused/unpublished.' : 'Product activated live!')
      await loadProducts()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-command-key': ADMIN_COMMAND_KEY
        },
        body: JSON.stringify({
          id: editingProduct.id,
          title: editingProduct.title,
          price_ghs: Number(editingProduct.price_ghs),
          creator_name: editingProduct.creator_name,
          category: editingProduct.category,
          description: editingProduct.description,
          cover_image_url: editingProduct.cover_image_url,
          drive_delivery_url: editingProduct.drive_delivery_url
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update product')
      toast.success('Product updated live in Pillar 2 Marketplace!')
      setEditingProduct(null)
      await loadProducts()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`🗑️ Permanently delete "${title}" from Pillar 2 Marketplace?`)) return
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-command-key': ADMIN_COMMAND_KEY }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success(`"${title}" removed from Marketplace.`)
      await loadProducts()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          PILLAR 2 MARKETPLACE WHITELIST ({products.length} PRODUCTS)
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm">
          Synced live with `public.pillar2_products`. Any product added or edited here appears immediately in Pillar 2 with a 50% affiliate link & Paystack checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleCreateProduct}
          className="bg-[#0D0D12] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 h-fit"
        >
          <h3 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Publish New Pillar 2 Product
          </h3>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI Automation Agency Masterclass"
              value={newProd.title}
              onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Price (GH₵) *
              </label>
              <input
                type="number"
                required
                value={newProd.price_ghs}
                onChange={(e) => setNewProd({ ...newProd, price_ghs: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                Creator Name
              </label>
              <input
                type="text"
                list="creator-presets"
                placeholder="Gerald or Moses"
                value={newProd.creator_name}
                onChange={(e) => setNewProd({ ...newProd, creator_name: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
              <datalist id="creator-presets">
                <option value="Gerald" />
                <option value="Moses" />
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Category
            </label>
            <input
              type="text"
              placeholder="e.g. Digital Mastery, AI & Automation"
              value={newProd.category}
              onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Short Description
            </label>
            <textarea
              rows={2}
              placeholder="High-converting summary..."
              value={newProd.description}
              onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={newProd.cover_image_url}
              onChange={(e) => setNewProd({ ...newProd, cover_image_url: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">
              Google Drive Delivery URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://drive.google.com/drive/folders/..."
              value={newProd.drive_delivery_url}
              onChange={(e) => setNewProd({ ...newProd, drive_delivery_url: e.target.value })}
              className="w-full bg-black border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-wider min-h-[44px] shadow-lg shadow-amber-500/20"
          >
            {publishing ? 'Publishing to Pillar 2...' : '+ Publish Product (50% Split)'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider text-amber-400">
              Active Products ({products.length})
            </h3>
            <button
              type="button"
              onClick={loadProducts}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync List
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-xs">Loading Marketplace Vault...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">No products found.</div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl bg-black/50 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    p.is_active === false ? 'border-amber-500/30 opacity-65' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <img
                      src={
                        p.cover_image_url ||
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80'
                      }
                      alt={p.title}
                      className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-white">{p.title}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          By {p.creator_name || 'Gerald'}
                        </span>
                        {p.is_active === false && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-black uppercase">
                            PAUSED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
                        GH₵ {Number(p.price_ghs || 0).toFixed(0)} • 50% Affiliate Commission (GH₵{' '}
                        {(Number(p.price_ghs || 0) * 0.5).toFixed(0)})
                      </div>
                      <div className="text-[11px] text-gray-400 truncate max-w-md mt-0.5">
                        {p.description}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate max-w-md mt-0.5">
                        Drive Vault: {p.drive_delivery_url}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...p })}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-black transition"
                    >
                      ✏️ Edit Price/Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-black transition"
                    >
                      {p.is_active === false ? '▶️ Publish Live' : '⏸️ Pause/Unpublish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id, p.title)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[11px] font-black transition"
                    >
                      🗑️ Delete Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditProduct}
            className="max-w-lg w-full bg-[#0D0D12] border border-cyan-500/40 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-base text-cyan-400">✏️ Edit Marketplace Product</h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  value={editingProduct.title || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Price (GH₵)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price_ghs || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price_ghs: e.target.value })
                    }
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Creator Name
                  </label>
                  <input
                    type="text"
                    value={editingProduct.creator_name || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, creator_name: e.target.value })
                    }
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Google Drive Delivery URL
                </label>
                <input
                  type="url"
                  value={editingProduct.drive_delivery_url || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      drive_delivery_url: e.target.value
                    })
                  }
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black font-black text-xs uppercase"
              >
                Save Changes Live
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
   MODULE 7: CONTESTS MANAGER, HELP DESK INBOX & TOP AFFILIATE LEADERBOARD (#29, #30, #31)
   ============================================================================ */
function ContestsAndP2HubModule({
  apiFetch,
  platformSettings,
  onRefreshSettings
}: {
  apiFetch: any
  platformSettings: any
  onRefreshSettings: () => void
}) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [helpMessages, setHelpMessages] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prizePool, setPrizePool] = useState(
    String(platformSettings?.p2_contest_prize_pool_ghs || 10000)
  )
  const [deadline, setDeadline] = useState(
    String(platformSettings?.p2_contest_deadline || '2026-12-31')
  )

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, helpRes, lbRes] = await Promise.all([
        apiFetch('FETCH_P2_CONTEST_SUBMISSIONS'),
        apiFetch('FETCH_P2_HELP_MESSAGES'),
        apiFetch('FETCH_AFFILIATE_LEADERBOARD')
      ])
      setSubmissions(subRes.submissions || [])
      setHelpMessages(helpRes.messages || [])
      setLeaderboard(lbRes.leaderboard || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleContestStatus = async (
    submissionId: string,
    status: 'processing' | 'approved_winner' | 'rejected'
  ) => {
    try {
      await apiFetch('UPDATE_P2_CONTEST_STATUS', { submissionId, status })
      toast.success(`Contest submission set to ${status.toUpperCase()}!`)
      void loadAll()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSaveContestConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', {
        p2_contest_prize_pool_ghs: Number(prizePool),
        p2_contest_deadline: deadline
      })
      toast.success('Contest Prize Pool & Deadline updated live!')
      onRefreshSettings()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            CONTESTS MANAGER, HELP DESK INBOX & AFFILIATE LEADERBOARD
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Review TikTok/IG contest proofs, read silent Pillar 2 Help Bot messages, and inspect top affiliate conversion metrics.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Refresh
        </button>
      </div>

      {/* #29 CONTEST PRIZE POOL & DEADLINE EDITOR */}
      <form
        onSubmit={handleSaveContestConfig}
        className="bg-[#0D0D12] border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
      >
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">
            Contest Prize Pool (GH₵)
          </label>
          <input
            type="number"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">Contest Deadline</label>
          <input
            type="text"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono mt-1"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase"
        >
          Save Contest Prize & Deadline
        </button>
      </form>

      {/* #29 CONTEST SUBMISSIONS LIST */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Affiliate Contest Submissions ({submissions.length})
        </h3>
        {loading ? (
          <div className="p-6 text-center text-xs text-gray-500">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            No contest submissions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-white">
                      {s.full_name || s.affiliate_name || 'Affiliate'}
                    </span>
                    <span className="text-xs text-amber-400 font-mono">
                      {s.email || s.affiliate_email}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase">
                      {s.contest_title || s.platform || 'Contest Entry'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                      Verified Sales: {s.verified_sales_count ?? 0}
                    </span>
                  </div>
                  {(s.video_or_proof_url || s.video_url) && (
                    <a
                      href={s.video_or_proof_url || s.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 underline font-mono break-all block"
                    >
                      🔗 Proof Link: {s.video_or_proof_url || s.video_url}
                    </a>
                  )}
                  <div className="text-[11px] text-gray-400">
                    Status: <strong className="text-white uppercase">{s.status}</strong> •{' '}
                    {s.notes || s.admin_note || ''}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleContestStatus(s.id, 'processing')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-black"
                  >
                    🔄 Processing...
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContestStatus(s.id, 'approved_winner')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black"
                  >
                    🏆 Approved Winner
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContestStatus(s.id, 'rejected')}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-black"
                  >
                    ❌ Rejected
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* #30 PILLAR 2 SILENT HELP BOT INBOX */}
      <div className="bg-[#0D0D12] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-black text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> Pillar 2 Help Desk Inbox ({helpMessages.length})
        </h3>
        <p className="text-xs text-gray-400">
          Messages typed by affiliates into the silent Pillar 2 floating Help Bot appear here in real time.
        </p>
        {helpMessages.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            No Pillar 2 Help Desk messages received yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {helpMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-black text-white">{msg.user_name || 'Affiliate'}</span>
                    <span className="text-emerald-400 font-mono">{msg.user_email || ''}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 mt-1">{msg.message}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch('UPDATE_P2_HELP_MESSAGE', {
                      messageId: msg.id,
                      status: 'resolved'
                    })
                    toast.success('Marked resolved')
                    void loadAll()
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-black shrink-0 ${
                    msg.status === 'resolved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {msg.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* #31 TOP AFFILIATE LEADERBOARD & CLICK/CONVERSION INSPECTOR */}
      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-cyan-400">
            Top Affiliate Leaderboard & Click / Conversion Inspector
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500 bg-black/40">
                <th className="p-3">Rank</th>
                <th className="p-3">Affiliate</th>
                <th className="p-3">Code</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Verified Sales</th>
                <th className="p-3">Conv. Rate</th>
                <th className="p-3">Available GH₵</th>
                <th className="p-3">Total Earned GH₵</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.slice(0, 25).map((a, idx) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-black text-amber-400">#{idx + 1}</td>
                  <td className="p-3">
                    <div className="font-bold text-white">{a.full_name || a.username}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{a.email}</div>
                  </td>
                  <td className="p-3 font-mono text-emerald-400">{a.affiliate_code || '—'}</td>
                  <td className="p-3 font-mono">{a.clicksCount}</td>
                  <td className="p-3 font-mono font-bold text-white">{a.salesCount}</td>
                  <td className="p-3 font-mono text-cyan-300">{a.conversionRate}</td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">
                    GH₵ {Number(a.availGhs || 0).toFixed(2)}
                  </td>
                  <td className="p-3 font-mono text-amber-300 font-black">
                    GH₵ {Number(a.totalGhs || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
   MODULE 8: LIVE GIFT & COIN TRANSACTION LEDGER (#22)
   ============================================================================ */
function GiftsLedgerModule({ apiFetch }: { apiFetch: any }) {
  const [data, setData] = useState<{ transactions: any[]; giftMessages: any[] }>({
    transactions: [],
    giftMessages: []
  })
  const [loading, setLoading] = useState(true)

  const loadGifts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('FETCH_GIFTS_LEDGER')
      setData({
        transactions: res.transactions || [],
        giftMessages: res.giftMessages || []
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    void loadGifts()
  }, [loadGifts])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" /> LIVE GIFT & COIN TRANSACTION LEDGER
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Real-time 1-on-1 chat gifts, Live Arena stream gifts, and wallet coin movements.
          </p>
        </div>
        <button
          onClick={loadGifts}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Refresh Ledger
        </button>
      </div>

      <div className="bg-[#0D0D12] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-amber-400">
            Wallet & Gift Transactions ({data.transactions.length})
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse min-w-[600px] text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500 bg-black/40">
                <th className="p-3">User ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Coins / GH₵</th>
                <th className="p-3">Description</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Loading Gift & Coin Ledger...
                  </td>
                </tr>
              ) : data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No coin/gift transactions recorded yet.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-gray-400">
                      {String(tx.user_id || '').slice(0, 10)}...
                    </td>
                    <td className="p-3 font-bold text-amber-300">{tx.type || 'GIFT_TX'}</td>
                    <td className="p-3 font-mono font-black text-emerald-400">
                      {tx.coin_amount
                        ? `🪙 ${tx.coin_amount} Coins`
                        : `GH₵ ${Number(tx.amount_ghs || 0).toFixed(2)}`}
                    </td>
                    <td className="p-3 text-gray-200">{tx.description || 'Platform Transaction'}</td>
                    <td className="p-3 font-mono text-gray-500">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
   MODULE 9: PHASE 7 FULL 3-PILLAR LICENSE ENFORCER + PILLAR 3 AI STUDIO POWERS (#32, #33, #34)
   ============================================================================ */
function LicenseModule({
  apiFetch,
  platformSettings,
  onRefreshSettings
}: {
  apiFetch: any
  platformSettings: any
  onRefreshSettings: () => void
}) {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // #33 Pillar 3 Custom System Prompt / AI Knowledge Injection
  const [p3SystemPrompt, setP3SystemPrompt] = useState(
    platformSettings?.pillar3_custom_system_prompt || ''
  )
  // #34 Pillar 3 Featured Prompt Vault Manager
  const [newPromptTitle, setNewPromptTitle] = useState('')
  const [newPromptBody, setNewPromptBody] = useState('')
  const [featuredPrompts, setFeaturedPrompts] = useState<any[]>(
    Array.isArray(platformSettings?.pillar3_featured_prompts)
      ? platformSettings.pillar3_featured_prompts
      : []
  )
  const [savingP3Config, setSavingP3Config] = useState(false)

  useEffect(() => {
    if (platformSettings) {
      setP3SystemPrompt(platformSettings.pillar3_custom_system_prompt || '')
      if (Array.isArray(platformSettings.pillar3_featured_prompts)) {
        setFeaturedPrompts(platformSettings.pillar3_featured_prompts)
      }
    }
  }, [platformSettings])

  const loadLicenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('FETCH_USERS_VAULT', { search, filter })
      setUsers(res.users || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiFetch, search, filter])

  useEffect(() => {
    void loadLicenses()
  }, [loadLicenses])

  const handleExecutePillarAction = async (
    userId: string,
    email: string,
    pillarAction: string,
    label: string
  ) => {
    setBusyKey(`${userId}:${pillarAction}`)
    try {
      const res = await apiFetch('ADMIN_SET_PILLAR_ACCESS', {
        userId,
        email,
        pillarAction
      })
      if (res?.profile) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.profile } : u)))
      } else {
        await loadLicenses()
      }
      toast.success(`${label} enforced live on user's device!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleSaveP3Config = async (nextPrompts?: any[]) => {
    setSavingP3Config(true)
    try {
      await apiFetch('UPDATE_PLATFORM_SETTINGS', {
        pillar3_custom_system_prompt: p3SystemPrompt,
        pillar3_featured_prompts: nextPrompts ?? featuredPrompts
      })
      toast.success('Pillar 3 AI Studio System Prompt & Featured Vault updated live!')
      onRefreshSettings()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingP3Config(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* #33 & #34 PILLAR 3 AI STUDIO KNOWLEDGE INJECTION & FEATURED PROMPT VAULT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0D0D12] border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-sm sm:text-base font-black text-purple-400 flex items-center gap-2">
            <Cpu className="w-5 h-5" /> Pillar 3 Custom System Prompt / AI Knowledge Injection
          </h3>
          <p className="text-xs text-gray-400">
            Inject custom rules, platform facts, or instructions into the Earnmega AI Studio system prompt live.
          </p>
          <textarea
            rows={4}
            placeholder="e.g. Always remind users that Pillar 2 pays 50% instant commission on all 9 digital mastery courses..."
            value={p3SystemPrompt}
            onChange={(e) => setP3SystemPrompt(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
          />
          <button
            type="button"
            disabled={savingP3Config}
            onClick={() => handleSaveP3Config()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase"
          >
            {savingP3Config ? 'Injecting...' : 'Save Pillar 3 System Prompt Live'}
          </button>
        </div>

        <div className="bg-[#0D0D12] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="text-sm sm:text-base font-black text-cyan-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Pillar 3 Featured Prompt Vault Manager (
            {featuredPrompts.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Template Title..."
              value={newPromptTitle}
              onChange={(e) => setNewPromptTitle(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Prompt Text..."
              value={newPromptBody}
              onChange={(e) => setNewPromptBody(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newPromptTitle.trim() || !newPromptBody.trim()) return
              const next = [
                ...featuredPrompts,
                { id: `fp_${Date.now()}`, title: newPromptTitle.trim(), prompt: newPromptBody.trim() }
              ]
              setFeaturedPrompts(next)
              setNewPromptTitle('')
              setNewPromptBody('')
              void handleSaveP3Config(next)
            }}
            className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-xs uppercase"
          >
            + Add Featured Prompt Template
          </button>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {featuredPrompts.map((fp, i) => (
              <div
                key={fp.id || i}
                className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-white truncate">{fp.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = featuredPrompts.filter((_, idx) => idx !== i)
                    setFeaturedPrompts(next)
                    void handleSaveP3Config(next)
                  }}
                  className="text-red-400 text-[10px] font-bold ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* #32 & PHASE 7 FULL 3-PILLAR LICENSE ENFORCER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            FULL 3-PILLAR LICENSE ENFORCER & P3 SUBSCRIBER TIMERS
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Grant or revoke Pillar 1 (GH₵ 50 + Tiers), Pillar 2 (GH₵ 90 / GH₵ 45 Renewal), or Pillar 3 (+7d Weekly / +30d Pro / +1Yr Premium). Changes take instant effect on the user&apos;s screen without refresh.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by email or @handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D0D12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#0D0D12] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
          >
            <option value="ALL">All Accounts</option>
            <option value="P1_PAID">Pillar 1 Paid</option>
            <option value="P2_PAID">Pillar 2 Paid</option>
            <option value="P3_PAID">Pillar 3 Active Subscribers</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading 3-Pillar License Matrix...</div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-[#0D0D12] border border-white/10 rounded-2xl">
          No matching accounts found.
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-[#0D0D12] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      u.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        u.full_name || u.username || 'U'
                      )}&background=random`
                    }
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <div className="font-black text-white text-sm truncate">
                      {u.full_name || 'Citizen'}{' '}
                      <span className="text-amber-400 font-mono text-xs">
                        @{u.username || 'user'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">{u.email}</div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-gray-500">
                  Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </div>
              </div>

              <ThreePillarMatrixAndControls
                user={u}
                onExecutePillarAction={handleExecutePillarAction}
                busyKey={busyKey}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
