1. **Block 1: 2026 4K Cinema-Grade Universe & Rocket Animation Engine**
   - In `components/live/LiveArena.tsx`, locate `MasterLiveGiftOverlay`.
   - Implement the `GiftUniverseAnimation` (60FPS Canvas, starfield, galaxy, shockwave, banner) inline as a separate component inside `components/live/LiveArena.tsx` (or a separate file if too large, but inline is fine). Use standard Canvas API inside a `useEffect` for rendering.
   - Implement the `GiftRocketAnimation` (Canvas, custom SVG spacecraft, particle afterburner) inline inside `components/live/LiveArena.tsx`.
   - Remove the `🌌` and `🚀` emojis from the JSX of `MasterLiveGiftOverlay` and render `<GiftUniverseAnimation>` or `<GiftRocketAnimation>` instead when `activeMega` is a rocket or universe.
   - For Track A (`activeTrackA.map`), add Framer Motion `transition={{ type: 'spring', damping: 15, stiffness: 200 }}` and add a light-sweep gradient animation to the border via a `div` positioned absolutely.

2. **Block 2: Fix Real-Time Like Counter Sync & Separate Likes from Gift Coins**
   - In the Top HUD, split `total_coins_earned` and `likeCount`. Show `<Heart /> {likeCount}` and add a separate badge for `<Coins /> {currentStream?.total_coins_earned || 0}`.
   - Add `pendingLikesDeltaRef = useRef(0)` in `LiveArena`.
   - Modify `spawnFloatingHeart` to increment `pendingLikesDeltaRef.current` and update local state `setLikeCount((prev) => prev + 1)`. Also add `(clientX, clientY)` params to generate burst hearts (add a new state for bursting hearts at coordinates).
   - Add a `useEffect` with `setInterval` (150ms) to check `pendingLikesDeltaRef.current`. If > 0, send a `LIVE_LIKE` packet `{ type: 'LIVE_LIKE', delta: pendingLikesDeltaRef.current }` and reset to 0.
   - Host `LIVE_LIKE` handler: `setLikeCount((prev) => prev + packet.delta)` and `dispatchArenaPacket({ type: 'LIKE_SYNC', authoritativeLikes: nextTotalLikes })`.
   - Viewer `LIKE_SYNC` handler: `setLikeCount((prev) => Math.max(prev, packet.authoritativeLikes))`.

3. **Block 3: True 1080p HD Viewer Video Quality & Glitch-Free Studio Audio**
   - Remove `videoTrack.contentHint = 'motion'` in `publishHighDefVideo` in `LiveArena.tsx`.
   - Update `navigator.mediaDevices.getUserMedia` in `ensureCamera` to request 1080p (`width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30 }`).
   - In `publishHighDefVideo`, use `simulcast: false`, `videoCodec: 'vp8'`, `videoEncoding: { maxBitrate: 4_500_000, maxFramerate: 30 }` when calling `localParticipant.publishTrack`. Then apply encoding params (`degradationPreference`, `scaleResolutionDownBy`, `maxBitrate`) to `videoPub.track.sender.getParameters()`.
   - In `LiveArena.tsx`, search for `room.startAudio()` calls. Change them to `if (room && !room.canPlaybackAudio) { room.startAudio().catch(() => {}); }`.
   - For `isMicMuted` toggle, don't remove the track. Instead, get the mic publication and call `.mute()` or `.unmute()`.
   - Update `<LiveKitRoom>` `audioPreset` and `dtx` / `red` in `LiveArena.tsx`.

4. **Block 4: TikTok-Style Host Mute Viewer (Session-Only)**
   - Add `mutedViewerIds = useRef<Set<string>>(new Set())` and `const [isMutedByHost, setIsMutedByHost] = useState(false)` in `LiveArena`.
   - Add a state for `selectedViewerForAction`: `{ userId: string, username: string } | null`. Set this when host taps a chat message.
   - Create a Host Viewer Action Sheet UI modal using Framer Motion when `selectedViewerForAction` is set. Include a "Mute from Chat" button.
   - Muting broadcasts a `VIEWER_MUTED` packet. Viewer receives it, sets `isMutedByHost = true`, and shows a toast.
   - The chat input is blocked if `isMutedByHost` is true. Host filters `LIVE_COMMENT` where `packet.senderId` is in `mutedViewerIds.current`.
   - Reset muting state in `handleStartCountdown`.

5. **Block 5: Host Report Viewer & Viewer Report Live Stream via Resend.com**
   - Create the API route file at `app/api/report-live/route.ts` with Next.js App Router syntax (`export async function POST(request: Request)`). Use the standard `fetch('https://api.resend.com/emails')` since `resend` is in `package.json`.
   - Use `read_file` to verify the creation of `app/api/report-live/route.ts`.
   - Add "Report Viewer" to Host Viewer Action Sheet in `LiveArena.tsx`.
   - Add "Report Live Stream" button to Viewer HUD in `LiveArena.tsx`.
   - Implement the `ReportModal` UI inline in `LiveArena.tsx`, with a state for the report target, category string, and custom reason string. Submit by calling `fetch('/api/report-live', { method: 'POST', body: JSON.stringify({...}) })`.

6. **Verify changes**
   - Use `run_in_bash_session` to execute `npx tsc --noEmit` and `npm run build` for syntax and build verification.
   - Explicitly run `npx playwright test` to ensure visual verification scripts pass.

7. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit the change**
