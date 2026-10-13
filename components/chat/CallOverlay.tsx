import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { Phone, Video, PhoneOff, MicOff, Mic, VideoOff as VideoIcon, Video as VideoOn, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CallOverlayProps {
  currentUser: { id: string; name: string; tier: string; avatarUrl?: string };
}

export default function CallOverlay({ currentUser }: CallOverlayProps) {
  const [incomingCall, setIncomingCall] = useState<any | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const callContainerRef = useRef<HTMLDivElement>(null);

  const appID = 123456789;

  useEffect(() => {
    // Listen for incoming calls via Supabase Realtime 'call-events' channel
    const callChannel = supabase.channel('call-events');

    callChannel.on('broadcast', { event: 'incoming_call' }, (payload) => {
       const { receiverId, callerId, callerName, callerTier, callType, roomID, cost } = payload.payload;

       if (receiverId === currentUser.id && !isInCall) {
          setIncomingCall({
             callerId,
             callerName,
             callerTier,
             callType,
             roomID,
             cost
          });
       }
    }).subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [currentUser.id, isInCall]);

  const joinCall = async (roomID: string, isVideo: boolean) => {
     if (!callContainerRef.current) return;
     setIsInCall(true);

     let kitToken = "";
     try {
       const res = await fetch("/api/generate-token", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ userID: currentUser.id, roomID })
       });
       const data = await res.json();
       if (data.token) {
         kitToken = data.token;
       } else {
         throw new Error("Failed to generate token");
       }
     } catch (e) {
       toast.error("Security error: Could not verify call.");
       setIsInCall(false);
       return;
     }

     const zp = ZegoUIKitPrebuilt.create(kitToken);
     zp.joinRoom({
        container: callContainerRef.current,
        scenario: {
           mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        turnOnCameraWhenJoining: isVideo,
        showMyCameraToggleButton: isVideo,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: false,
        onLeaveRoom: () => {
           setIsInCall(false);
        }
     });
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    // Deduct from caller atomicity (implemented in step 3, calling the RPC here)
    try {
        const { error } = await supabase.rpc('answer_call_deduct_coins', {
            caller_id: incomingCall.callerId,
            call_cost: incomingCall.cost
        });

        if (error) {
           console.error("Failed to deduct coins:", error);
           toast.error("Call failed to connect (Economy error)");
           setIncomingCall(null);
           return;
        }

        // Success deduction, join room
        joinCall(incomingCall.roomID, incomingCall.callType === 'video');
        setIncomingCall(null);

    } catch (e) {
        toast.error("Call failed");
        setIncomingCall(null);
    }
  };

  const declineCall = () => {
    setIncomingCall(null);
  };

  return (
    <>
      <AnimatePresence>
        {incomingCall && !isInCall && (
           <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-12 left-1/2 -translate-x-1/2 w-[90%] max-w-sm rounded-3xl p-4 z-[999] shadow-2xl backdrop-blur-2xl border ${incomingCall.callerTier === 'PRO' || incomingCall.callerTier === 'PREMIUM' ? 'border-amber-400 bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-yellow-600/20 animate-pulse' : 'bg-black/80 border-white/20'}`}
           >
               <div className="flex flex-col items-center justify-center text-center">
                  <div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center ${incomingCall.callerTier === 'PRO' || incomingCall.callerTier === 'PREMIUM' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-white/10'}`}>
                      <Users size={32} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{incomingCall.callerName}</h3>
                  <p className="text-sm text-white/70 mb-6">Incoming {incomingCall.callType} call...</p>

                  <div className="flex gap-6">
                     <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={declineCall}
                        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
                     >
                        <PhoneOff size={24} className="text-white" />
                     </motion.button>
                     <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={answerCall}
                        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg animate-bounce"
                     >
                        {incomingCall.callType === 'video' ? <Video size={24} className="text-white" /> : <Phone size={24} className="text-white" />}
                     </motion.button>
                  </div>
               </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* The actual Call Container */}
      <div
         ref={callContainerRef}
         className={`fixed inset-0 z-[1000] bg-black ${isInCall ? 'block' : 'hidden'}`}
      >
      </div>
    </>
  );
}
