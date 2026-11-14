'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Clock,
  ArrowUpCircle,
  Download,
  Copy,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { syncAuthenticatedUserProfile } from '../../components/auth/HorPalAuthGate';
import PillarAccessGuard from '../../components/auth/PillarAccessGuard';
import { useAdminRealtimeEnforcement } from '../../hooks/useAdminRealtimeEnforcement';
import { authFetch } from '../../utils/authFetch';
import {
  auditAccount,
  consumeVerifyReturn,
  EntitlementRow,
  hasPillar3Access,
  purgeLegacyAccessFlags,
} from '../../utils/pillarAccess';

const Pillar3AccessGate = dynamic(
  () => import('../../components/auth/Pillar3AccessGate'),
  { ssr: false }
);

const MODES = [
  { id: 'argon4pro', label: 'Argon 4 Pro (Ultra)' },
  { id: 'argon4', label: 'Argon 4 Reasoning' },
  { id: 'balanced', label: 'All-Around Help' },
  { id: 'quick', label: 'Quick Answers' },
];

export type PersonaModeId =
  | 'general'
  | 'code_architect'
  | 'business_strategist'
  | 'exam_tutor';

const AI_PERSONAS: {
  id: PersonaModeId;
  label: string;
  shortLabel: string;
  desc: string;
  badgeColor: string;
}[] = [
  {
    id: 'general',
    label: '⚡ General Genius',
    shortLabel: '⚡ General Genius',
    desc: '24/7 Ultra-Fast Neural Chat, Research & Executive Problem Solving',
    badgeColor: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/50 text-cyan-200',
  },
  {
    id: 'code_architect',
    label: '💻 Full-Stack Code Architect',
    shortLabel: '💻 Code Architect',
    desc: 'Next.js, TypeScript, Python, FinTech APIs, Smart Contracts & System Design',
    badgeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/50 text-emerald-200',
  },
  {
    id: 'business_strategist',
    label: '📈 Business & Marketing Strategist',
    shortLabel: '📈 Business Strategist',
    desc: 'GH₵ 50k/Mo Revenue Blueprints, Viral Ad Scripts & High-Ticket Funnels',
    badgeColor: 'from-amber-500/20 to-orange-500/20 border-amber-400/50 text-amber-200',
  },
  {
    id: 'exam_tutor',
    label: '🎓 Exam & Academic Tutor',
    shortLabel: '🎓 Exam & Study Tutor',
    desc: 'University & Professional Exam Breakdown, Math Proofs & Study Sheets',
    badgeColor: 'from-purple-500/20 to-fuchsia-500/20 border-purple-400/50 text-purple-200',
  },
];

const MASTER_PROMPT_VAULT: {
  persona: PersonaModeId;
  category: string;
  title: string;
  prompt: string;
}[] = [
  {
    persona: 'business_strategist',
    category: '📈 WEALTH & LAUNCH BLUEPRINT',
    title: 'GH₵ 50,000/Month Digital Product & Funnel Blueprint',
    prompt:
      'Build a complete step-by-step 30-day blueprint to reach GH₵ 50,000/month selling digital products and SaaS in Ghana and worldwide, including offer pricing, daily traffic system, WhatsApp/Paystack closing script, and weekly revenue milestones.',
  },
  {
    persona: 'code_architect',
    category: '💻 FULL-STACK CODE ARCHITECT',
    title: 'Production FinTech Paystack + Supabase Escrow Architecture',
    prompt:
      'Architect a production-ready Next.js App Router + TypeScript + Supabase + Paystack webhook verification system with idempotency, row-level security, and automated ledger reconciliation. Provide clean, copy-ready code.',
  },
  {
    persona: 'business_strategist',
    category: '🔥 VIRAL AD SCRIPTWRITER',
    title: 'High-Converting TikTok, Reels & YouTube Ad Script',
    prompt:
      'Write 3 high-converting 45-second viral video ad scripts (Hook, Agitation, Proof, Offer, CTA) designed to convert cold viewers into paid members on mobile.',
  },
  {
    persona: 'exam_tutor',
    category: '🎓 EXAM & ACADEMIC MASTER',
    title: 'Executive Exam Study Sheet & First-Principles Breakdown',
    prompt:
      'Create a structured First-Principles Master Study Sheet on Macroeconomics, Corporate Finance & Algorithmic Problem Solving, complete with key formulas, memory hooks, and 5 exam-level practice questions with step-by-step solutions.',
  },
  {
    persona: 'general',
    category: '🎬 AI VIDEO & VISUAL STUDIO',
    title: 'Generate Master 4K AI Video Production Prompt',
    prompt:
      'Create an AI Video Studio Prompt for a cinematic 4K commercial showcasing a futuristic African tech metropolis with golden-hour lighting, camera motion cues, lens specs, and negative prompts.',
  },
  {
    persona: 'code_architect',
    category: '⚡ SAAS MVP GENERATOR',
    title: 'Design an AI Micro-SaaS App From Scratch',
    prompt:
      'Give me a complete technical architecture, database schema, and monetization plan for a profitable AI Micro-SaaS that can be built in 7 days using Next.js, Tailwind CSS, and Supabase.',
  },
];

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  persona?: PersonaModeId;
  createdAt?: string;
  isText?: boolean;
  jobId?: string;
  jobType?: 'image' | 'video';
  mediaUrl?: string;
  mediaStatus?: 'pending' | 'completed' | 'failed';
};

function formatCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function getTierHeaderMeta(tierRaw?: string | null) {
  const tier = (tierRaw || 'pro').toLowerCase();
  if (tier === 'weekly') {
    return {
      label: '⚡ WEEKLY PASS',
      shortName: 'Weekly',
      badgeClass:
        'bg-cyan-500/15 border-cyan-400/45 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]',
    };
  }
  if (tier === 'premium') {
    return {
      label: '👑 PREMIUM ANNUAL',
      shortName: 'Premium',
      badgeClass:
        'bg-amber-500/15 border-amber-400/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.28)]',
    };
  }
  return {
    label: '🚀 PRO MONTHLY',
    shortName: 'Pro',
    badgeClass:
      'bg-indigo-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]',
  };
}

export default function HorpalAIPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [deniedAudit, setDeniedAudit] = useState<{
    email: string;
    entitlements: EntitlementRow | null;
  } | null>(null);
  const returningFromOAuthRef = useRef(false);

  // Upgrade / Renewal Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const expiryLockTriggeredRef = useRef(false);

  const { settings: platformSettings } = useAdminRealtimeEnforcement({
    pillar: 3,
    onForceOpenPaywall: () => {
      setExpiredMessage('Your Pillar 3 AI access has been revoked or expired. Please renew to continue.');
      setShowUpgradeModal(true);
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              has_paid_pillar3: false,
              is_pillar3_paid: false,
              pillar3_access: false,
              pillar3_tier: 'none',
            }
          : prev
      );
    },
    onForceUnlockPillar: (_pillarNum, updatedProfile) => {
      setExpiredMessage(null);
      setShowUpgradeModal(false);
      setDeniedAudit(null);
      expiryLockTriggeredRef.current = false;
      if (updatedProfile) {
        setProfile((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
    },
    onProfileChanged: (updatedProfile) => {
      if (updatedProfile) {
        setProfile((prev: any) => ({ ...(prev || {}), ...updatedProfile }));
      }
    },
  });

  const activePromptVault = useMemo(() => {
    const customPrompts = Array.isArray((platformSettings as any)?.pillar3_featured_prompts)
      ? (platformSettings as any).pillar3_featured_prompts
          .filter((p: any) => p && p.title && p.prompt)
          .map((p: any) => ({
            persona: (p.persona || 'general') as PersonaModeId,
            category: p.category || '👑 ADMIN FEATURED PROMPT',
            title: p.title,
            prompt: p.prompt,
          }))
      : [];
    return customPrompts.length > 0 ? [...customPrompts, ...MASTER_PROMPT_VAULT] : MASTER_PROMPT_VAULT;
  }, [platformSettings]);

  // AI Studio Controls
  const [activeMode, setActiveMode] = useState(MODES[0].id);
  const [activePersona, setActivePersona] = useState<PersonaModeId>('general');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModeData = MODES.find((m) => m.id === activeMode);
  const activePersonaData =
    AI_PERSONAS.find((p) => p.id === activePersona) || AI_PERSONAS[0];

  // Load user & profile + verify Pillar 3 access
  useEffect(() => {
    let mounted = true;
    purgeLegacyAccessFlags();
    const verifyReturn = consumeVerifyReturn();
    if (verifyReturn === 3) {
      returningFromOAuthRef.current = true;
    }

    const loadSessionAndProfile = async (activeSession: any) => {
      if (!activeSession?.user) {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setDeniedAudit(null);
          setAuthChecking(false);
        }
        return;
      }

      const [synced, initialEnt] = await Promise.all([
        syncAuthenticatedUserProfile(activeSession.user),
        auditAccount(activeSession.user.id, activeSession.user.email || '').catch(() => null),
      ]);

      let liveEnt = initialEnt;
      let prof: any = liveEnt
        ? { ...(synced || {}), ...liveEnt }
        : synced;

      // Check server-side subscription status in case timer already expired while away
      if (prof?.has_paid_pillar3 && prof?.pillar3_expires_at) {
        const expMs = new Date(prof.pillar3_expires_at).getTime();
        if (Number.isFinite(expMs) && Date.now() >= expMs) {
          try {
            const res = await authFetch('/api/pillar3/subscription-status', {
              method: 'POST',
              body: JSON.stringify({}),
            });
            const statusData = await res.json();
            if (statusData?.expired) {
              const prevTierLabel = getTierHeaderMeta(statusData.previousTier).shortName;
              setExpiredMessage(
                `⏰ Your Pillar 3 ${prevTierLabel} Pass has expired! Select a plan to continue using Earnmega AI Studio.`
              );
              liveEnt = await auditAccount(activeSession.user.id, activeSession.user.email || '').catch(
                () => null
              );
              prof = liveEnt
                ? { ...(prof || {}), ...liveEnt }
                : {
                    ...prof,
                    has_paid_pillar3: false,
                    pillar3_tier: 'none',
                  };
            }
          } catch (_) {}
        }
      }

      if (mounted) {
        if (hasPillar3Access(liveEnt)) {
          setDeniedAudit(null);
        } else if (returningFromOAuthRef.current) {
          setDeniedAudit({
            email: activeSession.user.email || synced?.email || '',
            entitlements: liveEnt,
          });
        }
        setSession(activeSession);
        setProfile(prof);
        setAuthChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      loadSessionAndProfile(initialSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        await loadSessionAndProfile(nextSession);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // PHASE 6.4: Strict User-Scoped Chat History (`earnmega_pillar3_chats_${user.id}`)
  const userChatStorageKey = useMemo(() => {
    if (!session?.user?.id) return null;
    return `earnmega_pillar3_chats_${session.user.id}`;
  }, [session?.user?.id]);

  useEffect(() => {
    if (!userChatStorageKey || typeof window === 'undefined') {
      setMessages([]);
      return;
    }
    try {
      const saved = localStorage.getItem(userChatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch (_) {}
    setMessages([]);
  }, [userChatStorageKey]);

  useEffect(() => {
    if (!userChatStorageKey || typeof window === 'undefined') return;
    try {
      localStorage.setItem(userChatStorageKey, JSON.stringify(messages.slice(-60)));
    } catch (_) {}
  }, [messages, userChatStorageKey]);

  // PHASE 6.1 & 6.2: Real-Time Second-by-Second Countdown Timer + Instant 00:00:00 Expiry Lockout & Admin Alert
  const handleInstantExpiryLockout = useCallback(async () => {
    if (expiryLockTriggeredRef.current || !session?.user?.id) return;
    expiryLockTriggeredRef.current = true;

    const currentTierMeta = getTierHeaderMeta(profile?.pillar3_tier);
    const lockMsg = `⏰ Your Pillar 3 ${currentTierMeta.shortName} Pass has expired! Select a plan to continue using Earnmega AI Studio.`;
    setExpiredMessage(lockMsg);
    setShowUpgradeModal(false);

    try {
      await authFetch('/api/pillar3/subscription-status', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (_) {}

    setProfile((prev: any) =>
      prev
        ? {
            ...prev,
            has_paid_pillar3: false,
            pillar3_tier: 'none',
          }
        : prev
    );

    toast.error(lockMsg, { duration: 6000 });
  }, [session?.user?.id, profile?.pillar3_tier]);

  useEffect(() => {
    if (!profile?.has_paid_pillar3 || !profile?.pillar3_expires_at) {
      setRemainingMs(0);
      return;
    }

    expiryLockTriggeredRef.current = false;

    const tick = () => {
      const expMs = new Date(profile.pillar3_expires_at).getTime();
      if (!Number.isFinite(expMs)) {
        setRemainingMs(0);
        return;
      }
      const diff = expMs - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        handleInstantExpiryLockout();
      } else {
        setRemainingMs(diff);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [profile?.has_paid_pillar3, profile?.pillar3_expires_at, handleInstantExpiryLockout]);

  const userIdentity = useMemo(() => {
    const authUser = session?.user;
    const meta = authUser?.user_metadata || {};
    const rawFullName = (
      profile?.full_name ||
      profile?.name ||
      meta?.full_name ||
      meta?.name ||
      ''
    ).trim();
    const parts = rawFullName ? rawFullName.split(/\s+/) : [];
    const firstName = (
      profile?.first_name ||
      profile?.pillar2_first_name ||
      meta?.first_name ||
      parts[0] ||
      profile?.username ||
      meta?.username ||
      (authUser?.email ? authUser.email.split('@')[0] : '') ||
      'Creator'
    ).trim();
    const lastName = (
      profile?.last_name ||
      profile?.pillar2_last_name ||
      meta?.last_name ||
      parts.slice(1).join(' ') ||
      ''
    ).trim();
    const fullName = rawFullName || `${firstName} ${lastName}`.trim() || firstName;
    const username = (
      profile?.username ||
      meta?.username ||
      meta?.preferred_username ||
      firstName
    )
      .replace(/^@+/, '')
      .trim();

    const fi = firstName.charAt(0);
    const li = lastName.charAt(0);
    const initials =
      fi && li
        ? `${fi}${li}`.toUpperCase()
        : fi
        ? fi.slice(0, 2).toUpperCase()
        : username.slice(0, 2).toUpperCase() || 'AI';

    return {
      firstName,
      lastName,
      fullName,
      username,
      initials,
      email: authUser?.email || profile?.email || '',
    };
  }, [session, profile]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out of horpal.ai:', err);
    }
    purgeLegacyAccessFlags();
    window.location.href = '/';
  };

  const handleClearChat = () => {
    setMessages([]);
    if (userChatStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(userChatStorageKey);
      } catch (_) {}
    }
    toast.success('Started a fresh AI Studio session.');
  };

  // PHASE 6.4: One-Click Export Responses to Clean Markdown / Code / Study Sheets
  const exportMarkdownSheet = (content: string, titleHint = 'ai-studio-export') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const header = `# Earnmega AI Studio — Executive Study & Strategy Sheet\n- **Prepared For:** ${userIdentity.fullName} (@${userIdentity.username})\n- **Persona Mode:** ${activePersonaData.label}\n- **Date:** ${timestamp}\n\n---\n\n`;
    const fullMarkdown = `${header}${content}\n`;

    try {
      const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titleHint}-${timestamp}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('📄 Exported clean Markdown / Study Sheet (.md)!');
    } catch (_) {
      navigator.clipboard.writeText(fullMarkdown);
      toast.success('📋 Copied formatted Study Sheet to clipboard!');
    }
  };

  const exportFullConversation = () => {
    if (messages.length === 0) return;
    const body = messages
      .map((m) =>
        m.role === 'user'
          ? `### 👤 ${userIdentity.firstName}:\n${m.content}\n`
          : `### 🤖 Earnmega AI Studio (${
              AI_PERSONAS.find((p) => p.id === m.persona)?.shortLabel || activePersonaData.shortLabel
            }):\n${m.content}\n`
      )
      .join('\n---\n\n');
    exportMarkdownSheet(body, 'earnmega-ai-session');
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    toast.success('Copied response to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  const activeIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    return () => {
      Object.values(activeIntervals.current).forEach(clearInterval);
    };
  }, []);

  const pollJobStatus = async (jobId: string, type: 'image' | 'video', msgId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/horpal-ai/poll?id=${jobId}&type=${type}`);
        if (res.ok) {
          const data = await res.json();
          if (
            data.status === 'complete' ||
            data.status === 'completed' ||
            data.status === 'success'
          ) {
            const mediaUrl = data.url;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      mediaStatus: 'completed',
                      mediaUrl,
                      content: 'Media generated successfully.',
                    }
                  : m
              )
            );
            clearInterval(pollInterval);
            delete activeIntervals.current[jobId];
          } else if (data.status === 'failed' || data.status === 'error' || data.error) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      mediaStatus: 'failed',
                      content: 'Failed to generate media. ' + (data.error || ''),
                    }
                  : m
              )
            );
            clearInterval(pollInterval);
            delete activeIntervals.current[jobId];
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 3000);
    activeIntervals.current[jobId] = pollInterval;
  };

  const handleSend = async (
    text: string = prompt,
    overridePersona?: PersonaModeId
  ) => {
    if (!text.trim() && attachedFiles.length === 0) return;

    // Double-check active pass before sending
    if (!hasPillar3Access(profile)) {
      handleInstantExpiryLockout();
      return;
    }

    const chosenPersona = overridePersona || activePersona;
    if (overridePersona && overridePersona !== activePersona) {
      setActivePersona(overridePersona);
    }

    const userMessage = text.trim();
    setPrompt('');
    setAttachedFiles([]);
    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: userMessage,
        persona: chosenPersona,
        createdAt: new Date().toISOString(),
      },
    ]);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await authFetch('/api/horpal-ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: userMessage,
          mode: activeMode,
          persona: chosenPersona,
          tier: profile?.pillar3_tier || 'pro',
          userProfile: {
            full_name: userIdentity.fullName,
            first_name: userIdentity.firstName,
            username: userIdentity.username,
          },
        }),
      });

      const aiMsgId = (Date.now() + 1).toString();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'ai',
            persona: chosenPersona,
            content:
              errorData.error ||
              errorData.content ||
              'An error occurred while processing your request.',
            isText: true,
          },
        ]);
      } else {
        const data = await response.json();

        if (data.isText) {
          setMessages((prev) => [
            ...prev,
            {
              id: aiMsgId,
              role: 'ai',
              persona: chosenPersona,
              content: data.content,
              isText: true,
            },
          ]);
        } else {
          const isFallback = data.id?.startsWith('fallback-');
          setMessages((prev) => [
            ...prev,
            {
              id: aiMsgId,
              role: 'ai',
              persona: chosenPersona,
              content: data.message,
              isText: false,
              jobId: data.id,
              jobType: data.type,
              mediaStatus: isFallback ? 'completed' : 'pending',
              mediaUrl: isFallback ? data.instantUrl : undefined,
            },
          ]);

          if (data.id && !isFallback) {
            pollJobStatus(data.id, data.type, aiMsgId);
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          persona: chosenPersona,
          content:
            "I'm sorry, I encountered an error while processing your request. Please try again.",
        },
      ]);
      setIsLoading(false);
    }
  };

  // Render Markdown + Code Blocks cleanly
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const langMatch = part.match(/^```([a-zA-Z0-9_-]*)\n?/);
        const lang = langMatch?.[1] || 'code';
        const code = part.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
        return (
          <div
            key={i}
            className="relative mt-3 mb-3 rounded-xl bg-[#090B11] border border-cyan-500/25 overflow-hidden font-mono text-xs sm:text-sm"
          >
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10 text-cyan-300 text-xs">
              <span className="uppercase font-bold">{lang}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Code copied to clipboard!');
                }}
                className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-bold transition-colors"
              >
                Copy Code
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-zinc-200">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return (
                <strong key={j} className="text-white font-semibold">
                  {bp.slice(2, -2)}
                </strong>
              );
            }
            return bp;
          })}
        </span>
      );
    });
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#06070B]">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="mt-4 text-cyan-300 font-mono text-xs uppercase tracking-widest">
          Verifying Pillar 3 AI Studio Pass...
        </p>
      </div>
    );
  }

  // STRICT PILLAR 3 ENTRY RULE:
  // User can ONLY enter Pillar 3 if session?.user && hasPillar3Access(profile) (has_paid_pillar3 === true && ref && expires > now)
  if (!session?.user || !hasPillar3Access(profile)) {
    const activeEmail = session?.user?.email || profile?.email || '';
    return (
      <div className="min-h-screen bg-[#06070B]">
        <Pillar3AccessGate
          isOpen={true}
          currentUser={session?.user}
          currentProfile={profile}
          currentEntitlements={profile}
          initialDeniedAudit={
            deniedAudit ||
            (session?.user
              ? {
                  email: activeEmail,
                  entitlements: profile,
                }
              : null)
          }
          expiredMessage={expiredMessage}
          onClose={() => {
            purgeLegacyAccessFlags();
            window.location.href = '/';
          }}
          onAccessGranted={(authedUser, updatedProfile) => {
            setDeniedAudit(null);
            setExpiredMessage(null);
            expiryLockTriggeredRef.current = false;
            setSession({ user: authedUser });
            setProfile(updatedProfile);
          }}
        />
      </div>
    );
  }

  const tierMeta = getTierHeaderMeta(profile?.pillar3_tier);

  return (
    <PillarAccessGuard
      pillar={3}
      renderPaywall={({ user, entitlements, recheck }) => {
        const guardEmail = user.email || '';
        return (
          <div className="min-h-screen bg-[#06070B]">
            <Pillar3AccessGate
              isOpen={true}
              currentUser={user}
              currentProfile={entitlements}
              currentEntitlements={entitlements}
              initialDeniedAudit={{
                email: guardEmail,
                entitlements,
              }}
              expiredMessage={expiredMessage}
              onClose={() => {
                purgeLegacyAccessFlags();
                window.location.href = '/';
              }}
              onAccessGranted={async (authedUser, updatedProfile) => {
                setDeniedAudit(null);
                setExpiredMessage(null);
                expiryLockTriggeredRef.current = false;
                setSession({ user: authedUser });
                setProfile(updatedProfile);
                await recheck();
              }}
            />
          </div>
        );
      }}
    >
      <div className="flex flex-col min-h-screen bg-[#06070B] text-zinc-100 font-sans relative overflow-hidden">
      {/* Ambient Aurora Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/15 via-[#06070B] to-[#06070B] mix-blend-screen opacity-60 blur-[100px]" />
        <div className="absolute bottom-0 right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/15 via-transparent to-transparent opacity-40 blur-[100px]" />
      </div>

      {/* Top Navigation + Live Second-by-Second Countdown Badge + Extend/Upgrade Button */}
      <header className="relative z-20 border-b border-white/10 bg-[#06070B]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Hub Back Link + Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors text-xs sm:text-sm font-semibold"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Hub</span>
            </Link>

            {/* Neural Engine Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs sm:text-sm font-semibold text-white"
              >
                <Sparkles size={13} className="text-cyan-400" />
                <span>{activeModeData?.label}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-[#0E0F14] border border-white/15 shadow-2xl overflow-hidden z-50"
                  >
                    {MODES.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setActiveMode(mode.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs sm:text-sm font-semibold transition-colors ${
                          activeMode === mode.id
                            ? 'bg-cyan-500/15 text-cyan-300'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center: PHASE 6.1 LIVE SECOND-BY-SECOND COUNTDOWN BADGE + EXTEND/UPGRADE BUTTON */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-black tracking-wide ${tierMeta.badgeClass}`}
            >
              <Clock size={13} className="shrink-0 animate-pulse" />
              <span>
                {tierMeta.label} • {formatCountdown(remainingMs)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-cyan-400 text-black font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              <ArrowUpCircle size={14} />
              <span>⬆️ Extend / Upgrade Plan</span>
            </button>
          </div>

          {/* Right: Export + User Avatar Badge + Sign Out */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={exportFullConversation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition cursor-pointer"
                  title="Export full session to Markdown / Study Sheet"
                >
                  <Download size={13} />
                  <span className="hidden md:inline">Export .MD</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  title="Start New Chat"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}

            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-cyan-500/30"
              title={`${userIdentity.fullName} (@${userIdentity.username})`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 text-cyan-200 font-bold text-[11px] flex items-center justify-center">
                {userIdentity.initials}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-zinc-200 max-w-[100px] truncate">
                {userIdentity.firstName}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* PHASE 6.4: EXECUTIVE AI PERSONA MODE SWITCHER BAR */}
        <div className="border-t border-white/5 bg-[#080A12]/90 px-3 sm:px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 shrink-0 mr-1">
              AI Persona:
            </span>
            {AI_PERSONAS.map((p) => {
              const isSelected = activePersona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePersona(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? `bg-gradient-to-r ${p.badgeColor} shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-[1.01]`
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="relative z-10 flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 pb-36 pt-6 overflow-y-auto overflow-x-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-3">
              <Sparkles size={13} />
              <span>{activePersonaData.label} Active</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-amber-200">
              Welcome to Earnmega AI Studio, {userIdentity.firstName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mb-7">
              {activePersonaData.desc}
            </p>

            {/* PHASE 6.4: ONE-TAP MASTER PROMPT VAULT */}
            <div className="w-full max-w-3xl text-left">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                  ⚡ One-Tap Master Prompt Vault (High-ROI Templates)
                </span>
                <span className="text-[11px] text-zinc-500">Tap any card to launch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activePromptVault.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(item.prompt, item.persona)}
                    className="p-4 rounded-2xl bg-[#0D101B]/90 border border-white/10 hover:border-cyan-400/50 hover:bg-[#121726] transition-all text-left group shadow-lg cursor-pointer"
                  >
                    <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      {item.category}
                    </div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mb-1">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex gap-3 sm:gap-4 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.4)] mt-1">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-3xl px-5 py-4 text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-950/90 to-indigo-950/90 border border-cyan-400/30 text-zinc-100 rounded-tr-sm'
                      : 'bg-[#0C0E17]/90 text-zinc-200 border border-white/10'
                  }`}
                >
                  {msg.role === 'ai' && msg.persona && (
                    <div className="mb-2 flex items-center justify-between gap-2 pb-1.5 border-b border-white/5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                        {AI_PERSONAS.find((p) => p.id === msg.persona)?.shortLabel ||
                          '⚡ Earnmega AI'}
                      </span>
                    </div>
                  )}

                  {renderContent(msg.content)}

                  {msg.mediaStatus === 'pending' && (
                    <div className="mt-4 flex items-center gap-3 text-sm text-cyan-300">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                      Earnmega AI Studio is rendering your media...
                    </div>
                  )}

                  {msg.mediaStatus === 'completed' && msg.mediaUrl && (
                    <div className="mt-4 relative group rounded-2xl overflow-hidden border border-white/10 bg-black">
                      {msg.jobType === 'image' ? (
                        <img
                          src={msg.mediaUrl}
                          alt="Generated Visual"
                          className="w-full h-auto object-cover max-h-96"
                        />
                      ) : (
                        <video
                          src={msg.mediaUrl}
                          controls
                          autoPlay
                          loop
                          playsInline
                          className="w-full h-auto max-h-96"
                        />
                      )}
                    </div>
                  )}

                  {/* PHASE 6.4: One-Click Export Response to Clean Markdown / Study Sheet + Copy */}
                  {msg.role === 'ai' && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          exportMarkdownSheet(msg.content, `earnmega-study-sheet-${msg.id.slice(-4)}`)
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-semibold transition cursor-pointer"
                      >
                        <Download size={12} />
                        <span>📄 Export Markdown / Study Sheet</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5 h-8 px-4 rounded-2xl bg-white/5 border border-white/10">
                  <div
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="text-xs text-zinc-400 ml-1.5">
                    {activePersonaData.shortLabel} thinking...
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Bottom Input Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-5 z-30 bg-gradient-to-t from-[#06070B] via-[#06070B]/95 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-2">
              {attachedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[#0E0F14] border border-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-full shadow-sm"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative bg-[#11131D]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-[28px] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex items-end gap-2 focus-within:border-cyan-400 transition-all">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              multiple
              accept="image/*,video/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 mb-0.5 shrink-0"
              title="Attach files"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                handleInput();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask ${activePersonaData.shortLabel} anything, ${userIdentity.firstName}...`}
              className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none outline-none text-zinc-100 py-3 px-2 placeholder:text-zinc-500 text-base sm:text-[14px] leading-snug"
              rows={1}
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!prompt.trim() || isLoading}
              className="p-3 mb-0.5 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 text-black hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* EXTEND / UPGRADE PLAN MODAL (WITH SMART TIME-STACKING) */}
      <Pillar3AccessGate
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentUser={session?.user}
        currentProfile={profile}
        isUpgradeMode={true}
        onAccessGranted={(authedUser, updatedProfile) => {
          setShowUpgradeModal(false);
          setExpiredMessage(null);
          expiryLockTriggeredRef.current = false;
          setSession({ user: authedUser });
          setProfile(updatedProfile);
        }}
      />
      </div>
    </PillarAccessGuard>
  );
}
