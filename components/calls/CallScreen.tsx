import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useConnectionState
} from '@livekit/components-react';
import { Track } from 'livekit-client';

interface CallScreenProps {
  roomId: string;
  callType: 'video' | 'audio';
  onEndCall: () => void;
}

export default function CallScreen({ roomId, callType, onEndCall }: CallScreenProps) {
  const [token, setToken] = useState<string | null>(null);

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
      <VideoConference />
      <RoomAudioRenderer />
      <ControlBar  />
    </LiveKitRoom>
  );
}

function VideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - var(--lk-control-bar-height))' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
