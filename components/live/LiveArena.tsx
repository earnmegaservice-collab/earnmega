"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, RefreshCw, Sparkles, Mic, MicOff, X, Video, Users, Gift, Flame, Play,
  Heart, Send, UserPlus, Coins, ArrowLeft, Shield, Pin, Ban, Search, Filter, AlertCircle, RotateCcw
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import LiveGiftDrawer from './LiveGiftDrawer';
import GuestRequestDrawer from './GuestRequestDrawer';
import LiveGiftOverlay from './LiveGiftOverlay';

export interface LiveStream {
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
    first_name?: string;
  };
}

export default function LiveArena({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'DISCOVERY' | 'GREEN_ROOM' | 'LIVE_BROADCAST'>('DISCOVERY');

  // Discovery State
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [viewingStream, setViewingStream] = useState<LiveStream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [streamFetchError, setStreamFetchError] = useState<string | null>(null);

  // Green Room State
  const [streamTitle, setStreamTitle] = useState('');
  const [category, setCategory] = useState('Just Chatting');
  const [giftGoal, setGiftGoal] = useState(500);
  const [allowCohost, setAllowCohost] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isLightingOn, setIsLightingOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Live Broadcast State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveStreamData, setLiveStreamData] = useState<LiveStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);

  // HUD & Mod Data
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: string; x: number; icon: string }[]>([]);
  const [showEndSummary, setShowEndSummary] = useState(false);

  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [isGuestDrawerOpen, setIsGuestDrawerOpen] = useState(false);
  const [guestRequests, setGuestRequests] = useState<any[]>([]);
  const [activeGuest, setActiveGuest] = useState<any>(null);
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [targetViewer, setTargetViewer] = useState<any | null>(null);
  const [pinnedComment, setPinnedComment] = useState<any | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const viewerStreamRef = useRef<MediaStream>(new MediaStream());
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const activeChannelRef = useRef<any>(null);
  const hostPeerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  // Robust Stream Discovery Engine
  const fetchStreams = async () => {
    try {
      setStreamFetchError(null);
      const { data: streamsData, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false });

      if (error) {
        console.error('Fetch live streams database error:', error);
        setStreamFetchError(error.message || 'Failed to load live broadcasts.');
        setIsLoadingStreams(false);
        return;
      }

      if (!streamsData || streamsData.length === 0) {
        setActiveStreams([]);
        setIsLoadingStreams(false);
        return;
      }

      // Query creator profiles for host metadata
      const hostIds = Array.from(new Set(streamsData.map((s) => s.host_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, first_name')
        .in('id', hostIds);

      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const enrichedStreams: LiveStream[] = streamsData.map((s) => {
        const hostProfile = profileMap.get(s.host_id);
        return {
          ...s,
          host: {
            username: hostProfile?.username || 'Host',
            avatar_url: hostProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.host_id}`,
            first_name: hostProfile?.first_name || ''
          }
        };
      });

      setActiveStreams(enrichedStreams);
    } catch (e: any) {
      console.error('Fetch streams unexpected exception:', e);
      setStreamFetchError(e.message || 'An unexpected error occurred while fetching streams.');
    } finally {
      setIsLoadingStreams(false);
    }
  };

  useEffect(() => {
    if (mode === 'DISCOVERY') {
      setIsLoadingStreams(true);
      fetchStreams();

      const channel = supabase
        .channel('public_live_streams_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
          fetchStreams();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mode]);

  // Green Room Camera Setup
  useEffect(() => {
    if (mode === 'GREEN_ROOM') {
      startLocalCamera();
    } else if (mode === 'DISCOVERY') {
      stopLocalCamera();
    }
    return () => {
      if (mode === 'DISCOVERY') stopLocalCamera();
    };
  }, [mode, cameraFacingMode]);

  // Handle Host Abrupt Closure
  useEffect(() => {
    if (mode === 'LIVE_BROADCAST' && liveStreamData && liveStreamData.host_id === user?.id) {
      const handleBeforeUnload = () => {
        supabase
          .from('live_streams')
          .update({ is_live: false, ended_at: new Date().toISOString() })
          .eq('id', liveStreamData.id)
          .then();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [mode, liveStreamData, user?.id]);

  // Viewer Connection Logic
  useEffect(() => {
    if (viewingStream) {
      const channel = supabase.channel(`live_room_${viewingStream.id}`);
      activeChannelRef.current = channel;

      setMode('LIVE_BROADCAST');
      setLiveStreamData(viewingStream);
      setComments([]);

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
        setLikesCount((prev) => prev + 1);
        spawnHeart();
      });

      channel.on('broadcast', { event: 'viewer-muted' }, (payload: any) => {
        if (payload.payload.userId === user?.id) {
          setMutedUserIds((prev) => new Set(prev).add(user?.id || ''));
          toast.error('You were muted by the host');
        }
      });

      channel.on('broadcast', { event: 'viewer-kicked' }, (payload: any) => {
        if (payload.payload.userId === user?.id) {
          toast.error('You have been removed from this LIVE by the host');
          onClose();
        }
      });

      channel.on('broadcast', { event: 'comment-pinned' }, (payload: any) => {
        setPinnedComment(payload.payload);
      });

      channel.on('broadcast', { event: 'live-ended' }, () => {
        stopLocalCamera();
        if (viewerVideoRef.current) viewerVideoRef.current.srcObject = null;
        setShowEndSummary(true);
      });

      channel.on('broadcast', { event: 'comment' }, (payload) => {
        setComments((prev) => [...prev, payload.payload]);
      });

      channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        let count = 0;
        for (const id in newState) {
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
            isEntry: true,
            text: `👋 @${(user as any)?.username || 'Someone'} joined the LIVE`
          };
          channel.send({
            type: 'broadcast',
            event: 'comment',
            payload: joinMsg
          });
          setComments((prev) => [...prev, joinMsg]);

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
          viewerStreamRef.current.getTracks().forEach((track) => track.stop());
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
        for (const id in newState) {
          count += (newState[id] as any).length;
        }
        setViewerCount(count);
        supabase.from('live_streams').update({ viewer_count: count }).eq('id', liveStreamData.id).then();
      });

      channel.on('broadcast', { event: 'like' }, () => {
        setLikesCount((prev) => prev + 1);
        spawnHeart();
      });

      channel.on('broadcast', { event: 'comment' }, (payload) => {
        setComments((prev) => [...prev, payload.payload]);
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
        hostPeerConnectionsRef.current[viewerId] = pc;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            const sender = pc.addTrack(track, localStreamRef.current!);
            if (track.kind === 'video') {
              try {
                const parameters = sender.getParameters();
                if (!parameters.encodings) parameters.encodings = [{}];
                parameters.encodings[0].maxBitrate = 4500000;
                parameters.encodings[0].maxFramerate = 60;
                parameters.encodings[0].scaleResolutionDownBy = 1.0;
                parameters.degradationPreference = 'maintain-resolution';
                sender.setParameters(parameters).catch(() => {});
              } catch (e) {}
            }
          });
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
        offer.sdp = offer.sdp?.replace(/b=AS:\d+/g, 'b=AS:4500');
        if (offer.sdp && !offer.sdp.includes('b=AS:4500')) offer.sdp = offer.sdp.replace('m=video', 'm=video\r\nb=AS:4500');

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
        Object.values(peerConnections).forEach((pc) => pc.close());
        hostPeerConnectionsRef.current = {};
        supabase.removeChannel(channel);
      };
    }
  }, [mode, liveStreamData]);

  const startLocalCamera = async () => {
    try {
      let isReplacing = false;
      const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localStreamRef.current && mode === 'LIVE_BROADCAST') {
        isReplacing = true;
        oldVideoTrack?.stop();
      } else if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 60, min: 30 }, facingMode: cameraFacingMode },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });
      const newVideoTrack = stream.getVideoTracks()[0];
      if (newVideoTrack) (newVideoTrack as any).contentHint = 'motion';

      if (isReplacing && localStreamRef.current && newVideoTrack) {
        if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        Object.values(hostPeerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack).catch((e) => console.warn('Failed replace', e));
        });
        stream.getAudioTracks().forEach((t) => t.stop());
      } else {
        localStreamRef.current = stream;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Camera and microphone access is required to broadcast.');
    }
  };

  const stopLocalCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const activeTrack = localStreamRef.current.getAudioTracks()[0];
      setIsMicMuted(activeTrack ? !activeTrack.enabled : true);
    }
  };

  // Secure Executing Stream Creation
  const executeGoLive = async () => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to start a broadcast.');
        return;
      }

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          host_id: user.id,
          title: streamTitle.trim() || 'Live Broadcast',
          category: category || 'Just Chatting',
          gift_goal: giftGoal || 500,
          allow_cohost: allowCohost,
          is_live: true,
          viewer_count: 1,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Fetch host profile metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, first_name')
        .eq('id', user.id)
        .single();

      const fullStreamData: LiveStream = {
        ...(data as any),
        host: {
          username: profile?.username || (user as any)?.username || 'Host',
          avatar_url: profile?.avatar_url || (user as any)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          first_name: profile?.first_name || ''
        }
      };

      setLiveStreamData(fullStreamData);
      setMode('LIVE_BROADCAST');
      setComments([]);
      setLikesCount(0);
      setTotalCoinsEarned(0);
      toast.success('You are now LIVE!');
    } catch (err: any) {
      console.error('Go live error:', err);
      toast.error(err.message || 'Failed to start broadcast');
    }
  };

  const handleGoLive = () => {
    if (!streamTitle.trim()) return toast.error('Please enter a stream title');
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      try {
        navigator.vibrate?.(70);
      } catch (e) {}
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      executeGoLive();
    }
  }, [countdown]);

  const endLiveStream = async () => {
    if (liveStreamData && liveStreamData.host_id === user?.id) {
      setShowEndConfirm(true);
    } else {
      stopLocalCamera();
      setViewingStream(null);
      setMode('DISCOVERY');
    }
  };

  const confirmEndStream = async () => {
    setShowEndConfirm(false);
    if (liveStreamData) {
      try {
        await supabase
          .from('live_streams')
          .update({ is_live: false, ended_at: new Date().toISOString() })
          .eq('id', liveStreamData.id);

        if (activeChannelRef.current) {
          activeChannelRef.current.send({
            type: 'broadcast',
            event: 'live-ended',
            payload: { totalViewers: viewerCount, likesCount, totalCoinsEarned }
          });
        }
      } catch (e) {
        console.error('Error ending stream:', e);
      }
    }
    stopLocalCamera();
    setShowEndSummary(true);
  };

  const handleMuteViewer = () => {
    if (!targetViewer || !activeChannelRef.current) return;
    const newMutes = new Set(mutedUserIds);
    if (newMutes.has(targetViewer.id)) {
      newMutes.delete(targetViewer.id);
    } else {
      newMutes.add(targetViewer.id);
      activeChannelRef.current.send({ type: 'broadcast', event: 'viewer-muted', payload: { userId: targetViewer.id } });
      const muteNote = { id: Math.random().toString(), type: 'system', text: `🛡️ Host muted @${targetViewer.username}` };
      activeChannelRef.current.send({ type: 'broadcast', event: 'comment', payload: muteNote });
      setComments((prev) => [...prev, muteNote]);
    }
    setMutedUserIds(newMutes);
    setTargetViewer(null);
  };

  const handleBlockViewer = async () => {
    if (!targetViewer || !activeChannelRef.current) return;
    try {
      await supabase.from('blocked_users').insert({ blocker_id: user?.id, blocked_id: targetViewer.id });
      activeChannelRef.current.send({ type: 'broadcast', event: 'viewer-kicked', payload: { userId: targetViewer.id } });
      toast.success(`${targetViewer.username} blocked and removed`);
    } catch (e: any) {
      toast.error('Failed to block viewer');
    }
    setTargetViewer(null);
  };

  const lastLikeNoticeRef = useRef<number>(0);
  const handleLike = () => {
    if (activeChannelRef.current) {
      activeChannelRef.current.send({ type: 'broadcast', event: 'like' });
      const now = Date.now();
      if (now - lastLikeNoticeRef.current > 8000) {
        const likeMsg = { id: Math.random().toString(), type: 'system', text: `❤️ @${(user as any)?.username || 'Someone'} liked the LIVE` };
        activeChannelRef.current.send({ type: 'broadcast', event: 'comment', payload: likeMsg });
        setComments((prev) => [...prev, likeMsg]);
        lastLikeNoticeRef.current = now;
      }
    }
    setLikesCount((prev) => prev + 1);
    spawnHeart();
  };

  const spawnHeart = () => {
    const icons = ['❤️', '💖', '🔥', '✨'];
    const newHeart = {
      id: Math.random().toString(),
      x: Math.random() * 40 - 20,
      icon: icons[Math.floor(Math.random() * icons.length)]
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  const handleSendComment = () => {
    if (!commentInput.trim() || !activeChannelRef.current) return;

    const newComment = {
      id: Math.random().toString(),
      type: 'user',
      text: commentInput.trim(),
      sender: {
        id: user?.id,
        username: (user as any)?.username || 'User',
        avatar_url: (user as any)?.avatar_url
      }
    };

    activeChannelRef.current.send({
      type: 'broadcast',
      event: 'comment',
      payload: newComment
    });

    setComments((prev) => [...prev, newComment]);
    setCommentInput('');
  };

  const handleSendGift = async (gift: any, combo: number) => {
    if (!liveStreamData || !activeChannelRef.current || !user) return;

    const totalValue = gift.cost * combo;

    try {
      const { data: balanceData, error: balanceError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (balanceError) throw balanceError;
      if ((balanceData?.coins || 0) < totalValue) {
        toast.error('Insufficient coins!');
        return;
      }

      const { error: giftError } = await supabase.rpc('process_live_gift', {
        p_sender_id: user.id,
        p_stream_id: liveStreamData.id,
        p_host_id: liveStreamData.host_id,
        p_gift_id: gift.id,
        p_gift_name: gift.name,
        p_gift_icon: gift.icon,
        p_coin_value: gift.cost,
        p_combo: combo,
        p_total_value: totalValue
      });

      if (giftError) throw giftError;

      // Dispatch global coin balance pop event for immediate spender feedback
      const newBal = (balanceData?.coins || 0) - totalValue;
      window.dispatchEvent(
        new CustomEvent('coin_balance_pop', {
          detail: { newBalance: newBal }
        })
      );

      const giftPayload = {
        id: Math.random().toString(),
        senderId: user.id,
        senderUsername: (user as any)?.username || 'User',
        senderAvatar: (user as any)?.avatar_url,
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
        coinValue: gift.cost,
        comboCount: combo,
        totalValue
      };

      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'live-gift',
        payload: giftPayload
      });

      handleReceiveGift(giftPayload);

      const systemMsg = {
        id: Math.random().toString(),
        type: 'system',
        isEntry: true,
        text: `🎁 @${(user as any)?.username || 'User'} sent ${gift.name} x${combo}!`
      };
      activeChannelRef.current.send({ type: 'broadcast', event: 'comment', payload: systemMsg });
      setComments((prev) => [...prev, systemMsg]);
      setTotalCoinsEarned((prev) => prev + totalValue);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send gift');
    }
  };

  const [activeGiftAnim, setActiveGiftAnim] = useState<any>(null);
  const activeGiftTimeoutRef = useRef<any>(null);

  const handleReceiveGift = (payload: any) => {
    setActiveGiftAnim(payload);
    if (activeGiftTimeoutRef.current) clearTimeout(activeGiftTimeoutRef.current);
    activeGiftTimeoutRef.current = setTimeout(() => setActiveGiftAnim(null), 3500);
  };

  useEffect(() => {
    if (activeChannelRef.current) {
      const sub = activeChannelRef.current.on('broadcast', { event: 'live-gift' }, (payload: any) => {
        handleReceiveGift(payload.payload);
      });

      activeChannelRef.current.on('broadcast', { event: 'cohost-request' }, (payload: any) => {
        setGuestRequests((prev) => [...prev, payload.payload]);
      });

      activeChannelRef.current.on('broadcast', { event: 'cohost-accepted' }, async (payload: any) => {
        if (payload.payload.user.id === user?.id) {
          toast.success('Host accepted your request!');
          setActiveGuest(user);
        } else {
          setActiveGuest(payload.payload.user);
        }
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [activeChannelRef.current]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isHost = liveStreamData?.host_id === user?.id;

  const filteredStreams = activeStreams.filter((stream) => {
    const matchesSearch =
      stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.host?.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || stream.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-black text-white h-[100dvh] w-[100vw] overflow-hidden flex flex-col font-sans select-none">
      {mode === 'DISCOVERY' && (
        <div className="relative h-full w-full bg-[#050505] flex flex-col pt-10">
          {/* Top Navigation */}
          <div className="flex items-center justify-between px-4 pb-3 z-50">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)] tracking-wider">
              🔴 LIVE ARENA
            </h1>
            <button
              onClick={() => setMode('GREEN_ROOM')}
              className="bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold text-sm px-4 py-2 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <Video className="w-4 h-4" /> Go Live
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="px-4 mb-3 z-40 flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search live streams or hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {['All', 'Just Chatting', 'Talk', 'Music', 'Gaming', 'Talent', 'Education'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white border-transparent shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Go Live CTA Card */}
          <div className="mx-4 mb-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-black border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 to-amber-400">
                <img
                  src={
                    (user as any)?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${(user as any)?.username || 'Me'}`
                  }
                  className="w-full h-full rounded-full object-cover bg-neutral-900"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight">Ready to broadcast?</span>
                <span className="text-xs text-zinc-400">Share your moment on Live Arena</span>
              </div>
            </div>
            <button
              onClick={() => setMode('GREEN_ROOM')}
              className="bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              Start Live
            </button>
          </div>

          {/* Feed Content Area */}
          {isLoadingStreams ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
              <span className="text-xs text-white/60 font-semibold tracking-wider">Loading live broadcasts...</span>
            </div>
          ) : streamFetchError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Error Loading Live Feed</h3>
              <p className="text-xs text-zinc-400 mb-6">{streamFetchError}</p>
              <button
                onClick={() => {
                  setIsLoadingStreams(true);
                  fetchStreams();
                }}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-5 py-2.5 rounded-full border border-white/15 flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="z-10 flex flex-col items-center p-8 text-center max-w-sm">
                <div className="w-24 h-24 mb-6 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center animate-pulse">
                  <Video className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">No Active Streams</h2>
                <p className="text-zinc-400 mb-8 text-sm">Be the first to go live and share your moment with the world.</p>
                <button
                  onClick={() => setMode('GREEN_ROOM')}
                  className="bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all hover:scale-105 active:scale-95"
                >
                  Start Broadcasting Now
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll hide-scrollbar relative">
              {filteredStreams.map((stream) => (
                <div key={stream.id} className="h-[100dvh] w-full snap-start relative bg-neutral-900 flex items-center justify-center">
                  <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                  <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>
                  <div className="absolute top-12 left-4 z-20 flex items-center gap-3">
                    <img
                      src={
                        stream.host?.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.host?.username}`
                      }
                      className="w-10 h-10 rounded-full border border-white/20 object-cover bg-neutral-900"
                    />
                    <div>
                      <h3 className="font-bold text-white shadow-black drop-shadow-md">@{stream.host?.username}</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                          LIVE
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-white/90 shadow-black drop-shadow-md">
                          <Users className="w-3 h-3" /> {stream.viewer_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-24 left-4 z-20 max-w-[70%]">
                    <h2 className="text-xl font-bold text-white drop-shadow-md mb-2">{stream.title}</h2>
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                      {stream.category}
                    </span>
                  </div>
                  <button
                    className="absolute inset-0 w-full h-full z-0 cursor-pointer"
                    onClick={() => setViewingStream(stream)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'GREEN_ROOM' && (
        <div className="relative h-full w-full bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-[100dvh] object-cover [transform:translateZ(0)] ${
              cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''
            } ${isLightingOn ? 'brightness-110 contrast-110 saturate-125' : ''}`}
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10"></div>

          <button
            onClick={() => setMode('DISCOVERY')}
            className="absolute top-12 left-4 z-50 p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="absolute top-12 right-4 z-50 flex flex-col gap-4">
            <button
              onClick={() => setCameraFacingMode((p) => (p === 'user' ? 'environment' : 'user'))}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={toggleMic}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-colors"
            >
              {isMicMuted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            <button
              onClick={() => setIsLightingOn(!isLightingOn)}
              className={`p-3 backdrop-blur-md rounded-full border transition-colors ${
                isLightingOn
                  ? 'bg-amber-500/30 border-amber-500/50 text-amber-300'
                  : 'bg-black/40 border-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Sparkles className="w-6 h-6" />
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
              {['🔥 Just Chatting', '🎵 Music & Talent', '💎 VIP Lounge', '🎙️ Talk & Debate', '🎮 Gaming'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-black/40 border-white/20 text-white/80'
                  }`}
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
                  className="w-full bg-transparent text-white font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value="500" className="bg-zinc-900">
                    500 Coins
                  </option>
                  <option value="1000" className="bg-zinc-900">
                    1000 Coins
                  </option>
                  <option value="5000" className="bg-zinc-900">
                    5000 Coins
                  </option>
                </select>
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md flex items-center justify-between">
                <span className="text-sm font-semibold">Co-Host</span>
                <button
                  onClick={() => setAllowCohost(!allowCohost)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${allowCohost ? 'bg-rose-500' : 'bg-white/20'}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      allowCohost ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleGoLive}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-bold text-xl shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-6 h-6" /> GO LIVE
            </button>
          </div>

          <AnimatePresence>
            {countdown !== null && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
              >
                <motion.span
                  key={countdown}
                  initial={{ scale: 2.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(244,63,94,0.9)]"
                >
                  {countdown}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {mode === 'LIVE_BROADCAST' && liveStreamData && (
        <div className="relative h-full w-full bg-black overflow-hidden flex flex-col justify-between" onDoubleClick={handleLike}>
          {isHost ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-[100dvh] object-cover [transform:translateZ(0)] z-0 ${
                cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''
              } ${isLightingOn ? 'brightness-110 contrast-110 saturate-125' : ''}`}
            />
          ) : (
            <video
              ref={viewerVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-[100dvh] object-cover [transform:translateZ(0)] z-0 bg-zinc-900"
            />
          )}

          <div className="pt-12 px-4 z-20">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-black/40 backdrop-blur-md rounded-full p-1 pr-3 flex items-center gap-2 border border-white/15 shadow-lg max-w-[50%]">
                <div className="relative">
                  <img
                    src={
                      liveStreamData.host?.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${liveStreamData.host?.username}`
                    }
                    className="w-8 h-8 rounded-full z-10 relative object-cover bg-neutral-900"
                  />
                  <div className="absolute inset-0 rounded-full border-2 border-rose-500 animate-pulse z-0 scale-110"></div>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <p className="text-[11px] font-bold truncate">@{liveStreamData.host?.username}</p>
                  {isHost ? (
                    <span className="text-[9px] text-zinc-300 font-bold tracking-wider">LIVE Broadcast</span>
                  ) : (
                    <span className="text-[9px] text-rose-400 font-bold tracking-wider">❤️ {likesCount.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1 border border-white/15 text-xs font-bold shadow-lg">
                  👁️ {viewerCount}
                </div>
                {isHost ? (
                  <button
                    onClick={endLiveStream}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)] flex items-center gap-1 text-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> End
                  </button>
                ) : (
                  <button
                    onClick={endLiveStream}
                    className="p-1.5 ml-1 bg-black/40 backdrop-blur-md rounded-full border border-white/15 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Co-Host Stage Pod */}
          <AnimatePresence>
            {activeGuest && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="absolute bottom-[280px] right-4 w-[120px] h-[160px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-40 bg-zinc-900"
              >
                <img
                  src={
                    activeGuest.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeGuest.username}`
                  }
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-500/80 backdrop-blur-sm flex items-center gap-1">
                  <Mic className="w-2 h-2 text-white" />
                  <span className="text-[8px] font-bold text-white uppercase">Co-Host</span>
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white truncate drop-shadow-md">@{activeGuest.username}</span>
                  {isHost && (
                    <button
                      onClick={() => setActiveGuest(null)}
                      className="w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comment Stream */}
          <div className="w-[78%] max-w-[340px] h-[230px] flex flex-col z-20 pb-2 relative pointer-events-none mt-auto px-4">
            <AnimatePresence>
              {pinnedComment && (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-12 left-4 right-0 z-30 pointer-events-auto"
                >
                  <div className="bg-gradient-to-r from-amber-500/80 to-amber-600/50 backdrop-blur-md rounded-xl p-2 border border-amber-300/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-start gap-2">
                    <Pin className="w-3 h-3 text-amber-200 mt-0.5 shrink-0" />
                    <div className="flex flex-col text-[10px] leading-tight text-white shadow-black drop-shadow-md">
                      <span className="font-bold">@{pinnedComment.sender?.username}</span>
                      <span className="opacity-90">{pinnedComment.text}</span>
                    </div>
                    {isHost && (
                      <button onClick={() => setPinnedComment(null)} className="ml-auto opacity-70 hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div
              className="flex-1 overflow-y-auto flex flex-col justify-start gap-1.5 hide-scrollbar pointer-events-auto"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)'
              }}
            >
              <div className="mt-auto flex flex-col gap-1.5 justify-end">
                {comments.map((comment, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (isHost && comment.type === 'user') setTargetViewer(comment.sender);
                    }}
                    className={`${
                      comment.isEntry
                        ? 'bg-gradient-to-r from-cyan-500/40 to-emerald-500/40 border-cyan-300/30'
                        : 'bg-black/35'
                    } backdrop-blur-xs rounded-2xl px-3 py-1.5 text-xs text-white border border-white/5 inline-block max-w-full break-words shadow-sm self-start ${
                      isHost && comment.type === 'user' ? 'cursor-pointer hover:bg-black/50' : ''
                    }`}
                  >
                    {comment.type === 'system' ? (
                      <span className={`${comment.isEntry ? 'text-white font-bold drop-shadow-md' : 'text-white/90 italic font-medium'}`}>
                        {comment.text}
                      </span>
                    ) : (
                      <>
                        <span className="font-bold text-cyan-300 mr-2 drop-shadow-md">@{comment.sender?.username}</span>
                        <span className="text-white/95 leading-relaxed">{comment.text}</span>
                      </>
                    )}
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>
          </div>

          {/* Bottom Interactive HUD */}
          <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-2.5 z-30">
            <div className="flex-1 relative">
              <input
                type="text"
                disabled={mutedUserIds.has(user?.id || '')}
                placeholder={
                  mutedUserIds.has(user?.id || '')
                    ? '🔇 You were muted by the host'
                    : isHost
                    ? 'Post host announcement / Pin comment...'
                    : 'Say something...'
                }
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                className={`w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-full pl-4 pr-10 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:bg-white/20 transition-colors shadow-lg ${
                  mutedUserIds.has(user?.id || '') ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <button onClick={handleSendComment} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/80 hover:text-white">
                <Send className="w-4 h-4" />
              </button>
            </div>

            {isHost ? (
              <>
                <button
                  onClick={() => setIsGuestDrawerOpen(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg relative hover:bg-white/20 transition-colors"
                >
                  <Users className="w-5 h-5 text-white" />
                  {guestRequests.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-bold border border-black">
                      {guestRequests.length}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setCameraFacingMode((p) => (p === 'user' ? 'environment' : 'user'))}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={toggleMic}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg relative hover:bg-white/20 transition-colors"
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="w-5 h-5 text-red-400" />
                      <div className="absolute inset-0 m-auto w-6 h-[2px] bg-red-500 rotate-45 pointer-events-none rounded-full" />
                    </>
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
                <button
                  onClick={() => setIsLightingOn(!isLightingOn)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg hover:bg-white/20 transition-colors"
                >
                  <Sparkles className={`w-5 h-5 ${isLightingOn ? 'text-amber-400' : 'text-white'}`} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (!activeChannelRef.current || !user) return;
                    activeChannelRef.current.send({
                      type: 'broadcast',
                      event: 'cohost-request',
                      payload: { user }
                    });
                    toast.success('Request sent to host!');
                  }}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)] relative hover:bg-white/10 transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                </button>
                <button
                  onClick={() => setIsGiftDrawerOpen(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-white/20 hover:scale-105 transition-transform"
                >
                  <Gift className="w-5 h-5 text-white fill-white/20" />
                </button>
                <button
                  onClick={handleLike}
                  className="w-10 h-10 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.3)] hover:bg-rose-500/40 transition-colors"
                >
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                </button>
              </>
            )}
          </div>

          {/* Floating Hearts Overlay */}
          <div className="absolute bottom-20 right-4 w-12 h-64 pointer-events-none z-40 overflow-visible">
            <AnimatePresence>
              {floatingHearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                  animate={{ opacity: [1, 1, 0], y: -250, x: [0, heart.x, -heart.x, heart.x], scale: [0.5, 1.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                  className="absolute bottom-0 right-2 text-2xl drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                >
                  {heart.icon}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Live Gift Overlay Engine */}
          <LiveGiftOverlay incomingGift={activeGiftAnim} />

          {/* Hype Meter */}
          <div className="absolute top-[100px] left-4 right-4 z-20 pointer-events-none flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3 h-3 text-rose-500 animate-pulse" />
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Hype Meter</span>
            </div>
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <motion.div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (likesCount / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* End Stream Confirmation Modal */}
          {showEndConfirm && (
            <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">End LIVE broadcast now?</h3>
                <p className="text-sm text-zinc-400 mb-6">Your stream will immediately disconnect for all viewers.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmEndStream} className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
                    End LIVE Broadcast
                  </button>
                  <button onClick={() => setShowEndConfirm(false)} className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* End Summary Overlay */}
          {showEndSummary && (
            <div className="absolute inset-0 z-[1000] bg-[#080b10] flex flex-col items-center justify-center p-6">
              <div className="w-24 h-24 mb-6 relative">
                <img
                  src={
                    liveStreamData.host?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${liveStreamData.host?.username}`
                  }
                  className="w-full h-full rounded-full border border-white/20 relative z-10 object-cover bg-neutral-900"
                />
                <div className="absolute inset-[-4px] rounded-full border-2 border-zinc-700/50 z-0"></div>
              </div>

              <h2 className="text-xl text-white/60 mb-1">@{liveStreamData.host?.username}</h2>
              <h1 className="text-4xl font-black text-white tracking-tight mb-8">LIVE has ended</h1>

              <div className="text-center mb-10">
                <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 drop-shadow-[0_0_20px_rgba(45,212,191,0.3)]">
                  {viewerCount.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400 mt-2 font-medium">Viewers watched this LIVE broadcast</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 w-full max-w-sm grid grid-cols-2 gap-y-6 gap-x-4 mb-10">
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" /> Total Viewers
                  </p>
                  <p className="text-2xl font-bold text-white">{viewerCount.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Likes Received
                  </p>
                  <p className="text-2xl font-bold text-white">{likesCount.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Diamonds
                  </p>
                  <p className="text-2xl font-bold text-white">{totalCoinsEarned.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Play className="w-3 h-3 text-fuchsia-400" /> Live Duration
                  </p>
                  <p className="text-2xl font-bold text-white">00:00</p>
                </div>
              </div>

              <div className="w-full max-w-sm flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowEndSummary(false);
                    setMode('DISCOVERY');
                  }}
                  className="w-full py-4 rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-[1.02] transition-transform"
                >
                  Back to Live Feed
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg transition-colors"
                >
                  Exit to EarnMega
                </button>
              </div>
            </div>
          )}

          <LiveGiftDrawer isOpen={isGiftDrawerOpen} onClose={() => setIsGiftDrawerOpen(false)} onSendGift={handleSendGift} />

          {/* Target Viewer Moderation Modal */}
          <AnimatePresence>
            {targetViewer && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 rounded-t-3xl p-6 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        targetViewer.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetViewer.username}`
                      }
                      className="w-12 h-12 rounded-full border border-white/20 object-cover bg-neutral-900"
                    />
                    <div>
                      <h3 className="font-bold text-lg text-white">@{targetViewer.username}</h3>
                      <span className="text-xs text-zinc-400">Viewer</span>
                    </div>
                  </div>
                  <button onClick={() => setTargetViewer(null)} className="p-2 bg-white/10 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={handleMuteViewer} className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-xl flex items-center gap-3 text-left transition-colors">
                    <MicOff className="w-5 h-5 text-rose-400" />
                    <span className="font-semibold text-white">{mutedUserIds.has(targetViewer.id) ? 'Unmute Viewer' : 'Mute Viewer'}</span>
                  </button>
                  <button onClick={handleBlockViewer} className="w-full bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-left transition-colors">
                    <Ban className="w-5 h-5 text-rose-500" />
                    <span className="font-semibold text-rose-500">Block & Remove from LIVE</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <GuestRequestDrawer
            isOpen={isGuestDrawerOpen}
            onClose={() => setIsGuestDrawerOpen(false)}
            requests={guestRequests}
            onDecline={(req) => {
              setGuestRequests((prev) => prev.filter((r) => (r.user?.id || r.id) !== (req.user?.id || req.id)));
            }}
            onAccept={(req) => {
              setActiveGuest(req.user);
              setGuestRequests((prev) => prev.filter((r) => (r.user?.id || r.id) !== (req.user?.id || req.id)));
              activeChannelRef.current?.send({
                type: 'broadcast',
                event: 'cohost-accepted',
                payload: { user: req.user }
              });
            }}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
