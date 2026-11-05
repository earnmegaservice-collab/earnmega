1. **Block 1: Global App-Wide Fetching & Realtime Listeners**
    - Update `NotificationContext.tsx`:
        - In `fetchNotifications`, run 4 parallel queries (`Promise.allSettled`) to `public.notifications`, `public.messages`, `public.statuses`, and `public.live_streams`.
        - Add proper mapped attributes to `GlobalNotification`.
        - Add listener on `postgres_changes` for `live_streams` to catch both `INSERT` and `UPDATE` events.
        - Add listener on `postgres_changes` for `statuses` `INSERT` event.
        - Map to `GlobalNotification` with proper metadata.
2. **Block 2: Outside-App OS Push Notifications**
    - Update `NotificationContext.tsx`:
        - Limit `triggerNativeNotification` strictly to `STATUS_POSTED` and `LIVE_STARTED` notifications. Do not call it for chats or other items.
        - Remove the broken URL check. Check `isMuted` and skip if true.
        - Play chime before triggering notification. Update the chime with real Base64 WAV string for fallback audio.
    - Update `public/sw.js`:
        - Adjust `push` and `notificationclick` and `message` to support new requirements and branding (HorPal).
3. **Block 3: Human-Readable Source Attribution**
    - Update `NotificationContext.tsx`:
        - `resolveProfilesAndRooms`: Support `rooms`, `chat_groups`, `profiles` fallback when resolving group chat metadata.
        - Enhance `cleanNotificationText` regex. Replace empty text with image/video with "Sent a photo/video", etc.
        - Filter out spam `[GROUP_CONFIG_JSON]` from both DB messages and notifications results.
        - Create specific `sourceLabel`, `title`, and `content` for each format type (Group, 1-on-1, Status, Live, Other).
4. **Block 4: Unread Count and Infinite Loop Fixes**
    - Update `NotificationContext.tsx`:
        - Wrap `fetchNotifications`, `markAsRead`, `markAllAsRead`, `clearAllNotifications` in `useCallback`.
        - Ensure `markAllAsRead` is reliable by maintaining seen IDs in `localStorage`.
    - Update `NotificationDrawer.tsx`:
        - Make sure we don't spam fetch. `useEffect` on `isOpen` should only call `markAllAsRead` first.
5. **Block 5: Mute Button Global**
    - Update `NotificationContext.tsx`:
        - Export `isMuted` and `toggleMute` via `useGlobalNotifications`.
        - Ensure `isMuted` checks both `horpal_notif_muted_` and `earnmega_notif_muted_` in `localStorage` instantaneously.
        - Tie it to the bell shaking and toasts and native notifications.
    - Update `NotificationDrawer.tsx`:
        - Read `isMuted` and `toggleMute` from context.
    - Update `AppShell.tsx`:
        - Skip rendering the red unread count bubble on Bell if `isMuted` is true. Check `isMuted` state.
6. **Block 6: Upgrade NotificationDrawer.tsx UI**
    - Add Category Filter Pills (All, Live 🔴, Status 📸, Groups 👥, DMs 💬).
    - Update notification card UI: add source label pill, bold title, human-readable relative time.
    - Add individual dismiss button (`x`).
    - Add deep link behavior on click -> dispatch custom event `'horpal:navigate-notification'`.
    - Catch that event in `AppShell.tsx` and switch tabs appropriately.

7. **Pre-commit Instructions Check**
   - Run verification and build (`npm run build`). Fix errors.
8. **Final Submit**
