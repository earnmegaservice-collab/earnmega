const fs = require('fs');

const data = fs.readFileSync('./components/live/LiveArena.tsx', 'utf8');

let replaceStr1 = `function HostLiveKitPublisher({ localStream }: { localStream: MediaStream | null }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant && localStream) {
      let publishedTrackRefs: any[] = [];
      localStream.getTracks().forEach((track) => {
        localParticipant.publishTrack(track).then((publishedTrack) => {
          publishedTrackRefs.push(publishedTrack);
        }).catch((err) => {
          console.warn("Failed to publish track to LiveKit:", err);
        });
      });
      return () => {
        publishedTrackRefs.forEach((trackRef) => {
          localParticipant.unpublishTrack(trackRef);
        });
      };
    }
  }, [localParticipant, localStream]);

  return null;
}`;

let searchStr1 = `function HostLiveKitPublisher({ localStream }: { localStream: MediaStream | null }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (localParticipant && localStream) {
      localStream.getTracks().forEach((track) => {
        localParticipant.publishTrack(track).catch((err) => {
          console.warn("Failed to publish track to LiveKit:", err);
        });
      });
    }
  }, [localParticipant, localStream]);

  return null;
}`;

let searchStr2 = `  useEffect(() => {
    if (stage === 'setup' || stage === 'countdown' || (stage === 'live' && role === 'host')) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true, // Audio directly active
        })
        .then((stream) => {
          setLocalStream(stream);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.warn('Camera preview warning:', err));
    } else {
      stopPreviewCamera();
    }`;

let replaceStr2 = `  useEffect(() => {
    if (stage === 'setup' || stage === 'countdown' || (stage === 'live' && role === 'host')) {
      setLocalStream((currentStream) => {
        if (currentStream && currentStream.active && currentStream.getVideoTracks().some(t => t.readyState === 'live')) {
          return currentStream;
        }
        navigator.mediaDevices
          .getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true, // Audio directly active
          })
          .then((stream) => {
            setLocalStream(stream);
            if (previewVideoRef.current) {
              previewVideoRef.current.srcObject = stream;
            }
          })
          .catch((err) => console.warn('Camera preview warning:', err));
        return currentStream;
      });
    } else {
      stopPreviewCamera();
    }`;

let searchStr3 = `          <button
            onClick={() => {
              setIsMicMuted((prev) => !prev);
              if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                  track.enabled = isMicMuted;
                });
              }
            }}`;
let replaceStr3 = `          <button
            onClick={() => {
              setIsMicMuted((prev) => {
                const nextState = !prev;
                if (localStream) {
                  localStream.getAudioTracks().forEach(track => {
                    track.enabled = !nextState;
                  });
                }
                return nextState;
              });
            }}`;
let searchStr4 = `          <button
            onClick={() => {
              setIsCamOff((prev) => !prev);
              if (localStream) {
                localStream.getVideoTracks().forEach(track => {
                  track.enabled = isCamOff;
                });
              }
            }}`;
let replaceStr4 = `          <button
            onClick={() => {
              setIsCamOff((prev) => {
                const nextState = !prev;
                if (localStream) {
                  localStream.getVideoTracks().forEach(track => {
                    track.enabled = !nextState;
                  });
                }
                return nextState;
              });
            }}`;

let newData = data.replace(searchStr1, replaceStr1);
newData = newData.replace(searchStr2, replaceStr2);
newData = newData.replace(searchStr3, replaceStr3);
newData = newData.replace(searchStr4, replaceStr4);

fs.writeFileSync('./components/live/LiveArena.tsx', newData);
console.log('Success');
