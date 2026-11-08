'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import {
  ShieldAlert, Activity, Users, Video, MessageSquare, Gift,
  DollarSign, GraduationCap, Gavel, Power, Lock,
  Globe, AlertTriangle, Eye, Shield, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'overwatch' | 'reports' | 'p1_live' | 'p1_groups' | 'p1_gifts' | 'p2_payouts' | 'p2_whitelist' | 'p2_licenses' | 'p2_contests' | 'crm_users' | 'crm_warnings';

export default function GodModeCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('overwatch');

  return (
    <div className="flex h-screen bg-[#050811] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B1120] border-r border-[#1e293b] flex flex-col overflow-y-auto">
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
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#F59E0B]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          <header className="flex justify-between items-end pb-4 border-b border-[#1e293b]">
            <div>
              <h2 className="text-3xl font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h2>
              <p className="text-gray-400 mt-1">HorPal Administrative Command Interface</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-mono text-[#10B981]">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> SYSTEM ONLINE</span>
            </div>
          </header>

          <div className="min-h-[60vh]">
            {activeTab === 'overwatch' && <OverwatchModule />}
            {activeTab === 'reports' && <ReportsModule />}
            {activeTab === 'p1_live' && <LiveRadarModule />}
            {activeTab === 'p1_groups' && <GroupCommandModule />}
            {activeTab === 'p1_gifts' && <GiftsLedgerModule />}
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
  const [stats, setStats] = useState({ users: 0, p1Paid: 0, p2Active: 0, live: 0, rev: 0, pending: 0 });
  const [matrixLog, setMatrixLog] = useState<string[]>([]);
  const [lockdown, setLockdown] = useState(false);

  useEffect(() => {
    // Mock initial stats
    setStats({ users: 14250, p1Paid: 8900, p2Active: 3200, live: 12, rev: 450000, pending: 12500 });

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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', val: stats.users },
          { label: 'P1 Paid Users', val: stats.p1Paid },
          { label: 'P2 Affiliates', val: stats.p2Active },
          { label: 'Active Streams', val: stats.live },
          { label: 'Total Rev (GH₵)', val: stats.rev },
          { label: 'Pending Payouts', val: stats.pending },
        ].map(s => (
          <div key={s.label} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl">
            <div className="text-gray-400 text-xs mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-white">{s.val.toLocaleString()}</div>
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
  return (
    <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400">
      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Trust & Safety Inbox is currently empty.</p>
    </div>
  );
}

function LiveRadarModule() {
  const [streams, setStreams] = useState<any[]>([]);

  useEffect(() => {
    const fetchStreams = async () => {
      const { data } = await supabase.from('live_streams').select('*').neq('status', 'ended').limit(10);
      setStreams(data || []);
    };
    fetchStreams();
  }, []);

  const killStream = async (id: string) => {
    await supabase.channel(`live_arena_${id}`).send({ type: 'broadcast', event: 'ADMIN_KILL_STREAM', payload: {} });
    await supabase.from('live_streams').update({ status: 'ended' }).eq('id', id);
    setStreams(prev => prev.filter(s => s.id !== id));
    toast.success('Stream terminated');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-white">Active Streams Surveillance</h3>
        <button className="text-xs bg-[#1e293b] px-3 py-1 rounded text-white hover:bg-[#334155]">Refresh Radar</button>
      </div>

      {streams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-[#1e293b] rounded-xl">No active streams detected.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {streams.map(s => (
            <div key={s.id} className="bg-[#0B1120] border border-[#1e293b] rounded-xl overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                <Video className="w-8 h-8 text-gray-700" />
                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">LIVE</div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="font-bold text-sm text-white truncate">{s.title || 'Untitled Stream'}</div>
                  <div className="text-xs text-gray-400">Host: {s.host_id}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="bg-blue-500/10 text-blue-400 text-xs py-1.5 rounded hover:bg-blue-500/20">🕵️ Stealth Join</button>
                  <button className="bg-orange-500/10 text-orange-400 text-xs py-1.5 rounded hover:bg-orange-500/20">🔇 Mute Host</button>
                  <button onClick={() => killStream(s.id)} className="col-span-2 bg-red-500/10 text-red-500 text-xs py-1.5 rounded hover:bg-red-500/20 font-bold border border-red-500/20">🛑 Kill & Ban Host</button>
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
      const { data } = await supabase.from('chat_groups').select('*').limit(20);
      setGroups(data || []);
    };
    fetchGroups();
  }, []);

  return (
    <div className="space-y-4">
      {groups.length === 0 ? <div className="text-gray-500">No groups found or table empty.</div> : (
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="font-bold text-white">{g.name}</div>
                <div className="text-xs text-gray-400">ID: {g.id}</div>
              </div>
              <button className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded font-bold hover:bg-red-500/20">Lock to Admins</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GiftsLedgerModule() {
  return (
    <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400">
      <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Gifts ledger requires complex payload parsing (Pending migration).</p>
    </div>
  );
}

// --- Pillar 2 Modules ---

function PayoutsModule() {
  const [requests, setRequests] = useState<any[]>([]);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Mocking payouts since full transactions schema might not be ready
    setRequests([
      { id: '1', name: 'John Doe', email: 'john@example.com', amount: 450, method: 'MoMo', status: 'pending' },
      { id: '2', name: 'Alice Smith', email: 'alice@example.com', amount: 1200, method: 'Bank', status: 'pending' }
    ]);
  }, []);

  const sendOtp = async () => {
    toast.loading('Dispatching OTP...', { id: 'otp' });
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#1e293b]/50 p-4 rounded-xl border border-[#334155]">
        <div>
          <h3 className="font-bold text-white">Friday Payout Desk</h3>
          <p className="text-xs text-gray-400">Total Pending: GH₵ {requests.reduce((a, b) => a + b.amount, 0)}</p>
        </div>
        <button onClick={sendOtp} disabled={otpSent} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50">
          {otpSent ? 'OTP Dispatched' : 'Send Admin OTP'}
        </button>
      </div>

      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="bg-[#0B1120] border border-[#1e293b] p-4 rounded-xl flex justify-between items-center">
            <div>
              <div className="font-bold text-white">{req.name} <span className="text-xs font-normal text-gray-400">({req.email})</span></div>
              <div className="text-sm text-gray-300">{req.method} • <span className="text-[#10B981] font-bold">GH₵ {req.amount}</span></div>
            </div>
            <div className="flex gap-2">
              <button className="bg-green-500/10 text-green-500 text-xs px-3 py-1.5 rounded hover:bg-green-500/20 font-bold">✓ Approve</button>
              <button className="bg-orange-500/10 text-orange-500 text-xs px-3 py-1.5 rounded hover:bg-orange-500/20 font-bold">✗ Reject</button>
              <button className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1.5 rounded hover:bg-blue-500/20 font-bold border border-blue-500/20">❄️ Freeze Wallet</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhitelistModule() {
  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b]/50 border border-[#334155] p-6 rounded-xl">
        <h3 className="font-bold text-white mb-4">Add Official Marketplace Product</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Product Title" className="bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm" />
          <input type="number" placeholder="Price (GH₵)" className="bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm" />
          <input type="text" placeholder="Google Drive Delivery URL" className="col-span-2 bg-[#0B1120] border border-[#334155] p-2 rounded text-white text-sm" />
        </div>
        <button className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded font-bold text-sm w-full">
          + Publish Product (50% Split)
        </button>
      </div>
    </div>
  );
}

function LicenseModule() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, username, pillar2_expires_at, is_pillar2_paid').eq('is_pillar2_paid', true).limit(10);
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
            <div key={u.id} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="font-bold text-white">@{u.username}</div>
                <div className="text-xs text-gray-400">Expires: {u.pillar2_expires_at ? new Date(u.pillar2_expires_at).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div className="flex gap-2">
                <button className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded font-bold hover:bg-red-500/20">⚡ Force Expire (GH₵ 45)</button>
                <button className="bg-green-500/10 text-green-500 text-xs px-3 py-1.5 rounded font-bold hover:bg-green-500/20">🎁 +1 Year Free</button>
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

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    const { data } = await supabase.from('profiles').select('*').or(`username.ilike.%${query}%,email.ilike.%${query}%`).limit(10);
    setUsers(data || []);
  };

  const toggleFreeze = async (user: any) => {
    const newVal = !user.is_wallet_frozen;
    await supabase.from('profiles').update({ is_wallet_frozen: newVal }).eq('id', user.id);
    setSelectedUser({ ...user, is_wallet_frozen: newVal });
    toast.success(newVal ? 'Wallet frozen' : 'Wallet unfrozen');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={searchUsers} className="flex gap-2">
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by username, email..."
          className="flex-1 bg-[#0B1120] border border-[#334155] p-3 rounded-xl text-white text-sm focus:outline-none focus:border-[#F59E0B]"
        />
        <button type="submit" className="bg-[#1e293b] hover:bg-[#334155] text-white px-6 rounded-xl font-bold">Search</button>
      </form>

      {users.length > 0 && !selectedUser && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} onClick={() => setSelectedUser(u)} className="bg-[#1e293b]/50 border border-[#334155] p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-[#334155]">
              <div>
                <div className="font-bold text-white">@{u.username}</div>
                <div className="text-xs text-gray-400">{u.email}</div>
              </div>
              <div className="text-sm font-mono text-[#10B981]">GH₵ {u.available_balance_ghs || 0}</div>
            </div>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="bg-[#0B1120] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="bg-[#1e293b] p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Supreme Control: @{selectedUser.username}</h3>
            <button onClick={() => setSelectedUser(null)} className="text-xs text-gray-400 hover:text-white">Close X</button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-[#334155] space-y-2">
                <div className="text-sm"><span className="text-gray-400">Email:</span> {selectedUser.email}</div>
                <div className="text-sm"><span className="text-gray-400">ID:</span> <span className="font-mono text-xs">{selectedUser.id}</span></div>
                <div className="text-sm"><span className="text-gray-400">P1 Paid:</span> {selectedUser.is_paid ? '✅' : '❌'}</div>
                <div className="text-sm"><span className="text-gray-400">P2 Paid:</span> {selectedUser.is_pillar2_paid ? '✅' : '❌'}</div>
                <div className="text-sm font-bold mt-2"><span className="text-gray-400 font-normal">Balance:</span> <span className="text-[#10B981]">GH₵ {selectedUser.available_balance_ghs || 0}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-green-500/10 text-green-500 text-xs py-2 rounded hover:bg-green-500/20 font-bold border border-green-500/20">➕ Credit (GH₵)</button>
                <button className="flex-1 bg-red-500/10 text-red-500 text-xs py-2 rounded hover:bg-red-500/20 font-bold border border-red-500/20">➖ Deduct (GH₵)</button>
              </div>
              <button onClick={() => toggleFreeze(selectedUser)} className="w-full bg-blue-500/10 text-blue-400 text-sm py-2 rounded hover:bg-blue-500/20 font-bold border border-blue-500/20">
                {selectedUser.is_wallet_frozen ? '❄️ Unfreeze Wallet' : '❄️ Freeze Wallet'}
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Governance</h4>
              <button className="w-full bg-orange-500/10 text-orange-500 text-sm py-2 rounded hover:bg-orange-500/20 text-left px-4 font-bold border border-orange-500/20">⏸️ Suspend Account (7d)</button>
              <button className="w-full bg-purple-500/10 text-purple-400 text-sm py-2 rounded hover:bg-purple-500/20 text-left px-4 font-bold border border-purple-500/20">👻 Toggle Shadowban</button>
              <button className="w-full bg-red-900/50 text-red-500 text-sm py-2 rounded hover:bg-red-900 text-left px-4 font-bold border border-red-900">🛡️ Ban Device / IP</button>
              <button className="w-full bg-gray-800 text-gray-300 text-sm py-2 rounded hover:bg-gray-700 text-left px-4 font-bold border border-gray-600">👁️ View As This User</button>
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
    await supabase.channel('horpal_godmode_command').send({
      type: 'broadcast',
      event: 'GOD_VOICE_WARNING',
      payload: { target, level, message, timestamp: Date.now() }
    });

    // 2. Official Email (if target is email)
    if (target.includes('@')) {
      await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
