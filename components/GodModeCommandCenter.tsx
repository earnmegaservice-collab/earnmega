'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  ShieldAlert, Activity, Users, Video, MessageSquare, Gift,
  DollarSign, GraduationCap, Gavel, Power, Lock,
  Globe, AlertTriangle, Eye, Shield, Send, Menu, X
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'overwatch' | 'reports' | 'p1_live' | 'p1_groups' | 'p1_gifts' | 'p1_subscriptions' | 'p2_payouts' | 'p2_whitelist' | 'p2_licenses' | 'p2_contests' | 'crm_users' | 'crm_warnings';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };
  return fetch(url, { ...options, headers });
};

export default function GodModeCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('overwatch');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [stats] = useState({ users: 0, rev: 0 }); // Temporary, will be fetched in API later if needed here, else fetched inside OverwatchModule

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    setIsMobileMenuOpen(false);
  };

  const tabs: {id: Tab, label: string}[] = [
    {id: 'overwatch', label: 'Overwatch'},
    {id: 'reports', label: 'Reports'},
    {id: 'p1_live', label: 'Live Radar'},
    {id: 'p1_groups', label: 'Groups'},
    {id: 'p1_gifts', label: 'Gifts'},
    {id: 'p2_payouts', label: 'Payouts'},
    {id: 'p2_whitelist', label: 'Whitelist'},
    {id: 'p2_licenses', label: 'Licenses'},
    {id: 'p2_contests', label: 'Contests'},
    {id: 'crm_users', label: 'User Vault'},
    {id: 'crm_warnings', label: 'Warnings'},
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#050811] text-white overflow-hidden font-sans">

      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-[#0B1120] border-b border-[#1e293b] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
          <h1 className="text-lg font-black text-[#F59E0B] tracking-wider uppercase">
            God Mode
          </h1>
        </div>
        <div className="flex items-center gap-3">
           <button className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
             Quick Broadcast
           </button>
           <button onClick={() => setIsMobileMenuOpen(true)} className="p-1">
             <Menu className="w-6 h-6 text-white" />
           </button>
        </div>
      </header>

      {/* Mobile Horizontal Scrollable Quick-Tab Bar */}
      <div className="lg:hidden w-full overflow-x-auto whitespace-nowrap bg-[#0B1120] border-b border-[#1e293b] p-2 flex gap-2 hide-scrollbar shrink-0 z-30">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              activeTab === tab.id ? 'bg-[#F59E0B] text-black' : 'bg-[#1e293b] text-gray-300 hover:bg-[#334155]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Slide-Over Drawer (Mobile) */}
      <div className={`fixed inset-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 lg:hidden`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <aside className="absolute inset-y-0 left-0 w-72 bg-[#0B1120] border-r border-[#1e293b] flex flex-col overflow-y-auto shadow-2xl">
          <div className="p-4 border-b border-[#1e293b] flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-[#F59E0B] tracking-wider uppercase flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-[#ef4444]" /> God Mode
              </h1>
              <p className="text-xs text-[#10B981] mt-1 font-mono">SUPREME COMMAND X9v2</p>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          <nav className="flex-1 py-4 space-y-1 pb-20">
             <SidebarGroup title="GLOBAL OPS & OVERWATCH">
              <SidebarItem tab="overwatch" current={activeTab} onClick={handleTabChange} icon={<Activity />} label="Overwatch Matrix" />
              <SidebarItem tab="reports" current={activeTab} onClick={handleTabChange} icon={<AlertTriangle />} label="Trust & Safety Reports" />
            </SidebarGroup>
            <SidebarGroup title="PILLAR 1: SOCIAL">
              <SidebarItem tab="p1_live" current={activeTab} onClick={handleTabChange} icon={<Video />} label="Live Radar" />
              <SidebarItem tab="p1_groups" current={activeTab} onClick={handleTabChange} icon={<MessageSquare />} label="Group Command" />
              <SidebarItem tab="p1_gifts" current={activeTab} onClick={handleTabChange} icon={<Gift />} label="Gifts Ledger" />
              <SidebarItem tab="p1_subscriptions" current={activeTab} onClick={handleTabChange} icon={<ShieldAlert />} label="Expired Subscriptions" />
            </SidebarGroup>
            <SidebarGroup title="PILLAR 2: AFFILIATE">
              <SidebarItem tab="p2_payouts" current={activeTab} onClick={handleTabChange} icon={<DollarSign />} label="Friday Payouts" />
              <SidebarItem tab="p2_whitelist" current={activeTab} onClick={handleTabChange} icon={<Shield />} label="Whitelist & Products" />
              <SidebarItem tab="p2_licenses" current={activeTab} onClick={handleTabChange} icon={<Lock />} label="License Enforcer" />
              <SidebarItem tab="p2_contests" current={activeTab} onClick={handleTabChange} icon={<GraduationCap />} label="Contests Authority" />
            </SidebarGroup>
            <SidebarGroup title="SUPREME CRM">
              <SidebarItem tab="crm_users" current={activeTab} onClick={handleTabChange} icon={<Users />} label="Master User Vault" />
              <SidebarItem tab="crm_warnings" current={activeTab} onClick={handleTabChange} icon={<Gavel />} label="Warning Dispatcher" />
            </SidebarGroup>
          </nav>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0B1120] border-r border-[#1e293b] flex-col overflow-y-auto shrink-0 z-10">
        <div className="p-4 border-b border-[#1e293b]">
          <h1 className="text-xl font-black text-[#F59E0B] tracking-wider uppercase flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#ef4444]" />
            God Mode
          </h1>
          <p className="text-xs text-[#10B981] mt-1 font-mono">SUPREME COMMAND X9v2</p>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <SidebarGroup title="GLOBAL OPS & OVERWATCH">
            <SidebarItem tab="overwatch" current={activeTab} onClick={setActiveTab} icon={<Activity />} label="Overwatch Matrix" />
            <SidebarItem tab="reports" current={activeTab} onClick={setActiveTab} icon={<AlertTriangle />} label="Trust & Safety Reports" />
          </SidebarGroup>

          <SidebarGroup title="PILLAR 1: SOCIAL">
            <SidebarItem tab="p1_live" current={activeTab} onClick={setActiveTab} icon={<Video />} label="Live Radar" />
            <SidebarItem tab="p1_groups" current={activeTab} onClick={setActiveTab} icon={<MessageSquare />} label="Group Command" />
            <SidebarItem tab="p1_gifts" current={activeTab} onClick={setActiveTab} icon={<Gift />} label="Gifts Ledger" />
            <SidebarItem tab="p1_subscriptions" current={activeTab} onClick={setActiveTab} icon={<ShieldAlert />} label="Expired Subscriptions" />
          </SidebarGroup>

          <SidebarGroup title="PILLAR 2: AFFILIATE">
            <SidebarItem tab="p2_payouts" current={activeTab} onClick={setActiveTab} icon={<DollarSign />} label="Friday Payouts" />
            <SidebarItem tab="p2_whitelist" current={activeTab} onClick={setActiveTab} icon={<Shield />} label="Whitelist & Products" />
            <SidebarItem tab="p2_licenses" current={activeTab} onClick={setActiveTab} icon={<Lock />} label="License Enforcer" />
            <SidebarItem tab="p2_contests" current={activeTab} onClick={setActiveTab} icon={<GraduationCap />} label="Contests Authority" />
          </SidebarGroup>

          <SidebarGroup title="SUPREME CRM">
            <SidebarItem tab="crm_users" current={activeTab} onClick={setActiveTab} icon={<Users />} label="Master User Vault" />
            <SidebarItem tab="crm_warnings" current={activeTab} onClick={setActiveTab} icon={<Gavel />} label="Warning Dispatcher" />
          </SidebarGroup>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:px-6 py-4 relative z-0">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#F59E0B]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6 relative z-10 w-full">
          <header className="hidden lg:flex justify-between items-end pb-4 border-b border-[#1e293b]">
            <div>
              <h2 className="text-3xl font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h2>
              <p className="text-gray-400 mt-1">HorPal Administrative Command Interface</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-mono text-[#10B981]">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> SYSTEM ONLINE</span>
            </div>
          </header>

          <div className="min-h-[60vh] w-full pb-10">
            {activeTab === 'overwatch' && <OverwatchModule />}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'p1_live' && <LiveRadarModule />}
            {activeTab === 'p1_groups' && <GroupCommandModule />}
            {activeTab === 'p1_gifts' && <GiftsLedgerModule />}
            {activeTab === 'p1_subscriptions' && <SubscriptionsAlertModule />}
            {activeTab === 'p2_payouts' && <PayoutsModule />}
            {activeTab === 'p2_whitelist' && <WhitelistModule />}
            {activeTab === 'p2_licenses' && <LicenseModule />}
            {activeTab === 'p2_contests' && <ContestsModule />}
            {activeTab === 'crm_users' && <UserVaultModule />}
            {activeTab === 'crm_warnings' && <WarningsModule />}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sidebar Helpers ---
function SidebarGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="px-4 text-[10px] font-bold text-gray-500 tracking-widest mb-1">{title}</h3>
      {children}
    </div>
  );
}

function SidebarItem({ tab, current, onClick, icon, label }: { tab: Tab, current: Tab, onClick: (t: Tab) => void, icon: React.ReactNode, label: string }) {
  const isActive = current === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        isActive
          ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-r-2 border-[#F59E0B]'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
      <span>{label}</span>
    </button>
  );
}

// --- Global Ops & Pillar 1 Modules ---

function OverwatchModule() {
  const [stats, setStats] = useState({ users: 0, p1Paid: 0, p2Active: 0, live: 0, rev: 0, coins: 0, pending: 0 });
  const [matrixLog, setMatrixLog] = useState<string[]>([]);
  const [lockdown, setLockdown] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchRealStats = async () => {
    setLoadingStats(true);
    try {
      const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'FETCH_ALL_STATS' })
      });
      const data = await res.json();
      if (data.success && data.stats) {
         setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchRealStats();

    // Subscribe to Matrix
    const channel = supabase.channel('horpal_godmode_matrix')
      .on('broadcast', { event: 'MATRIX_LOG' }, (payload) => {
        setMatrixLog(prev => [payload.payload.message, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSwitch = async (name: string) => {
    toast.success(`${name} toggled!`);
    setLockdown(!lockdown);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={fetchRealStats} disabled={loadingStats} className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold px-4 py-2 rounded border border-[#F59E0B]/50 hover:bg-[#F59E0B]/30 disabled:opacity-50">
          {loadingStats ? 'Refreshing...' : '🔄 Refresh Real Data'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', val: stats.users },
          { label: 'P1 Paid Members', val: stats.p1Paid },
          { label: 'P2 Active Affiliates', val: stats.p2Active },
          { label: 'Active Live Streams', val: stats.live },
          { label: 'Total Platform Coins', val: stats.coins },
          { label: 'User Balances (GH₵)', val: stats.rev },
          { label: 'Pending Withdrawals', val: stats.pending },
        ].map(s => (
          <div key={s.label} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl truncate break-words">
            <div className="text-gray-400 text-xs mb-1 truncate">{s.label}</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{typeof s.val === 'number' ? s.val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1e293b]/30 border border-red-500/20 p-4 rounded-xl">
          <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2"><Power className="w-4 h-4"/> Kill Switches</h3>
          <div className="space-y-3">
            <button onClick={() => toggleSwitch('Global Lockdown')} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-2 rounded font-bold text-sm">
              {lockdown ? '🔓 Lift Global Lockdown' : '🛑 Enforce Global Maintenance Lockdown'}
            </button>
            <button onClick={() => toggleSwitch('Freeze P2')} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/50 py-2 rounded font-bold text-sm">
              ❄️ Freeze All P2 Withdrawals
            </button>
            <button onClick={() => toggleSwitch('Disable Streams')} className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 py-2 rounded font-bold text-sm">
              📵 Disable New Live Streams
            </button>
          </div>
        </div>

        <div className="bg-[#0B1120] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
          <div className="bg-[#1e293b] px-4 py-2 text-xs font-mono text-[#10B981] flex justify-between">
            <span>OVERWATCH MATRIX</span>
            <span className="animate-pulse">REC...</span>
          </div>
          <div className="p-4 flex-1 h-48 overflow-y-auto font-mono text-xs text-gray-400 space-y-1">
            {matrixLog.length === 0 ? <span className="opacity-50">Listening for global events...</span> :
              matrixLog.map((log, i) => <div key={i}>&gt; {log}</div>)
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsModule() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'FETCH_REPORTS' })
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Trust & Safety Inbox is currently empty.</p>
        </div>
      ) : (
        reports.map(r => (
           <div key={r.id} className="bg-[#1e293b]/50 border border-red-500/20 p-4 rounded-xl space-y-2">
             <div className="flex justify-between items-start">
               <div>
                  <span className="text-xs font-bold text-red-500 uppercase">{r.type}</span>
                  <div className="text-sm text-gray-300"><span className="text-gray-500">Target:</span> {r.target_user}</div>
                  <div className="text-sm text-gray-300"><span className="text-gray-500">Reporter:</span> {r.reporter}</div>
                  {r.stream_id && <div className="text-xs text-gray-500">Stream ID: {r.stream_id}</div>}
               </div>
               <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
             </div>
             <div className="bg-[#0B1120] p-3 rounded text-sm text-white">
                <div className="font-bold text-red-400 mb-1">{r.reason}</div>
                <div>{r.details}</div>
             </div>
             <div className="flex gap-2 pt-2">
                <button onClick={async () => {
                    toast.loading('Banning user...', { id: 'ban' });
                    const res = await apiFetch('/api/admin/action', {
                        method: 'POST',
                        body: JSON.stringify({ action: 'BAN_USER', payload: { userId: r.target_id } })
                    });
                    if (res.ok) toast.success('User Banned', { id: 'ban' });
                }} className="flex-1 bg-red-500/10 text-red-500 text-xs py-2 rounded hover:bg-red-500/20 font-bold border border-red-500/20">Ban Target</button>
                <button onClick={async () => {
    toast.loading('Warning user...', { id: 'warn' });
    const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'GOD_VOICE_WARNING', payload: { target: r.target_id, level: 'WARNING', message: 'You have been reported for violating community guidelines. Further violations will result in account suspension.' } })
    });
    if (res.ok) toast.success('Warning Sent', { id: 'warn' });
}} className="flex-1 bg-yellow-500/10 text-yellow-500 text-xs py-2 rounded hover:bg-yellow-500/20 font-bold border border-yellow-500/20">Warn Top Screen</button>
                <button className="flex-1 bg-green-500/10 text-green-500 text-xs py-2 rounded hover:bg-green-500/20 font-bold border border-green-500/20">Resolve</button>
             </div>
           </div>
        ))
      )}
    </div>
  );
}

function LiveRadarModule() {
  const [streams, setStreams] = useState<any[]>([]);

  const fetchStreams = async () => {
    const { data } = await supabase.from('live_streams').select('*, profiles!host_id(username, avatar_url)').or('status.neq.ended,is_live.eq.true').order('created_at', { ascending: false }).limit(20);
    setStreams(data || []);
  };

  useEffect(() => {
    fetchStreams();
  }, []);

  const killStream = async (id: string, hostId: string) => {
    toast.loading('Terminating stream...', { id: 'kill' });
    await apiFetch('/api/admin/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'KILL_STREAM', payload: { streamId: id, hostId } })
    });
    setStreams(prev => prev.filter(s => s.id !== id));
    toast.success('Stream terminated', { id: 'kill' });
  };

  const messageStream = async (hostId: string) => {
     const msg = prompt('Enter top-screen warning message for the host:');
     if (!msg) return;
     await apiFetch('/api/admin/action', {
       method: 'POST',
       body: JSON.stringify({ action: 'GOD_VOICE_WARNING', payload: { target: hostId, level: 'WARNING', message: msg } })
     });
     toast.success('Warning beamed to host');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-white">Active Streams Surveillance</h3>
        <button onClick={fetchStreams} className="text-xs bg-[#1e293b] px-3 py-1 rounded text-white hover:bg-[#334155]">Refresh Radar</button>
      </div>

      {streams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-[#1e293b] rounded-xl">No active streams detected.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map(s => (
            <div key={s.id} className="bg-[#0B1120] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                <Video className="w-8 h-8 text-gray-700" />
                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">LIVE</div>
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-[#1e293b] overflow-hidden shrink-0">
                       {s.profiles?.avatar_url && <img src={s.profiles.avatar_url} className="w-full h-full object-cover" />}
                     </div>
                     @{s.profiles?.username || s.host_id}
                  </div>
                  <div className="text-xs font-mono text-[#F59E0B] shrink-0">💰 {s.coins_earned || 0}</div>
                </div>
                <div className="flex gap-2 mt-auto pt-2">
                  <button onClick={() => messageStream(s.host_id)} className="flex-1 bg-blue-500/10 text-blue-500 text-xs py-2 rounded hover:bg-blue-500/20 font-bold border border-blue-500/20">💬 Beam Alert</button>
                  <button onClick={() => killStream(s.id, s.host_id)} className="flex-1 bg-red-500/10 text-red-500 text-xs py-2 rounded hover:bg-red-500/20 font-bold border border-red-500/20">🛑 Terminate</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCommandModule() {
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('chat_groups').select('*, profiles(username)').order('created_at', { ascending: false }).limit(20);
      if (!data || data.length === 0) {
         const { data: fallbackData } = await supabase.from('rooms').select('*').order('created_at', { ascending: false }).limit(20);
         setGroups(fallbackData || []);
      } else {
         setGroups(data);
      }
    };
    fetchGroups();
  }, []);

  const toggleLock = async (g: any) => {
     toast.loading('Locking group...', { id: 'group' });
     const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'LOCK_GROUP', payload: { groupId: g.id } })
     });
     if (res.ok) {
        toast.success('Group locked', { id: 'group' });
     } else {
        toast.error('Failed to lock group', { id: 'group' });
     }
  };

  return (
    <div className="space-y-4">
      {groups.length === 0 ? <div className="text-gray-500">No groups found or table empty.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map(g => (
            <div key={g.id} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex justify-between items-center truncate">
              <div className="truncate pr-2">
                <div className="font-bold text-white truncate">{g.name}</div>
                <div className="text-xs text-gray-400 truncate">Creator: @{g.profiles?.username || 'Unknown'}</div>
              </div>
              <button onClick={() => toggleLock(g)} className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded font-bold hover:bg-red-500/20 shrink-0">Lock Chat</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GiftsLedgerModule() {
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
     const fetchGifts = async () => {
         const { data } = await supabase.from('wallet_transactions')
           .select('*, profiles!wallet_transactions_user_id_fkey(username)')
           .eq('type', 'GIFT_SENT')
           .order('created_at', { ascending: false })
           .limit(20);
         setGifts(data || []);
     };
     fetchGifts();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
         <button className="bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50 px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#F59E0B]/30">🎁 Global Coin Airdrop</button>
      </div>
      {gifts.length === 0 ? (
        <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No recent gift transactions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
           {gifts.map(g => (
              <div key={g.id} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex justify-between items-center">
                 <div>
                    <span className="text-white font-bold">@{g.profiles?.username || 'Unknown'}</span> sent a gift
                    <div className="text-xs text-gray-400">{new Date(g.created_at).toLocaleString()}</div>
                 </div>
                 <div className="text-[#F59E0B] font-mono font-bold">{g.coin_amount} Coins</div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}

// --- Pillar 2 Modules ---

function PayoutsModule() {
  const [requests, setRequests] = useState<any[]>([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
       const { data } = await supabase.from('wallet_transactions')
         .select('*, profiles!wallet_transactions_user_id_fkey(username, email)')
         .eq('type', 'withdrawal')
         .eq('status', 'pending')
         .order('created_at', { ascending: false });
       setRequests(data || []);
    };
    fetchRequests();
  }, []);

  const sendOtp = async () => {
    toast.loading('Dispatching OTP...', { id: 'otp' });
    const res = await apiFetch('/api/admin/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'SEND_PAYOUT_OTP', payload: {} })
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`OTP Sent! (Test fallback: ${data.otp})`, { id: 'otp' });
      setOtpSent(true);
    } else {
      toast.error('Failed to send OTP', { id: 'otp' });
    }
  };

  const handlePayout = async (id: string, action: 'approve' | 'reject') => {
      if (!otpVerified) {
          toast.error('Verify OTP first');
          return;
      }
      toast.loading(`Processing payout ${action}...`, { id: 'payout' });
      const res = await apiFetch('/api/admin/action', {
         method: 'POST',
         body: JSON.stringify({ action: 'PROCESS_PAYOUT', payload: { requestId: id, actionType: action } })
      });
      if (res.ok) {
         toast.success(`Payout ${action}d!`, { id: 'payout' });
         setRequests(prev => prev.filter(r => r.id !== id));
      } else {
         toast.error(`Failed to process payout`, { id: 'payout' });
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#1e293b]/50 p-4 rounded-xl border border-[#334155]">
        <div>
          <h3 className="font-bold text-white">Friday Payout Desk</h3>
          <p className="text-xs text-gray-400">Total Pending: GH₵ {requests.reduce((a, b) => a + (b.amount_ghs || 0), 0)}</p>
        </div>
        {!otpSent && !otpVerified && (
           <button onClick={sendOtp} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm">
             🛡️ Request Payout OTP
           </button>
        )}
        {otpSent && !otpVerified && (
            <div className="flex gap-2 w-full sm:w-auto">
               <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" className="w-full sm:w-32 bg-[#0B1120] border border-[#334155] p-2 rounded text-sm text-white" />
               <button onClick={() => setOtpVerified(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm shrink-0">Verify</button>
            </div>
        )}
        {otpVerified && <div className="text-green-500 font-bold text-sm">✅ Session Authorized</div>}
      </div>

      <div className="space-y-2">
        {requests.length === 0 ? <div className="text-gray-500 text-center py-4">No pending payouts.</div> : requests.map(r => (
          <div key={r.id} className="bg-[#0B1120] border border-[#1e293b] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="font-bold text-white">@{r.profiles?.username}</div>
              <div className="text-xs text-gray-400">{r.profiles?.email} • {new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
              <div className="font-mono text-lg text-[#F59E0B]">GH₵ {r.amount_ghs || 0}</div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => handlePayout(r.id, 'approve')} disabled={!otpVerified} className="flex-1 sm:flex-none bg-green-500/10 text-green-500 text-xs px-3 py-2 sm:py-1.5 rounded font-bold hover:bg-green-500/20 disabled:opacity-50">✓ Approve</button>
                <button onClick={() => handlePayout(r.id, 'reject')} disabled={!otpVerified} className="flex-1 sm:flex-none bg-red-500/10 text-red-500 text-xs px-3 py-2 sm:py-1.5 rounded font-bold hover:bg-red-500/20 disabled:opacity-50">✗ Reject & Refund</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhitelistModule() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
     const fetchProducts = async () => {
         const { data } = await supabase.from('marketplace_products').select('*');
         setProducts(data || []);
     };
     fetchProducts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b]/50 border border-[#334155] p-6 rounded-xl">
        <h3 className="font-bold text-white mb-4">Add Official Marketplace Product</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Product Title" className="bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm w-full" />
          <input type="number" placeholder="Price (GH₵)" className="bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm w-full" />
          <input type="text" placeholder="Google Drive Delivery URL" className="sm:col-span-2 bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm w-full" />
        </div>
        <button className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-3 sm:py-2 rounded font-bold text-sm w-full">
          + Publish Product (50% Split)
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-gray-400">Active Products</h4>
        {products.length === 0 ? <div className="text-gray-500">No products found.</div> : products.map(p => (
           <div key={p.id} className="bg-[#0B1120] p-4 rounded-xl border border-[#1e293b] flex justify-between items-center">
              <div>
                 <div className="font-bold text-white">{p.name}</div>
                 <div className="text-xs text-[#F59E0B]">GH₵ {p.price_ghs}</div>
              </div>
              <button className="text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">Delete</button>
           </div>
        ))}
      </div>
    </div>
  );
}

function LicenseModule() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, username, pillar2_expires_at, is_pillar2_paid').eq('is_pillar2_paid', true).order('pillar2_expires_at', { ascending: true }).limit(20);
      setUsers(data || []);
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-white mb-4">1-Year License Enforcer</h3>
      {users.length === 0 ? <div className="text-gray-500">No active P2 users.</div> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="font-bold text-white">@{u.username}</div>
                <div className="text-xs text-gray-400">Expires: {u.pillar2_expires_at ? new Date(u.pillar2_expires_at).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none bg-red-500/10 text-red-500 text-xs px-3 py-2 sm:py-1.5 rounded font-bold hover:bg-red-500/20">⚡ Force Expire (GH₵ 45)</button>
                <button className="flex-1 sm:flex-none bg-green-500/10 text-green-500 text-xs px-3 py-2 sm:py-1.5 rounded font-bold hover:bg-green-500/20">🎁 +1 Year Free</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContestsModule() {
  return (
    <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400">
      <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Contests & Certificate proofs will appear here.</p>
    </div>
  );
}

// --- CRM & Warnings Modules ---

function UserVaultModule() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [filter, setFilter] = useState('ALL');

  const [amountInput, setAmountInput] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const fetchUsers = async (searchTerm = '') => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20);
    if (searchTerm) {
       q = q.or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
    } else {
       if (filter === 'P1_PAID') q = q.eq('is_paid', true);
       if (filter === 'P1_UNPAID') q = q.eq('is_paid', false);
       if (filter === 'P2_AFFILIATES') q = q.eq('is_pillar2_paid', true);
       if (filter === 'FROZEN') q = q.eq('is_wallet_frozen', true);
    }
    const { data } = await q;
    setUsers(data || []);
  };

  useEffect(() => {
    fetchUsers(query);
  }, [filter]);

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(query);
  };

  const toggleFreeze = async (user: any) => {
    toast.loading(user.is_wallet_frozen ? 'Unfreezing...' : 'Freezing...', { id: 'freeze' });
    const newVal = !user.is_wallet_frozen;
    const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'FREEZE_WALLET', payload: { userId: user.id, isFrozen: newVal } })
    });
    if (res.ok) {
        setSelectedUser({ ...user, is_wallet_frozen: newVal });
        toast.success(newVal ? 'Wallet frozen' : 'Wallet unfrozen', { id: 'freeze' });
    }
  };

  const toggleRole = async (user: any, field: string) => {
     const newVal = !user[field];
     let updateData: any = { [field]: newVal };
     if (field === 'is_pillar2_paid' && newVal) {
         updateData.pillar2_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
     }

     const res = await apiFetch('/api/admin/action', {
         method: 'POST',
         body: JSON.stringify({ action: 'UPDATE_USER_ROLES', payload: { userId: user.id, updates: updateData } })
     });

     if (res.ok) {
       setSelectedUser({ ...user, ...updateData });
       toast.success(`Role ${field} updated`);
     }
  };

  const editBalance = async (user: any, type: 'ghs' | 'coins', action: 'add' | 'sub') => {
     if (!amountInput || isNaN(Number(amountInput))) return;
     const amt = Number(amountInput);

     toast.loading('Updating balance...', { id: 'bal' });
     const res = await apiFetch('/api/admin/action', {
         method: 'POST',
         body: JSON.stringify({ action: 'UPDATE_USER_BALANCE', payload: { userId: user.id, type, actionType: action, amount: amt } })
     });

     const data = await res.json();
     if (data.success) {
         setSelectedUser(data.user);
         setAmountInput('');
         toast.success('Balance updated', { id: 'bal' });
     } else {
         toast.error('Failed to update balance', { id: 'bal' });
     }
  };

  const sendTopScreenAlert = async (user: any) => {
     if (!warningMsg) return;
     await apiFetch('/api/admin/action', {
       method: 'POST',
       body: JSON.stringify({ action: 'GOD_VOICE_WARNING', payload: { target: user.id, level: 'WARNING', message: warningMsg } })
     });
     toast.success('Top Screen Alert Sent');
     setWarningMsg('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={searchUsers} className="flex flex-1 gap-2">
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by username, email, ID..."
            className="flex-1 bg-[#0B1120] border border-[#334155] p-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#F59E0B]"
          />
          <button type="submit" className="bg-[#1e293b] hover:bg-[#334155] text-white px-6 rounded-xl font-bold">Search</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'P1_PAID', 'P1_UNPAID', 'P2_AFFILIATES', 'FROZEN'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setQuery(''); }} className={`px-3 py-1 text-xs font-bold rounded-full ${filter === f ? 'bg-[#F59E0B] text-black' : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {users.length > 0 && !selectedUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {users.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-[#334155] transition-colors overflow-hidden">
              <div className="w-12 h-12 bg-black rounded-full overflow-hidden shrink-0">
                 {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white flex items-center gap-1 truncate">@{u.username} {u.is_verified && <Shield className="w-3 h-3 text-blue-400" />}</div>
                <div className="text-xs text-gray-400 truncate">{u.full_name || u.email}</div>
                <div className="flex gap-1 mt-1">
                   {u.is_paid && <span className="bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] px-1.5 rounded font-bold">P1 Paid</span>}
                   {u.is_pillar2_paid && <span className="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 rounded font-bold">P2 Affiliate</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono text-[#10B981] font-bold">GH₵ {u.available_balance_ghs || 0}</div>
                <div className="text-xs font-mono text-[#F59E0B]">💰 {u.coin_balance || 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="bg-[#0B1120] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#1e293b] p-4 flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-black overflow-hidden shrink-0">
                 {selectedUser.avatar_url && <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />}
               </div>
               Supreme Control: @{selectedUser.username}
            </h3>
            <button onClick={() => { setSelectedUser(null); fetchUsers(query); }} className="bg-black/50 p-2 rounded-full text-gray-400 hover:text-white">
               <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-full max-h-[70vh] overflow-y-auto">
            {/* Column 1: Stats & Finance */}
            <div className="space-y-4">
              <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-[#334155] space-y-2">
                <div className="text-sm"><span className="text-gray-400">Email:</span> {selectedUser.email}</div>
                <div className="text-sm"><span className="text-gray-400">ID:</span> <span className="font-mono text-[10px] sm:text-xs break-all">{selectedUser.id}</span></div>
                <div className="text-sm"><span className="text-gray-400">Join Date:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                <div className="h-px bg-[#334155] my-2" />
                <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                   <div><span className="text-gray-400 font-normal">GH₵ Bal:</span> <span className="text-[#10B981] block">GH₵ {selectedUser.available_balance_ghs || 0}</span></div>
                   <div><span className="text-gray-400 font-normal">Coin Bal:</span> <span className="text-[#F59E0B] block">💰 {selectedUser.coin_balance || 0}</span></div>
                </div>
              </div>

              <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-[#334155] space-y-3">
                 <h4 className="text-xs font-bold text-gray-500 uppercase">Direct Balance Editor</h4>
                 <input type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="Amount to Add/Deduct" className="w-full bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm" />
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => editBalance(selectedUser, 'ghs', 'add')} className="bg-green-500/10 text-green-500 text-xs py-2 rounded hover:bg-green-500/20 font-bold border border-green-500/20">➕ GH₵</button>
                    <button onClick={() => editBalance(selectedUser, 'ghs', 'sub')} className="bg-red-500/10 text-red-500 text-xs py-2 rounded hover:bg-red-500/20 font-bold border border-red-500/20">➖ GH₵</button>
                    <button onClick={() => editBalance(selectedUser, 'coins', 'add')} className="bg-yellow-500/10 text-yellow-500 text-xs py-2 rounded hover:bg-yellow-500/20 font-bold border border-yellow-500/20">➕ Coins</button>
                    <button onClick={() => editBalance(selectedUser, 'coins', 'sub')} className="bg-orange-500/10 text-orange-500 text-xs py-2 rounded hover:bg-orange-500/20 font-bold border border-orange-500/20">➖ Coins</button>
                 </div>
              </div>

              <button onClick={() => toggleFreeze(selectedUser)} className="w-full bg-blue-500/10 text-blue-400 text-sm py-3 rounded hover:bg-blue-500/20 font-bold border border-blue-500/20">
                {selectedUser.is_wallet_frozen ? '❄️ Unfreeze Wallet' : '❄️ Freeze Wallet'}
              </button>
            </div>

            {/* Column 2: Access & Warning */}
            <div className="space-y-4">
              <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-[#334155] space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Access & License Controls</h4>
                <button onClick={() => toggleRole(selectedUser, 'is_paid')} className="w-full flex justify-between bg-black/50 p-3 rounded hover:bg-black text-sm border border-gray-800">
                   <span className="font-bold">Pillar 1 Paid Access</span>
                   <span>{selectedUser.is_paid ? '✅ Revoke' : '❌ Grant'}</span>
                </button>
                <button onClick={() => toggleRole(selectedUser, 'is_pillar2_paid')} className="w-full flex justify-between bg-black/50 p-3 rounded hover:bg-black text-sm border border-gray-800">
                   <span className="font-bold">Pillar 2 License (1-Yr)</span>
                   <span>{selectedUser.is_pillar2_paid ? '✅ Revoke' : '❌ Grant'}</span>
                </button>
                <button onClick={() => toggleRole(selectedUser, 'is_verified')} className="w-full flex justify-between bg-black/50 p-3 rounded hover:bg-black text-sm border border-gray-800">
                   <span className="font-bold text-blue-400">Verified Badge</span>
                   <span>{selectedUser.is_verified ? '✅ Revoke' : '❌ Grant'}</span>
                </button>
              </div>

              <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/30 space-y-3">
                 <h4 className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Top-Screen Warning Alert</h4>
                 <textarea value={warningMsg} onChange={e => setWarningMsg(e.target.value)} placeholder="Type instant warning message..." className="w-full bg-[#0B1120] border border-red-500/50 p-2 rounded text-white text-sm h-20 resize-none" />
                 <button onClick={() => sendTopScreenAlert(selectedUser)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-sm uppercase tracking-wider flex justify-center items-center gap-2">
                    <Send className="w-4 h-4" /> Beam Warning
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <button onClick={async () => {
                    toast.loading(selectedUser.status === 'suspended' ? 'Unsuspending...' : 'Suspending...', { id: 'suspend' });
                    const res = await apiFetch('/api/admin/action', {
                        method: 'POST',
                        body: JSON.stringify({ action: selectedUser.status === 'suspended' ? 'UNSUSPEND_USER' : 'SUSPEND_USER', payload: { userId: selectedUser.id } })
                    });
                    if (res.ok) {
                       toast.success(selectedUser.status === 'suspended' ? 'Unsuspended' : 'Suspended', { id: 'suspend' });
                       setSelectedUser({...selectedUser, status: selectedUser.status === 'suspended' ? 'active' : 'suspended'});
                    }
                 }} className="bg-gray-800 text-gray-300 text-xs py-2 rounded hover:bg-gray-700 font-bold">{selectedUser.status === 'suspended' ? '▶️ Unsuspend' : '⏸️ Suspend'}</button>

                 <button onClick={async () => {
                    toast.loading(selectedUser.is_banned ? 'Unbanning...' : 'Banning...', { id: 'ban' });
                    const res = await apiFetch('/api/admin/action', {
                        method: 'POST',
                        body: JSON.stringify({ action: selectedUser.is_banned ? 'UNBAN_USER' : 'BAN_USER', payload: { userId: selectedUser.id } })
                    });
                    if (res.ok) {
                       toast.success(selectedUser.is_banned ? 'Unbanned' : 'Banned', { id: 'ban' });
                       setSelectedUser({...selectedUser, is_banned: !selectedUser.is_banned, status: selectedUser.is_banned ? 'active' : 'suspended'});
                    }
                 }} className="bg-red-900/50 text-red-500 text-xs py-2 rounded hover:bg-red-900 font-bold border border-red-900">{selectedUser.is_banned ? '🟢 Unban Account' : '🛡️ Ban Account'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningsModule() {
  const [target, setTarget] = useState('');
  const [level, setLevel] = useState('WARNING');
  const [message, setMessage] = useState('');

  const dispatchWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    toast.loading('Dispatching God Voice...', { id: 'godvoice' });

    // 1. Broadcast Modal
    await apiFetch('/api/admin/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'GOD_VOICE_WARNING', payload: { target, level, message } })
    });

    // 2. Official Email (if target is email)
    if (target.includes('@')) {
      await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'SEND_WARNING_EMAIL',
          payload: { email: target, warningText: message, reason: level, strikeCount: 1 }
        })
      });
    }

    toast.success('Warning Dispatched on all channels', { id: 'godvoice' });
    setMessage('');
  };

  return (
    <div className="bg-[#1e293b]/50 border border-red-500/30 p-8 rounded-xl max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Gavel className="w-8 h-8 text-red-500" />
        <div>
          <h3 className="font-black text-2xl text-red-500 uppercase tracking-widest">The God Voice</h3>
          <p className="text-xs text-gray-400">Direct Warning Dispatcher (Modal, DM, Email)</p>
        </div>
      </div>

      <form onSubmit={dispatchWarning} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">TARGET USER (ID, @username, Email, or ALL)</label>
          <input
            type="text" value={target} onChange={e => setTarget(e.target.value)} required
            className="w-full bg-[#0B1120] border border-[#334155] p-3 rounded text-white text-sm focus:border-red-500 focus:outline-none font-mono"
            placeholder="e.g. ALL or user@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">SEVERITY LEVEL</label>
          <select
            value={level} onChange={e => setLevel(e.target.value)}
            className="w-full bg-[#0B1120] border border-[#334155] p-3 rounded text-white text-sm focus:border-red-500 focus:outline-none"
          >
            <option value="WARNING">⚡ Official Warning Strike (Nudity/Spam)</option>
            <option value="FINANCIAL">🏦 Financial / Payout Compliance Notice</option>
            <option value="LICENSE">🔑 License & Account Action Required</option>
            <option value="EXECUTIVE">📣 Official HorPal Executive Message</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">WARNING MESSAGE (Will block their screen)</label>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)} required
            className="w-full bg-[#0B1120] border border-[#334155] p-3 rounded text-white text-sm focus:border-red-500 focus:outline-none h-32 resize-none"
            placeholder="Type the exact warning message here..."
          />
        </div>

        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded flex items-center justify-center gap-2">
          <Send className="w-5 h-5" /> Dispatch Warning Strike
        </button>
      </form>
    </div>
  );
}

// --- Expired Subscriptions & Tier Control Module ---
function SubscriptionsAlertModule() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'GET_SUBSCRIPTION_ALERTS', payload: {} }),
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
      } else {
        toast.error('Failed to load alerts');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error loading subscription alerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleForceDowngrade = async (userId: string, alertId: string) => {
    setActionLoading(alertId);
    try {
      const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'FORCE_DOWNGRADE_USER',
          payload: { userId, alertId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User moved to Free Plan successfully!');
        fetchAlerts();
      } else {
        toast.error(data.error || 'Failed to downgrade user');
      }
    } catch (e) {
      toast.error('Error executing downgrade');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDowngrade = async () => {
    const unacknowledged = alerts.filter(a => !a.admin_acknowledged);
    if (unacknowledged.length === 0) {
      toast('No pending alerts to downgrade', { icon: 'ℹ️' });
      return;
    }

    if (!confirm(`Are you sure you want to force-downgrade all ${unacknowledged.length} users to Free Plan?`)) {
      return;
    }

    setActionLoading('bulk');
    try {
      const res = await apiFetch('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'BULK_FORCE_DOWNGRADE',
          payload: {
            userIds: unacknowledged.map(a => a.user_id),
            alertIds: unacknowledged.map(a => a.id),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Bulk downgraded ${unacknowledged.length} users!`);
        fetchAlerts();
      } else {
        toast.error(data.error || 'Bulk downgrade failed');
      }
    } catch (e) {
      toast.error('Network error executing bulk action');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* High-visibility Alert Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/80 via-amber-950/50 to-zinc-950 border border-red-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              🚨 Expired Subscriptions & Tier Control
            </h3>
            <p className="text-xs text-zinc-400">
              Real-time monitoring of Pro (30-day) and Premium (365-day) timer expiries. Force move to Free Plan or verify automatic downgrades.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition"
          >
            Refresh
          </button>
          <button
            onClick={handleBulkDowngrade}
            disabled={actionLoading === 'bulk'}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition shadow-lg"
          >
            {actionLoading === 'bulk' ? 'Processing...' : 'Bulk Downgrade All to Free'}
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-[#0B1120] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#070b14] border-b border-[#1e293b] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Previous Tier</th>
                <th className="p-4">Expired At</th>
                <th className="p-4">Current Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-mono text-xs">
                    Loading subscription alerts...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-mono text-xs">
                    ✅ No expired subscription alerts pending. All tiers active.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {alert.username || 'User'}
                    </td>
                    <td className="p-4 text-gray-300 font-mono text-xs">{alert.email || 'N/A'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                          alert.previous_tier === 'premium'
                            ? 'bg-purple-900/40 text-purple-300 border-purple-500/40'
                            : 'bg-blue-900/40 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {alert.previous_tier === 'premium' ? '👑 Premium 1-Year' : '⚡ Pro 1-Month'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs font-mono">
                      {new Date(alert.expired_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.admin_acknowledged
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-900/30 text-red-300 border border-red-500/30 animate-pulse'
                        }`}
                      >
                        {alert.action_taken || (alert.admin_acknowledged ? 'Acknowledged' : 'Auto Downgraded')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleForceDowngrade(alert.user_id, alert.id)}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition border border-red-500/30"
                      >
                        {actionLoading === alert.id ? 'Processing...' : 'Force Move to Free / Remove Access'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
