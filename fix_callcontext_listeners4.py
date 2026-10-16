import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# Let's replace the `signaling-${user.id}` channel with `chat-events` channel
# and use the event names `incoming_call`, `call_answered`, `webrtc_ice_candidate`, `call_ended`, `call_ringing`
# Wait, `chat-events` receives events for ALL users! We need to check if receiverId matches.

channel_listener_str = """const channel = supabase.channel(`signaling-${user.id}`)
      .on('broadcast', { event: 'call_offer' }, async (payload: any) => {
        if (callState !== 'idle') return;
        console.log("Global Call offer received:", payload);

        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({ id: payload.payload.callerId, name: payload.payload.callerName, avatar: payload.payload.callerAvatar });
        setIncomingOffer(payload.payload.offer);
        setCallState('ringing');

        if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

        try {
           const globalRingtone = document.getElementById('global-ringtone') as HTMLAudioElement;
           if (globalRingtone) globalRingtone.play().catch(console.error);
        } catch (e) {}

        if (navigator.vibrate) {
            navigator.vibrate([1000, 1000, 1000, 1000, 1000]);
        }

        if (document.hidden && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`Incoming ${payload.payload.callType} call from ${payload.payload.callerName}`, {
                    body: 'Tap to answer',
                    icon: '/icon.svg',
                    requireInteraction: true,
                    data: { callerId: payload.payload.callerId }
                });
            });
        }

        const tempChannel = supabase.channel(`signaling-${payload.payload.callerId}`);
        tempChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await tempChannel.send({ type: 'broadcast', event: 'call_ringing', payload: { receiverId: user.id, callerId: payload.payload.callerId } });
          }
        });
      })
      .on('broadcast', { event: 'call_ringing' }, (payload: any) => {
        if (callState === 'calling' && payload.payload.callerId === user.id) {
           setCallState('ringing');
           dialToneRef.current?.play().catch(console.error);
        }
      })
      .on('broadcast', { event: 'call_answer' }, async (payload: any) => {
        if (callState === 'calling' || callState === 'ringing') {
            stopSounds();
            setCallState('connected');
            if (peerConnectionRef.current) {
               try {
                 await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
               } catch (err) {
                 console.error("Failed to set remote desc on answer", err);
               }
            }
        }
      })
      .on('broadcast', { event: 'ice_candidate' }, async (payload: any) => {
        if (peerConnectionRef.current && payload.payload.candidate) {
             try {
                if (peerConnectionRef.current.remoteDescription) {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
                } else {
                    console.log("ICE buffered (not implemented in stub)");
                }
             } catch (err) {
                console.error("Error adding ice candidate", err);
             }
        }
      })
      .on('broadcast', { event: 'call_ended' }, () => {
         endCallLogic();
      })
      .subscribe();

    channelRef.current = channel;"""

new_channel_listener_str = """const channel = supabase.channel('chat-events')
      .on('broadcast', { event: 'incoming_call' }, async (payload: any) => {
        if (payload.payload.receiverId !== user.id) return;
        if (callState !== 'idle') return;

        setIsIncoming(true);
        setCallType(payload.payload.callType);
        setCallerInfo({ id: payload.payload.callerId, name: payload.payload.callerName, avatar: payload.payload.callerAvatar });
        setIncomingOffer(payload.payload.offer);
        setCallState('ringing');

        if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

        try {
           const globalRingtone = document.getElementById('global-ringtone') as HTMLAudioElement;
           if (globalRingtone) globalRingtone.play().catch(console.error);
        } catch (e) {}

        if (navigator.vibrate) {
            navigator.vibrate([1000, 1000, 1000, 1000, 1000]);
        }

        if (document.hidden && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`Incoming ${payload.payload.callType} call from ${payload.payload.callerName}`, {
                    body: 'Tap to answer',
                    icon: '/icon.svg',
                    requireInteraction: true,
                    data: { callerId: payload.payload.callerId }
                });
            });
        }

        channelRef.current?.send({ type: 'broadcast', event: 'call_ringing', payload: { callerId: payload.payload.callerId, receiverId: user.id } });
      })
      .on('broadcast', { event: 'call_ringing' }, (payload: any) => {
        if (payload.payload.callerId === user.id && callState === 'calling') {
           setCallState('ringing');
           dialToneRef.current?.play().catch(console.error);
        }
      })
      .on('broadcast', { event: 'call_answered' }, async (payload: any) => {
        if (payload.payload.callerId !== user.id) return;
        if (callState === 'calling' || callState === 'ringing') {
            stopSounds();
            setCallState('connected');
            if (peerConnectionRef.current) {
               try {
                 await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
               } catch (err) {
                 console.error("Failed to set remote desc on answer", err);
               }
            }
        }
      })
      .on('broadcast', { event: 'webrtc_ice_candidate' }, async (payload: any) => {
        if (payload.payload.targetId !== user.id) return;
        if (peerConnectionRef.current && payload.payload.candidate) {
             try {
                if (peerConnectionRef.current.remoteDescription) {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
                } else {
                    console.log("ICE buffered (not implemented in stub)");
                }
             } catch (err) {
                console.error("Error adding ice candidate", err);
             }
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload: any) => {
         if (payload.payload.targetId === user.id) {
             endCallLogic();
         }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              channelRef.current = channel;
          }
      });"""

content = content.replace(channel_listener_str, new_channel_listener_str)

# Now we must update initiateCall, acceptCall, and declineCall to use `channelRef.current?.send` with 'chat-events' instead of opening temporary channels.

initiateCall_str = """const offer = await pc.createOffer();
       await pc.setLocalDescription(offer);

       // Broadcast to receiver's channel
       const tempChannel = supabase.channel(`signaling-${receiverId}`);
       tempChannel.subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
           await tempChannel.send({
             type: 'broadcast',
             event: 'call_offer',
             payload: {
               callerId: user.id,
               callerName: user.email?.split('@')[0] || 'User',
               callerAvatar: '',
               receiverId: receiverId,
               callType: type,
               offer: offer
             }
           });
         }
       });"""

new_initiateCall_str = """const offer = await pc.createOffer();
       await pc.setLocalDescription(offer);

       channelRef.current?.send({
         type: 'broadcast',
         event: 'incoming_call',
         payload: {
           callerId: user.id,
           callerName: user.email?.split('@')[0] || 'User',
           callerAvatar: '',
           receiverId: receiverId,
           callType: type,
           offer: offer
         }
       });"""

content = content.replace(initiateCall_str, new_initiateCall_str)


acceptCall_str = """const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const tempChannel = supabase.channel(`signaling-${callerInfo.id}`);
      tempChannel.subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
            await tempChannel.send({
              type: 'broadcast',
              event: 'call_answer',
              payload: { callerId: callerInfo.id, receiverId: user.id, answer: answer }
            });
         }
      });"""

new_acceptCall_str = """const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_answered',
        payload: { callerId: callerInfo.id, receiverId: user.id, answer: answer }
      });"""

content = content.replace(acceptCall_str, new_acceptCall_str)


declineCall_str = """const declineCall = () => {
     stopSounds();
     const tempChannel = supabase.channel(`signaling-${callerInfo.id}`);
     tempChannel.subscribe(async (status) => {
       if (status === 'SUBSCRIBED') {
         await tempChannel.send({ type: 'broadcast', event: 'call_ended', payload: { targetId: callerInfo.id } });
       }
     });
     endCallLogic();
  };"""

new_declineCall_str = """const declineCall = () => {
     stopSounds();
     channelRef.current?.send({ type: 'broadcast', event: 'call_ended', payload: { targetId: callerInfo.id } });
     endCallLogic();
  };"""

content = content.replace(declineCall_str, new_declineCall_str)

# Also fix the ice_candidate sender in initPeerConnection
ice_candidate_sender_str = """pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        let targetId = callerInfo.id;
        const tempChannel = supabase.channel(`signaling-${targetId}`);
        tempChannel.subscribe(async (status) => {
           if (status === 'SUBSCRIBED') {
              await tempChannel.send({
                type: 'broadcast',
                event: 'ice_candidate',
                payload: { candidate: event.candidate, targetId: targetId }
              });
           }
        });
      }
    };"""

new_ice_candidate_sender_str = """pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        let targetId = callerInfo.id;
        channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_ice_candidate',
            payload: { candidate: event.candidate, targetId: targetId }
        });
      }
    };"""

content = content.replace(ice_candidate_sender_str, new_ice_candidate_sender_str)

with open('context/CallContext.tsx', 'w') as f:
    f.write(content)
