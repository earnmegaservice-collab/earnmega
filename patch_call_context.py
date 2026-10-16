import re

with open('context/CallContext.tsx', 'r') as f:
    content = f.read()

# 1. Add Web Audio API logic and audioContextRef
audio_context_code = """
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const dialToneRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<any>(null);
  const ringtoneSourceRef = useRef<any>(null);

  const initAudioContext = () => {
     if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
     }
  };

  const playPremiumRingtone = async () => {
     try {
         initAudioContext();
         if (audioContextRef.current.state === 'suspended') {
             await audioContextRef.current.resume();
         }
         const response = await fetch('/ringtone.mp3');
         const arrayBuffer = await response.arrayBuffer();
         const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

         const source = audioContextRef.current.createBufferSource();
         source.buffer = audioBuffer;
         source.loop = true;
         source.connect(audioContextRef.current.destination);
         source.start(0);
         ringtoneSourceRef.current = source;
     } catch (err) {
         console.error("Audio engine failed to play ringtone", err);
     }
  };

  const stopPremiumRingtone = () => {
      if (ringtoneSourceRef.current) {
          try {
             ringtoneSourceRef.current.stop();
             ringtoneSourceRef.current.disconnect();
          } catch(e) {}
          ringtoneSourceRef.current = null;
      }
  };
"""

content = content.replace("  const dialToneRef = useRef<HTMLAudioElement | null>(null);", audio_context_code)

# 2. Modify stopSounds
stop_sounds_old = """
  const stopSounds = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (dialToneRef.current) {
      dialToneRef.current.pause();
      dialToneRef.current.currentTime = 0;
    }
  }, []);
"""

stop_sounds_new = """
  const stopSounds = useCallback(() => {
    stopPremiumRingtone();
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (dialToneRef.current) {
      dialToneRef.current.pause();
      dialToneRef.current.currentTime = 0;
    }
  }, []);
"""
content = content.replace(stop_sounds_old.strip(), stop_sounds_new.strip())

# 3. Update incoming_call logic
incoming_call_old = """
        if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

        try {
           const globalRingtone = document.getElementById('global-ringtone') as HTMLAudioElement;
           if (globalRingtone) globalRingtone.play().catch(console.error);
        } catch (e) {}
"""

incoming_call_new = """
        playPremiumRingtone();

        if (ringtoneRef.current) {
           ringtoneRef.current.play().catch(console.error);
        }

        try {
           const globalRingtone = document.getElementById('global-ringtone') as HTMLAudioElement;
           if (globalRingtone) globalRingtone.play().catch(console.error);
        } catch (e) {}
"""
content = content.replace(incoming_call_old.strip(), incoming_call_new.strip())

# 4. Modify initLocalStream
init_stream_old = """
  const initLocalStream = async (type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 3840, min: 1920 }, frameRate: { ideal: 60, min: 30 }, facingMode: "user" } : false,
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
         localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error("Media error:", err);
      if (err.name === 'NotAllowedError') {
         setPermissionsError(true);
      } else {
         toast.error("Could not access camera/microphone");
      }
      throw err;
    }
  };
"""

init_stream_new = """
  const initLocalStream = async (type: 'audio' | 'video') => {
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video' ? { width: { ideal: 3840, min: 1920 }, frameRate: { ideal: 60, min: 30 }, facingMode: "user" } : false,
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
         localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      console.error("Media error:", err);
      if (type === 'video') {
         try {
             const audioStream = await navigator.mediaDevices.getUserMedia({
                 audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }
             });
             localStreamRef.current = audioStream;
             return audioStream;
         } catch (fallbackErr) {
             console.error("Fallback audio error:", fallbackErr);
             if (err.name === 'NotAllowedError') {
                setPermissionsError(true);
             } else {
                toast.error("Could not access camera/microphone");
             }
             throw err;
         }
      }
      if (err.name === 'NotAllowedError') {
         setPermissionsError(true);
      } else {
         toast.error("Could not access camera/microphone");
      }
      throw err;
    }
  };
"""
content = content.replace(init_stream_old.strip(), init_stream_new.strip())

with open('context/CallContext.tsx', 'w') as f:
    f.write(content)
