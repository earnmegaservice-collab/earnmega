"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, Sparkles, Mic, MicOff, Settings, X, Video, Users, Gift, Flame, Play, Heart, MessageCircle, Send, UserPlus, Coins } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LiveGiftDrawer from './LiveGiftDrawer';
import GuestRequestDrawer from './GuestRequestDrawer';

interface LiveStream {
  id: string;
  host_id: string;
  title: string;
  category: string;
  gift_goal: number;
  allow_cohost: boolean;
  viewer_count: number;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  host: {
    username: string;
    avatar_url: string;
    first_name: string;
  };
}

export default function LiveArena({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'DISCOVERY' | 'GREEN_ROOM' | 'LIVE_BROADCAST'>('DISCOVERY');

  // Discovery State
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [viewingStream, setViewingStream] = useState<LiveStream | null>(null);

  // Green Room State
  const [streamTitle, setStreamTitle] = useState('');
  const [category, setCategory] = useState('Just Chatting');
  const [giftGoal, setGiftGoal] = useState(500);
  const [allowCohost, setAllowCohost] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isLightingOn, setIsLightingOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Live Broadcast State
  const [liveStreamData, setLiveStreamData] = useState<LiveStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);

  // HUD Data
  const [topGifters, setTopGifters] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [floatingHearts, setFloatingHearts] = useState<{id: string, x: number, icon: string}[]>([]);
  const [showEndSummary, setShowEndSummary] = useState(false);

  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [isGuestDrawerOpen, setIsGuestDrawerOpen] = useState(false);
  const [guestRequests, setGuestRequests] = useState<any[]>([]);
  const [activeGuest, setActiveGuest] = useState<any>(null);

  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const viewerStreamRef = useRef<MediaStream>(new MediaStream());
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const activeChannelRef = useRef<any>(null);

  const scrollToBottom = () => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
      scrollToBottom();
  }, [comments]);


  // Load active streams for discovery
  useEffect(() => {
    if (mode === 'DISCOVERY') {
      const fetchStreams = async () => {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*, host:host_id(username, avatar_url, first_name)')
          .eq('is_live', true)
          .order('viewer_count', { ascending: false });
        if (data) {
          setActiveStreams(data as unknown as LiveStream[]);
        }
      };
      fetchStreams();

      const channel = supabase
        .channel('public:live_streams')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams', filter: 'is_live=eq.true' }, (payload) => {
            fetchStreams();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mode]);

  // Handle Green Room setup
  useEffect(() => {
    if (mode === 'GREEN_ROOM') {
      startLocalCamera();
    } else {
      stopLocalCamera();
    }
    return () => stopLocalCamera();
  }, [mode, cameraFacingMode]);

  // Viewer Connection Logic
  useEffect(() => {
      if (viewingStream) {
          const channel = supabase.channel(`live_room_${viewingStream.id}`);
          activeChannelRef.current = channel;

          setMode('LIVE_BROADCAST');
          setLiveStreamData(viewingStream);
          setComments([]);
          setTopGifters([]); // Would fetch top gifters here based on `live_gifts`

          const pc = new RTCPeerConnection({
              iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' }
              ]
          });
          pcRef.current = pc;

          pc.ontrack = (event) => {
              event.streams[0].getTracks().forEach((track) => {
                  viewerStreamRef.current.addTrack(track);
              });
              if (viewerVideoRef.current) {
                  viewerVideoRef.current.srcObject = viewerStreamRef.current;
              }
          };

          pc.onicecandidate = (event) => {
              if (event.candidate) {
                  channel.send({
                      type: 'broadcast',
                      event: 'ice-candidate',
                      payload: { candidate: event.candidate, targetId: viewingStream.host_id, senderId: user?.id }
                  });
              }
          };

          channel.on('broadcast', { event: 'webrtc-offer' }, async (payload) => {
              if (payload.payload.targetId === user?.id) {
                  await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);

                  channel.send({
                      type: 'broadcast',
                      event: 'webrtc-answer',
                      payload: { answer, targetId: viewingStream.host_id, senderId: user?.id }
                  });
              }
          });

          channel.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
              if (payload.payload.targetId === user?.id) {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
              }
          });

          channel.on('broadcast', { event: 'like' }, () => {
              setLikesCount(prev => prev + 1);
              spawnHeart();
          });

          channel.on('broadcast', { event: 'comment' }, (payload) => {
              setComments(prev => [...prev, payload.payload]);
          });

          channel.on('presence', { event: 'sync' }, () => {
              const newState = channel.presenceState();
              let count = 0;
              for (let id in newState) {
                  count += (newState[id] as any).length;
              }
              setViewerCount(count);
          });

          channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await channel.track({
                      user_id: user?.id,
                      username: (user as any)?.username,
                      avatar_url: (user as any)?.avatar_url,
                      joined_at: Date.now(),
                      is_host: false
                  });

                  const joinMsg = {
                     id: Math.random().toString(),
                     type: 'system',
                     text: `👋 @${(user as any)?.username} joined the LIVE`
                  };
                  channel.send({
                      type: 'broadcast',
                      event: 'comment',
                      payload: joinMsg
                  });
                  setComments(prev => [...prev, joinMsg]);

                  channel.send({
                      type: 'broadcast',
                      event: 'viewer-ready',
                      payload: { viewerId: user?.id }
                  });
              }
          });

          return () => {
              if (pcRef.current) {
                  pcRef.current.close();
              }
              if (viewerStreamRef.current) {
                  viewerStreamRef.current.getTracks().forEach(track => track.stop());
                  viewerStreamRef.current = new MediaStream();
              }
              if (viewerVideoRef.current) {
                  viewerVideoRef.current.srcObject = null;
              }
              supabase.removeChannel(channel);
          };
      }
  }, [viewingStream]);

  // Host Connection Logic
  useEffect(() => {
      if (mode === 'LIVE_BROADCAST' && liveStreamData && liveStreamData.host_id === user?.id) {
          const channel = supabase.channel(`live_room_${liveStreamData.id}`);
          activeChannelRef.current = channel;

          channel.on('presence', { event: 'sync' }, () => {
              const newState = channel.presenceState();
              let count = 0;
              for (let id in newState) {
                  count += (newState[id] as any).length;
              }
              setViewerCount(count);
              supabase.from('live_streams').update({ viewer_count: count }).eq('id', liveStreamData.id).then();
          });

          channel.on('broadcast', { event: 'like' }, () => {
              setLikesCount(prev => prev + 1);
              spawnHeart();
          });

          channel.on('broadcast', { event: 'comment' }, (payload) => {
              setComments(prev => [...prev, payload.payload]);
          });

          const peerConnections: Record<string, RTCPeerConnection> = {};

          channel.on('broadcast', { event: 'viewer-ready' }, async (payload) => {
              const viewerId = payload.payload.viewerId;
              if (viewerId === user?.id) return;

              const pc = new RTCPeerConnection({
                  iceServers: [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' }
                  ]
              });
              peerConnections[viewerId] = pc;

              if (localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
              }

              pc.onicecandidate = (event) => {
                  if (event.candidate) {
                      channel.send({
                          type: 'broadcast',
                          event: 'ice-candidate',
                          payload: { candidate: event.candidate, targetId: viewerId, senderId: user?.id }
                      });
                  }
              };

              const offer = await pc.createOffer();
              offer.sdp = offer.sdp?.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=128000; cbr=1');
              offer.sdp = offer.sdp?.replace('b=AS:30', 'b=AS:2500');

              await pc.setLocalDescription(offer);

              channel.send({
                  type: 'broadcast',
                  event: 'webrtc-offer',
                  payload: { offer, targetId: viewerId, senderId: user?.id }
              });
          });

          channel.on('broadcast', { event: 'webrtc-answer' }, async (payload) => {
              if (payload.payload.targetId === user?.id && peerConnections[payload.payload.senderId]) {
                  await peerConnections[payload.payload.senderId].setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
              }
          });

          channel.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
              if (payload.payload.targetId === user?.id && peerConnections[payload.payload.senderId]) {
                  await peerConnections[payload.payload.senderId].addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
              }
          });

          channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await channel.track({
                      user_id: user?.id,
                      username: (user as any)?.username,
                      avatar_url: (user as any)?.avatar_url,
                      joined_at: Date.now(),
                      is_host: true
                  });
              }
          });

          return () => {
              Object.values(peerConnections).forEach(pc => pc.close());
              supabase.removeChannel(channel);
          };
      }
  }, [mode, liveStreamData]);


  const startLocalCamera = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 }, facingMode: cameraFacingMode },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Camera/Mic access required");
    }
  };

  const stopLocalCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleMic = () => {
      if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsMicMuted(!localStreamRef.current.getAudioTracks()[0].enabled);
      }
  };

  const handleGoLive = async () => {
    if (!streamTitle.trim()) {
      toast.error('Please enter a stream title');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          host_id: user?.id,
          title: streamTitle,
          category,
          gift_goal: giftGoal,
          allow_cohost: allowCohost,
          is_live: true,
          viewer_count: 0
        })
        .select(`*, host:host_id(username, avatar_url, first_name)`)
        .single();

      if (error) throw error;

      setLiveStreamData(data as unknown as LiveStream);
      setMode('LIVE_BROADCAST');
      setComments([]);
      setLikesCount(0);
      setTotalCoinsEarned(0);
      toast.success("You are now LIVE!");
    } catch (err: any) {
      toast.error(err.message || 'Failed to go live');
    }
  };

  const endLiveStream = async () => {
      if (liveStreamData && liveStreamData.host_id === user?.id) {
          setShowEndSummary(true);
      } else {
          stopLocalCamera();
          setViewingStream(null);
          setMode('DISCOVERY');
      }
  };

  const confirmEndStream = async () => {
      if (liveStreamData) {
          await supabase.from('live_streams').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', liveStreamData.id);
      }
      stopLocalCamera();
      onClose();
  };

  const handleLike = () => {
      if (activeChannelRef.current) {
          activeChannelRef.current.send({
              type: 'broadcast',
              event: 'like',
          });
      }
      setLikesCount(prev => prev + 1);
      spawnHeart();
  };

  const spawnHeart = () => {
      const icons = ['❤️', '💖', '🔥', '✨'];
      const newHeart = {
          id: Math.random().toString(),
          x: Math.random() * 40 - 20, // -20 to 20 px offset
          icon: icons[Math.floor(Math.random() * icons.length)]
      };
      setFloatingHearts(prev => [...prev, newHeart]);
      setTimeout(() => {
          setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
      }, 2000);
  };

  const handleSendComment = () => {
      if (!commentInput.trim() || !activeChannelRef.current) return;

      const newComment = {
          id: Math.random().toString(),
          type: 'user',
          text: commentInput,
          sender: {
              id: user?.id,
              username: (user as any)?.username,
              avatar_url: (user as any)?.avatar_url
          }
      };

      activeChannelRef.current.send({
          type: 'broadcast',
          event: 'comment',
          payload: newComment
      });

      setComments(prev => [...prev, newComment]);
      setCommentInput('');
  };

  const handleSendGift = async (gift: any, combo: number) => {
      if (!liveStreamData || !activeChannelRef.current) return;

      const totalValue = gift.cost * combo;

      // Would normally handle actual balance deduct here

      const giftPayload = {
          id: Math.random().toString(),
          senderId: user?.id,
          senderUsername: (user as any)?.username,
          senderAvatar: (user as any)?.avatar_url,
          giftId: gift.id,
          giftName: gift.name,
          giftIcon: gift.icon,
          coinValue: gift.cost,
          comboCount: combo
      };

      activeChannelRef.current.send({
          type: 'broadcast',
          event: 'live-gift',
          payload: giftPayload
      });

      const newComment = {
          id: Math.random().toString(),
          type: 'system',
          text: `🎁 ${(user as any)?.username} sent ${gift.name} x${combo}!`
      };

      activeChannelRef.current.send({
          type: 'broadcast',
          event: 'comment',
          payload: newComment
      });

      setComments(prev => [...prev, newComment]);

      // Simulate receiving it locally
      handleReceiveGift(giftPayload);
  };

  const [activeGiftAnim, setActiveGiftAnim] = useState<any>(null);

  const handleReceiveGift = (payload: any) => {
      setActiveGiftAnim(payload);
      setTimeout(() => setActiveGiftAnim(null), 3000);
  };

  useEffect(() => {
      if (activeChannelRef.current) {
          const sub = activeChannelRef.current.on('broadcast', { event: 'live-gift' }, (payload: any) => {
              handleReceiveGift(payload.payload);
          });
          return () => { sub.unsubscribe(); };
      }
  }, [activeChannelRef.current]);


  return (
    <div className="fixed inset-0 z-[100000] bg-black text-white h-[100dvh] w-[100vw] overflow-hidden flex flex-col font-sans">
      {/* MODE A: DISCOVERY FEED */}
      {mode === 'DISCOVERY' && (
        <div className="relative h-full w-full">
           <button onClick={onClose} className="absolute top-12 right-4 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10">
              <X className="w-6 h-6"/>
           </button>

           {activeStreams.length === 0 ? (
             <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-30 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1516280440502-85984c71887e?q=80&w=2070&auto=format&fit=crop)' }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20 z-0"></div>
                <div className="z-10 flex flex-col items-center p-8 text-center max-w-sm">
                    <div className="w-24 h-24 mb-6 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center animate-pulse">
                        <Video className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">No Active Streams</h2>
                    <p className="text-zinc-400 mb-10">Be the first to go live and share your moment with the world.</p>
                    <button
                       onClick={() => setMode('GREEN_ROOM')}
                       className="w-full py-4 rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-bold text-lg shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:scale-105 transition-transform"
                    >
                        Start Your Live Broadcast
                    </button>
                </div>
             </div>
           ) : (
             <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll hide-scrollbar relative">
                 {activeStreams.map((stream, idx) => (
                     <div key={stream.id} className="h-[100dvh] w-full snap-start relative bg-neutral-900 flex items-center justify-center">
                         {/* Placeholder for video feed - would integrate WebRTC viewer here */}
                         <div className="absolute inset-0 bg-zinc-800 animate-pulse" />

                         {/* Stream Overlay UI */}
                         <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>

                         <div className="absolute top-12 left-4 z-20 flex items-center gap-3">
                             <img src={stream.host?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.host?.username}`} className="w-10 h-10 rounded-full border border-white/20" />
                             <div>
                                 <h3 className="font-bold text-white shadow-black drop-shadow-md">@{stream.host?.username}</h3>
                                 <div className="flex items-center gap-2">
                                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">LIVE</span>
                                     <span className="flex items-center gap-1 text-[11px] text-white/90 shadow-black drop-shadow-md"><Users className="w-3 h-3"/> {stream.viewer_count}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="absolute bottom-24 left-4 z-20 max-w-[70%]">
                             <h2 className="text-xl font-bold text-white drop-shadow-md mb-2">{stream.title}</h2>
                             <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">{stream.category}</span>
                         </div>

                         <div className="absolute inset-0 z-0">
                            <button
                                className="w-full h-full opacity-0 cursor-pointer"
                                onClick={() => {
                                    setViewingStream(stream);
                                }}
                            />
                         </div>
                     </div>
                 ))}
             </div>
           )}

           {activeStreams.length > 0 && (
             <button
                onClick={() => setMode('GREEN_ROOM')}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-bold shadow-[0_0_20px_rgba(225,29,72,0.6)] flex items-center gap-2 hover:scale-105 transition-transform"
             >
                <Video className="w-5 h-5"/> Go Live Now
             </button>
           )}
        </div>
      )}

      {/* MODE B: GREEN ROOM STUDIO */}
      {mode === 'GREEN_ROOM' && (
        <div className="relative h-full w-full bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-[100dvh] object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''} ${isLightingOn ? 'brightness-110 contrast-110 saturate-125' : ''}`}
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10"></div>

          <button onClick={onClose} className="absolute top-12 left-4 z-50 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <X className="w-6 h-6"/>
          </button>

          <div className="absolute top-12 right-4 z-50 flex flex-col gap-4">
              <button onClick={() => setCameraFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition">
                  <RefreshCw className="w-6 h-6"/>
              </button>
              <button onClick={toggleMic} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition">
                  {isMicMuted ? <MicOff className="w-6 h-6 text-red-400"/> : <Mic className="w-6 h-6"/>}
              </button>
              <button onClick={() => setIsLightingOn(!isLightingOn)} className={`p-3 backdrop-blur-md rounded-full border transition ${isLightingOn ? 'bg-amber-500/30 border-amber-500/50 text-amber-300' : 'bg-black/40 border-white/10 hover:bg-white/20'}`}>
                  <Sparkles className="w-6 h-6"/>
              </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent z-20 rounded-t-3xl">
              <input
                 type="text"
                 placeholder="Live Stream Title (e.g. Late Night Vibes 💎)"
                 value={streamTitle}
                 onChange={(e) => setStreamTitle(e.target.value)}
                 className="w-full bg-white/10 border border-white/20 text-white px-5 py-4 rounded-xl mb-4 text-lg placeholder:text-white/40 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 backdrop-blur-md"
              />

              <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 pb-1">
                  {['🔥 Just Chatting', '🎵 Music & Talent', '💎 VIP Lounge', '🎙️ Talk & Debate', '🎮 Gaming'].map(cat => (
                      <button
                         key={cat}
                         onClick={() => setCategory(cat)}
                         className={`whitespace-nowrap px-4 py-2 rounded-full border text-sm font-medium transition-colors ${category === cat ? 'bg-white text-black border-white' : 'bg-black/40 border-white/20 text-white/80'}`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>

              <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
                      <label className="text-xs text-white/50 font-bold mb-1 block uppercase tracking-wider">Gift Goal</label>
                      <select
                         value={giftGoal}
                         onChange={(e) => setGiftGoal(Number(e.target.value))}
                         className="w-full bg-transparent text-white font-bold outline-none appearance-none"
                      >
                          <option value="500" className="bg-zinc-900">500 Coins</option>
                          <option value="1000" className="bg-zinc-900">1000 Coins</option>
                          <option value="5000" className="bg-zinc-900">5000 Coins</option>
                      </select>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md flex items-center justify-between">
                      <span className="text-sm font-semibold">Co-Host</span>
                      <button
                         onClick={() => setAllowCohost(!allowCohost)}
                         className={`w-12 h-6 rounded-full p-1 transition-colors ${allowCohost ? 'bg-rose-500' : 'bg-white/20'}`}
                      >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${allowCohost ? 'translate-x-6' : 'translate-x-0'}`}/>
                      </button>
                  </div>
              </div>

              <button
                 onClick={handleGoLive}
                 className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-bold text-xl shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                 <Video className="w-6 h-6"/> GO LIVE (FULL HD)
              </button>
          </div>
        </div>
      )}

      {/* MODE C: ACTIVE LIVE BROADCAST */}
      {mode === 'LIVE_BROADCAST' && liveStreamData && (
          <div className="relative h-full w-full bg-black overflow-hidden flex flex-col justify-between" onDoubleClick={handleLike}>
              {liveStreamData.host_id === user?.id ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-[100dvh] object-cover z-0 ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''} ${isLightingOn ? 'brightness-110 contrast-110 saturate-125' : ''}`}
                />
              ) : (
                <video
                  ref={viewerVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-[100dvh] object-cover z-0 bg-zinc-900"
                />
              )}

              {/* 1. TOP HUD */}
              <div className="pt-12 px-4 z-20">
                  <div className="flex justify-between items-start mb-2">
                      {/* HOST CAPSULE */}
                      <div className="bg-black/40 backdrop-blur-md rounded-full p-1 pr-3 flex items-center gap-2 border border-white/15 shadow-lg max-w-[50%]">
                          <div className="relative">
                              <img src={liveStreamData.host.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${liveStreamData.host.username}`} className="w-8 h-8 rounded-full z-10 relative" />
                              <div className="absolute inset-0 rounded-full border-2 border-rose-500 animate-pulse z-0 scale-110"></div>
                          </div>
                          <div className="flex flex-col overflow-hidden">
                              <p className="text-[11px] font-bold truncate">{liveStreamData.host.username}</p>
                              <span className="text-[9px] text-rose-400 font-bold tracking-wider">❤️ {likesCount.toLocaleString()}</span>
                          </div>
                          {liveStreamData.host_id !== user?.id && (
                              <button className="ml-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-lg leading-none font-bold pb-0.5">
                                  +
                              </button>
                          )}
                      </div>

                      {/* MVP GIFTER THRONES & VIEWERS */}
                      <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                              {/* Placeholder Thones */}
                              <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#FFD700] z-30 shadow-[0_0_8px_rgba(255,215,0,0.6)]"></div>
                              <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#C0C0C0] z-20"></div>
                              <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#CD7F32] z-10"></div>
                          </div>
                          <button className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-white/15 text-[10px] font-bold">
                              👁️ {viewerCount}
                          </button>
                          <button onClick={endLiveStream} className="p-1.5 ml-1 bg-black/40 backdrop-blur-md rounded-full border border-white/15 text-white/80 hover:text-white hover:bg-white/20">
                              <X className="w-5 h-5"/>
                          </button>
                      </div>
                  </div>

                  {/* SECOND ROW (COINS & GOAL) */}
                  <div className="flex justify-between items-center text-[10px]">
                      <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/15 flex items-center gap-1.5 font-bold shadow-lg text-amber-400">
                          <Coins className="w-3 h-3"/> {totalCoinsEarned.toLocaleString()} Coins
                      </div>
                      <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-fuchsia-500/30 flex items-center gap-2 shadow-lg relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 bg-fuchsia-500/30 w-[10%]" />
                          <span className="relative z-10 font-bold text-white shadow-black drop-shadow-sm">Goal: 0 / {liveStreamData.gift_goal} 💎</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 flex" />

              {/* 2. TRANSLUCENT COMMENT TRAY */}
              <div className="w-[78%] max-w-[340px] h-[230px] overflow-y-auto px-4 flex flex-col justify-start gap-1.5 z-20 pb-4 hide-scrollbar" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)' }}>
                  <div className="mt-auto flex flex-col gap-1.5 justify-end">
                      {comments.map((comment, i) => (
                          <div key={i} className="bg-black/35 backdrop-blur-xs rounded-2xl px-3 py-1.5 text-xs text-white border border-white/5 inline-block max-w-full break-words shadow-sm self-start">
                              {comment.type === 'system' ? (
                                  <span className="text-white/90 italic font-medium">{comment.text}</span>
                              ) : (
                                  <>
                                      <span className="font-bold text-cyan-300 mr-2 drop-shadow-md">
                                          {comment.sender?.username}
                                      </span>
                                      <span className="text-white/95 leading-relaxed">{comment.text}</span>
                                  </>
                              )}
                          </div>
                      ))}
                      <div ref={commentsEndRef} />
                  </div>
              </div>

              {/* 3. BOTTOM ACTION TRAY */}
              <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-2.5 z-30">
                  <div className="flex-1 relative">
                      <input
                          type="text"
                          placeholder="Say something..."
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                          className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-full pl-4 pr-10 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:bg-white/20 transition-colors shadow-lg"
                      />
                      <button onClick={handleSendComment} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/80 hover:text-white">
                          <Send className="w-4 h-4" />
                      </button>
                  </div>

                  {liveStreamData.host_id === user?.id ? (
                      <>
                          <button onClick={toggleMic} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg">
                              {isMicMuted ? <MicOff className="w-5 h-5 text-rose-400"/> : <Mic className="w-5 h-5 text-white"/>}
                          </button>
                          <button onClick={() => setCameraFacingMode(p => p === 'user' ? 'environment' : 'user')} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg">
                              <RefreshCw className="w-5 h-5 text-white"/>
                          </button>
                      </>
                  ) : (
                      <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)] relative">
                          <UserPlus className="w-5 h-5 text-cyan-400"/>
                      </button>
                  )}

                  <button onClick={() => setIsGiftDrawerOpen(true)} className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-white/20 hover:scale-105 transition-transform">
                      <Gift className="w-5 h-5 text-white fill-white/20"/>
                  </button>

                  <button onClick={handleLike} className="w-10 h-10 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.3)] hover:bg-rose-500/40 transition-colors">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500"/>
                  </button>
              </div>

              {/* HEART FOUNTAIN */}
              <div className="absolute bottom-20 right-4 w-12 h-64 pointer-events-none z-40 overflow-visible">
                  <AnimatePresence>
                      {floatingHearts.map(heart => (
                          <motion.div
                              key={heart.id}
                              initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                              animate={{
                                  opacity: [1, 1, 0],
                                  y: -250,
                                  x: [0, heart.x, -heart.x, heart.x],
                                  scale: [0.5, 1.2, 1]
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 2, ease: "easeOut" }}
                              className="absolute bottom-0 right-2 text-2xl drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          >
                              {heart.icon}
                          </motion.div>
                      ))}
                  </AnimatePresence>
              </div>

              {/* GIFT ANIMATION LAYER */}
              <AnimatePresence>
                  {activeGiftAnim && (
                      <motion.div
                          initial={{ x: -100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -100, opacity: 0 }}
                          className="absolute top-[42%] left-4 z-30 bg-gradient-to-r from-amber-500/30 via-fuchsia-600/30 to-black/60 backdrop-blur-xl border border-amber-400/50 rounded-full p-1.5 pr-5 flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.35)]"
                      >
                          <img src={activeGiftAnim.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeGiftAnim.senderUsername}`} className="w-10 h-10 rounded-full border border-amber-400" />
                          <div className="flex flex-col"><span className="text-xs font-bold">{activeGiftAnim.senderUsername}</span><span className="text-[10px] text-amber-300">Sent {activeGiftAnim.giftName}</span></div>
                          <div className="text-3xl ml-2">{activeGiftAnim.giftIcon}</div>
                          <motion.span key={activeGiftAnim.comboCount} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-xl font-black text-amber-400 drop-shadow-md">x{activeGiftAnim.comboCount}</motion.span>
                      </motion.div>
                  )}
              </AnimatePresence>

              {/* END SUMMARY MODAL */}
              {showEndSummary && (
                  <div className="absolute inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6">
                      <div className="w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center mb-6">
                          <Video className="w-10 h-10 text-rose-500" />
                      </div>
                      <h2 className="text-3xl font-bold mb-2">Live Ended</h2>
                      <p className="text-zinc-400 mb-8 text-center">Your broadcast has concluded. Here's a summary of your performance.</p>

                      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Viewers</p>
                              <p className="text-2xl font-bold">{viewerCount}</p>
                          </div>
                          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                              <Coins className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Coins Earned</p>
                              <p className="text-2xl font-bold">{totalCoinsEarned}</p>
                          </div>
                          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10 col-span-2">
                              <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Likes</p>
                              <p className="text-2xl font-bold">{likesCount}</p>
                          </div>
                      </div>

                      <button
                         onClick={confirmEndStream}
                         className="w-full max-w-sm py-4 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform"
                      >
                          Done
                      </button>
                  </div>
              )}
              <LiveGiftDrawer
                  isOpen={isGiftDrawerOpen}
                  onClose={() => setIsGiftDrawerOpen(false)}
                  onSendGift={handleSendGift}
              />
              <GuestRequestDrawer isOpen={isGuestDrawerOpen} onClose={() => setIsGuestDrawerOpen(false)} requests={guestRequests} onAccept={() => {}} />
          </div>
      )}
    </div>
  );
}
