'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import HorPalAuthGate, { syncAuthenticatedUserProfile } from '../../components/auth/HorPalAuthGate';

const MODES = [
  { id: 'quick', label: 'Quick Answers' },
  { id: 'balanced', label: 'All-Around Help' },
  { id: 'argon4', label: 'Argon 4' },
  { id: 'argon4pro', label: 'Argon 4 Pro' }
];

const STARTER_PROMPTS = [
  "Create Viral Product Visuals",
  "Draft High-Converting Affiliate Copy",
  "Generate AI Video Studio Prompt",
  "Analyze Market Trends"
];

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isText?: boolean;
  jobId?: string;
  jobType?: 'image' | 'video';
  mediaUrl?: string;
  mediaStatus?: 'pending' | 'completed' | 'failed';
};

export default function HorpalAIPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [activeMode, setActiveMode] = useState(MODES[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModeData = MODES.find(m => m.id === activeMode);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          setSession(activeSession);
          localStorage.removeItem('horpal_target_pillar');
          const synced = await syncAuthenticatedUserProfile(activeSession.user);
          if (synced) {
            setProfile(synced);
          } else {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', activeSession.user.id)
              .maybeSingle();
            setProfile(prof);
          }
        } else {
          setSession(null);
          setProfile(null);
          localStorage.setItem('horpal_target_pillar', '3');
        }
      } catch (err) {
        console.error('horpal.ai auth check error:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (nextSession?.user) {
          setSession(nextSession);
          localStorage.removeItem('horpal_target_pillar');
          const synced = await syncAuthenticatedUserProfile(nextSession.user);
          if (synced) setProfile(synced);
        } else {
          setSession(null);
          setProfile(null);
        }
        setAuthChecking(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
      'Friend'
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
        : username.slice(0, 2).toUpperCase() || 'HP';

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
    try {
      localStorage.removeItem('horpal_target_pillar');
    } catch (_) {}
    window.location.href = '/';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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
        const res = await fetch(`/api/horpal-ai/poll?id=${jobId}&type=${type}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'complete' || data.status === 'completed' || data.status === 'success') {
            const mediaUrl = data.url;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaStatus: 'completed', mediaUrl, content: 'Media generated successfully.' } : m));
            clearInterval(pollInterval);
            delete activeIntervals.current[jobId];
          } else if (data.status === 'failed' || data.status === 'error' || data.error) {
             setMessages(prev => prev.map(m => m.id === msgId ? { ...m, mediaStatus: 'failed', content: 'Failed to generate media. ' + (data.error || '') } : m));
             clearInterval(pollInterval);
             delete activeIntervals.current[jobId];
          }
        }
      } catch (err) {
         console.error("Polling error", err);
      }
    }, 3000);
    activeIntervals.current[jobId] = pollInterval;
  };

  const handleSend = async (text: string = prompt) => {
    if (!text.trim() && attachedFiles.length === 0) return;

    const userMessage = text.trim();
    setPrompt('');
    setAttachedFiles([]);
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/horpal-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          mode: activeMode,
          userProfile: {
            full_name: userIdentity.fullName,
            first_name: userIdentity.firstName,
            username: userIdentity.username,
          },
        })
      });

      const aiMsgId = (Date.now() + 1).toString();

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: errorData.error || errorData.content || 'An error occurred. Check if MAGIC_HOUR_API_KEY is configured.', isText: true }]);
      } else {
         const data = await response.json();

         if (data.isText) {
            setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: data.content, isText: true }]);
         } else {
            // It's a media job
            const isFallback = data.id?.startsWith('fallback-');
            setMessages(prev => [...prev, {
              id: aiMsgId,
              role: 'ai',
              content: data.message,
              isText: false,
              jobId: data.id,
              jobType: data.type,
              mediaStatus: isFallback ? 'completed' : 'pending',
              mediaUrl: isFallback ? data.instantUrl : undefined
            }]);

            if (data.id && !isFallback) {
               pollJobStatus(data.id, data.type, aiMsgId);
            }
         }
      }
      setIsLoading(false);

    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "I'm sorry, I encountered an error while processing your request. Please try again." }]);
      setIsLoading(false);
    }
  };

  // Helper to render markdown-like formatting simply
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.replace(/```[a-z]*\n?/, '').replace(/```$/, '');
        return (
          <div key={i} className="relative mt-2 mb-2 rounded-xl bg-[#0E0F14] border border-white/10 overflow-hidden font-mono text-sm">
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5 text-zinc-400 text-xs">
               <span>Code</span>
               <button onClick={() => navigator.clipboard.writeText(code)} className="hover:text-white transition-colors">Copy</button>
            </div>
            <pre className="p-4 overflow-x-auto text-zinc-300"><code>{code}</code></pre>
          </div>
        );
      }

      // Simple bold
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={j} className="text-white font-semibold">{bp.slice(2, -2)}</strong>;
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
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="mt-4 text-purple-400 font-mono text-xs uppercase tracking-widest">
          Loading horpal.ai...
        </p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <HorPalAuthGate
        defaultTargetPillar="3"
        onAuthenticated={(authedUser, syncedProf) => {
          setSession({ user: authedUser });
          if (syncedProf) setProfile(syncedProf);
        }}
        onBackToHub={() => {
          localStorage.removeItem('horpal_target_pillar');
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#06070B] text-zinc-100 font-sans relative overflow-hidden">
      {/* Ambient Aurora Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#06070B] to-[#06070B] mix-blend-screen opacity-50 blur-[100px]"></div>
        <div className="absolute bottom-0 right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent opacity-30 blur-[100px]"></div>
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 bg-[#06070B]/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span className="text-sm font-medium">Hub</span>
        </Link>

        {/* Mode Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            {activeModeData?.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-2xl bg-[#0E0F14] border border-white/10 shadow-2xl overflow-hidden z-50"
              >
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => { setActiveMode(mode.id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${activeMode === mode.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Brand + User Avatar Badge + Quick Sign Out */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 mr-1">
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">horpal.ai</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          </div>

          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/5 border border-purple-500/30"
            title={`${userIdentity.fullName} (@${userIdentity.username})`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-400/40 text-purple-200 font-bold text-xs flex items-center justify-center">
              {userIdentity.initials}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-zinc-200 max-w-[110px] truncate">
              {userIdentity.firstName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
            title="Sign Out of HorPal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="relative z-10 flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 pb-32 pt-8 overflow-y-auto overflow-x-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-500 animate-pulse">
              Welcome to horpal.ai, {userIdentity.firstName}
            </h1>
            <p className="text-lg text-zinc-400 mb-12">
              How can I elevate your workflow today, {userIdentity.firstName}?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(starter)}
                  className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all text-sm font-medium text-zinc-300 text-left backdrop-blur-md"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((msg) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-3xl px-6 py-4 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
                    : 'bg-transparent text-zinc-300 border border-white/5'
                }`}>
                  {renderContent(msg.content)}

                  {msg.mediaStatus === 'pending' && (
                     <div className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
                        <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                        horpal.ai is rendering your media...
                     </div>
                  )}

                  {msg.mediaStatus === 'completed' && msg.mediaUrl && (
                     <div className="mt-4 relative group rounded-2xl overflow-hidden border border-white/10 bg-black">
                        {msg.jobType === 'image' ? (
                          <img src={msg.mediaUrl} alt="Generated UI" className="w-full h-auto object-cover max-h-96" />
                        ) : (
                          <video src={msg.mediaUrl} controls autoPlay loop playsInline className="w-full h-auto max-h-96" />
                        )}
                        <button onClick={async () => {
                           try {
                             const res = await fetch(msg.mediaUrl!);
                             const blob = await res.blob();
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = msg.jobType === 'video' ? 'generated-video.mp4' : 'generated-image.png';
                             a.click();
                             URL.revokeObjectURL(url);
                           } catch (e) {
                             console.error('Download failed', e);
                             window.open(msg.mediaUrl, '_blank');
                           }
                        }} className="absolute bottom-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        </button>
                     </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 animate-pulse">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </div>
                <div className="flex items-center gap-1 h-8">
                  <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Bottom Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-30 bg-gradient-to-t from-[#06070B] via-[#06070B] to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">

          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-2">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#0E0F14] border border-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-full shadow-sm">
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="hover:text-white transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative bg-[#111218]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 shadow-2xl flex items-end gap-2 focus-within:border-white/20 focus-within:bg-[#15161C]/90 transition-all">

            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              multiple
              accept="image/*,video/*,.pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 mb-1 shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
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
              placeholder={`Ask horpal.ai anything, ${userIdentity.firstName}...`}
              className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none outline-none text-zinc-100 py-3 px-2 placeholder:text-zinc-500 text-[14px] leading-snug"
              rows={1}
            />

            <button
              onClick={() => handleSend()}
              disabled={!prompt.trim() || isLoading}
              className="p-3 mb-1 shrink-0 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/50 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
          <div className="text-center mt-2 text-[11px] text-zinc-600 font-medium">
            horpal.ai can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
