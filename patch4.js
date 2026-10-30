const fs = require('fs');

const data = fs.readFileSync('./components/live/LiveArena.tsx', 'utf8');

const searchStr = `      ) : livekitToken ? (
        <>
          {console.log("[LIVEKIT FORCED URL]: wss://earnmega-mbwh7c26.livekit.cloud")}
          <LiveKitRoom
            video={true}
            audio={true}
            token={livekitToken}
            serverUrl="wss://earnmega-mbwh7c26.livekit.cloud"
            connect={true}
            className="h-full w-full"
            onDisconnected={() => {
              setLivekitToken('');
              setStage('lobby');
            }}
          >
            <LiveKitVideoStage
              role={role}
              isMicMuted={isMicMuted}
              isCamOff={isCamOff}
              beautyMode={beautyMode}
              onTimeout={useCallback(() => {
                setConnectionError("Connection Timed Out.");
                toast.error("Connection Timed Out.");
                setLivekitToken('');
              }, [])}
            />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#09090d]">
          <div className="h-12 w-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
        </div>
      )}`;

const replaceStr = `      ) : (
        <>
          {role === 'host' && (
            <video
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-0"
              ref={(el) => {
                liveVideoRef.current = el;
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.play().catch(() => {});
                }
              }}
            />
          )}
          {livekitToken && (
            <LiveKitRoom
              video={role === 'viewer'}
              audio={role === 'viewer'}
              token={livekitToken}
              serverUrl="wss://earnmega-mbwh7c26.livekit.cloud"
              connect={true}
              className="h-full w-full"
              onDisconnected={() => {
                setLivekitToken('');
                setStage('lobby');
              }}
            >
              {role === 'host' ? (
                <HostLiveKitPublisher localStream={localStream} />
              ) : (
                <LiveKitVideoStage
                  role={role}
                  isMicMuted={isMicMuted}
                  isCamOff={isCamOff}
                  beautyMode={beautyMode}
                  onTimeout={useCallback(() => {
                    setConnectionError("Connection Timed Out.");
                    toast.error("Connection Timed Out.");
                    setLivekitToken('');
                  }, [])}
                />
              )}
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </>
      )`;

if(data.includes(searchStr)) {
  fs.writeFileSync('./components/live/LiveArena.tsx', data.replace(searchStr, replaceStr));
  console.log('Success');
} else {
  console.log('Failed to find exact string match');
}
