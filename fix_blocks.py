with open("components/chat/ChatInterface.tsx", "r") as f:
    text = f.read()

# Replace block check to check global block ids instead of active chat block state
# In effect hook checkBlocked
new_check_blocked = """
  const blockedUserIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchBlockedUsers = async () => {
       if (!user) return;
       const { data: blockedByMe } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
       const { data: blockedByThem } = await supabase.from('blocked_users').select('blocker_id').eq('blocked_id', user.id);

       const blockedIds = new Set<string>();
       if (blockedByMe) blockedByMe.forEach(b => blockedIds.add(b.blocked_id));
       if (blockedByThem) blockedByThem.forEach(b => blockedIds.add(b.blocker_id));
       blockedUserIdsRef.current = blockedIds;
    };
    fetchBlockedUsers();

    // Set up realtime listener for blocks (optional, but good for completeness)
    const channel = supabase.channel(`blocked_users_${user?.id}`)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, () => {
           fetchBlockedUsers();
       })
       .subscribe();

    return () => {
       supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const checkBlocked = async () => {
       if (!otherUserProfile) {
           setIsBlockedByMe(false);
           setIsBlockedByThem(false);
           return;
       }
       if (blockedUserIdsRef.current.has(otherUserProfile.id)) {
           // Refetch specifically to determine who blocked who for the UI
           const { data: myBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', user?.id).eq('blocked_id', otherUserProfile.id).maybeSingle();
           if (myBlock) setIsBlockedByMe(true);
           else setIsBlockedByMe(false);

           const { data: theirBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', otherUserProfile.id).eq('blocked_id', user?.id).maybeSingle();
           if (theirBlock) setIsBlockedByThem(true);
           else setIsBlockedByThem(false);
       } else {
           setIsBlockedByMe(false);
           setIsBlockedByThem(false);
       }
    };
    checkBlocked();
  }, [user, otherUserProfile, blockedUserIdsRef.current]);
"""

old_check_blocked = """
  // Phase 4 Check Block
  useEffect(() => {
    const checkBlocked = async () => {
       if (!user || !otherUserProfile) return;
       const { data: myBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', user.id).eq('blocked_id', otherUserProfile.id).maybeSingle();
       if (myBlock) setIsBlockedByMe(true);
       else setIsBlockedByMe(false);

       const { data: theirBlock } = await supabase.from('blocked_users').select('*').eq('blocker_id', otherUserProfile.id).eq('blocked_id', user.id).maybeSingle();
       if (theirBlock) setIsBlockedByThem(true);
       else setIsBlockedByThem(false);
    };
    checkBlocked();
  }, [user, otherUserProfile]);
"""
text = text.replace(old_check_blocked, new_check_blocked)

# Now fix the global listener drops
# First, remove isBlockedRef logic for the active chat

old_is_blocked_ref = """  const isBlockedRef = useRef(false);
  useEffect(() => {
     isBlockedRef.current = isBlockedByMe || isBlockedByThem;
  }, [isBlockedByMe, isBlockedByThem]);"""

text = text.replace(old_is_blocked_ref, "")

# Now fix postgres changes
text = text.replace("""      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
          if (isBlockedRef.current) return;
          if (payload.new && (payload.new.receiver_id === user.id || payload.new.sender_id === user.id || payload.new.room_id)) {""", """      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
          if (payload.new) {
              const otherId = payload.new.sender_id === user.id ? payload.new.receiver_id : payload.new.sender_id;
              if (otherId && blockedUserIdsRef.current.has(otherId)) return;
          }
          if (payload.new && (payload.new.receiver_id === user.id || payload.new.sender_id === user.id || payload.new.room_id)) {""")


# Now fix broadcast new_message
text = text.replace("""      .on('broadcast', { event: 'new_message' }, async (payload) => {
        if (isBlockedRef.current) return;
        if (payload.payload.receiverId === currentUserProfile?.id || (payload.payload.roomId && Array.from(exploreUsers).some((u: any) => u.isGroup && u.id === payload.payload.roomId))) {""", """      .on('broadcast', { event: 'new_message' }, async (payload) => {
        if (payload.payload.senderId && blockedUserIdsRef.current.has(payload.payload.senderId)) return;
        if (payload.payload.receiverId === currentUserProfile?.id || (payload.payload.roomId && Array.from(exploreUsers).some((u: any) => u.isGroup && u.id === payload.payload.roomId))) {""")

with open("components/chat/ChatInterface.tsx", "w") as f:
    f.write(text)
