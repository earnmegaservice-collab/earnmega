1. **Add `started_at` to `LiveStreamRecord` type definition**
   - Update `LiveStreamRecord` in `components/live/LiveArena.tsx` to include `started_at?: string`.
2. **Add `ended` stage to `ArenaStage` type definition**
   - Change `type ArenaStage = 'lobby' | 'setup' | 'countdown' | 'live';` to include `'ended'`.
3. **Live Timer Component inside Live Arena**
   - Create a state variable `liveDuration` string (e.g. "00:00").
   - Create a `useEffect` that runs when `stage === 'live'` and updates `liveDuration` every second using `Date.now() - new Date(currentStream?.started_at || Date.now()).getTime()`.
   - Update the UI to render the timer: an absolute positioned pill at `top-4 left-4 z-50` showing the pulsating red dot and monospace time.
4. **Cinematic Transition Logic**
   - When the host leaves or stream ends, change `stage` to `'ended'`.
   - Update the real-time event listener: if `payload.new.status === 'ended'`, set `stage` to `'ended'`.
   - Update `LiveKitRoom`'s `onDisconnected` to set `stage` to `'ended'` instead of `lobby`.
5. **Render the Cinematic Stream End Screen**
   - Create an `if (stage === 'ended')` block.
   - Design the screen with the frosted glass overlay, metallic gradient text, the duration stat card, and the "Return to Arena" CTA.
   - Ensure the last video frame is frozen underneath (by conditionally keeping the `LiveKitRoom` unrendered or keeping a frozen frame element—since livekit auto-removes on disconnect, we can just render the dark overlay on top of whatever is left, or if needed, let the overlay be fully opaque).
6. **Ensure compliance with Next.js/React Rules**
   - Clean up code, avoid rule of hooks violation.
