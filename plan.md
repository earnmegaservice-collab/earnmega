1. **Database Updates**
   - We already added the SQL commands to add `only_admins_message`, `only_admins_edit_info`, `only_admins_add_members`, `only_admins_polls_pins`, and `require_approval` to the `rooms` table in a migration file.

2. **Group Permissions Panel (GroupInfoDrawer.tsx)**
   - Add state variables for the permissions (`onlyAdminsMessage`, `onlyAdminsEditInfo`, `onlyAdminsAddMembers`, `onlyAdminsPollsPins`, `requireApproval`).
   - Fetch these settings in `fetchRoomInfo()`.
   - Create a UI section for `currentUserRole === 'admin'` to toggle these settings.
   - Update `rooms` table on toggle and log a system message `fireSystemMessage`.
   - Note: I need to conditionally hide Edit Info, Add Members based on these new permissions for non-admins.

3. **Message Composer Restriction (ChatInterface.tsx)**
   - Check if `groupDetails.only_admins_message` is true and `!isAdmin`.
   - I already verified this exists `🔒 Only admins can send messages to this group.`. Wait, I'll need to check if the code already has this! (It actually has `isGroupChat && groupDetails?.only_admins_message && !groupMembers.some(...)`. Awesome.

4. **Group Invite Links (GroupInfoDrawer.tsx)**
   - We need to add "Invite via Link" section.
   - Fetch the existing invite link or generate one.
   - Button for "Copy Link", "Share Link" (using navigator.share), and "Reset Invite Link" (invalidates and logs system message).
   - "Approve new members" (using `groupDetails.require_approval`) is handled in step 2.

5. **Shared Media, Documents, Links & Audio Section (GroupInfoDrawer.tsx)**
   - Add tabs for Media, Docs, Links, Audio.
   - Fetch messages for this room that match those categories.
   - Media: `message_type = 'image'` or `message_type = 'video'`.
   - Docs: `message_type = 'document'` or `message_type = 'file'`.
   - Links: messages containing URL.
   - Audio: `message_type = 'audio'`.

6. **Working In-Chat Search & Upgraded 3-Dot Menu (ChatInterface.tsx)**
   - Search bar inside the chat header. Tapping magnifying glass opens a text input `inChatSearchQuery`.
   - Highlight matching messages and allow scrolling.
   - 3-Dot Header menu:
     - Group Info (triggers `isGroupInfoDrawerOpen`)
     - Search (focuses search bar)
     - Mute / Unmute (Updates `notifications_muted` or local preference)
     - Theme & Wallpaper (mock/open modal)
     - Clear Chat / Leave Group

7. **Pre-commit Checks**
   - Run `pre_commit_instructions` tool to verify before submit.

8. **Submit**
   - Push and verify build.
