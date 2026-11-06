import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useConnectionState,
  FocusLayout
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface CallScreenProps {
  roomId: string;
  callType: 'video' | 'audio';
  isGroup?: boolean;
  onEndCall: () => void;
}

export default function CallScreen({ roomId, callType, isGroup, onEndCall }: CallScreenProps) {
  const [token, setToken] = useState<string | null>(null);

  const connectionState = useConnectionState();
  useEffect(() => {
    if (connectionState === 'connected') {
        window.dispatchEvent(new Event('horpal:call-connected'));
    }
  }, [connectionState]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`/api/livekit?room=${roomId}&role=publisher`);
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Failed to fetch LiveKit token', error);
        onEndCall();
      }
    };
    fetchToken();
  }, [roomId]);

  if (!token) {
    return <div className="fixed inset-0 z-[99999] bg-[#060608] flex items-center justify-center text-white">Connecting...</div>;
  }

  return (
    <LiveKitRoom
      video={callType === 'video'}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}


      onDisconnected={onEndCall}
      className="fixed inset-0 z-[99999] bg-[#060608] flex flex-col"
    >
      <VideoConference isGroup={isGroup} />
      <RoomAudioRenderer />
      <ControlBar  />
    </LiveKitRoom>
  );
}

function VideoConference({ isGroup }: { isGroup?: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div style={{ height: 'calc(100vh - var(--lk-control-bar-height))', width: '100%' }}>
       {isGroup ? (
         <GridLayout tracks={tracks} style={{ height: '100%' }}>
            <ParticipantTile />
         </GridLayout>
       ) : (
         <FocusLayout trackRef={tracks[0]}>
            <ParticipantTile />
         </FocusLayout>
       )}
    </div>
  );
}
