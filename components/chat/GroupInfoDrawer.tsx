"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  X,
  MoreVertical,
  Edit2,
  UserPlus,
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  Crown,
  UserMinus,
  Camera,
  Check,
  Link as LinkIcon,
  Copy,
  Clock,
  CheckCircle,
  Phone,
  Video,
  Search,
  MessageCircle,
  User,
  Trash2,
  Lock,
  FileText,
  ExternalLink,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  groupAvatar?: string;
  currentUserId?: string;
  currentUser?: { id: string; name?: string; username?: string };
  onGroupUpdated?: () => void;
  onSelectUserDM?: (userId: string) => void;
  onTriggerInChatSearch?: () => void;
  onStartGroupCall?: (type: 'audio' | 'video') => void;
}

interface ParticipantItem {
  id: string;
  name: string;
  username: string;
  avatarInitials: string;
  avatarUrl?: string;
  bio: string;
  joinDate: string;
  tier: string;
  isOnline: boolean;
  coinsGifted: number;
  isSelf: boolean;
  isVerified: boolean;
  role: 'owner' | 'admin' | 'member';
  images?: string[];
}

interface GroupPermissions {
  only_admins_can_send: boolean;
  only_admins_can_edit_info: boolean;
  only_admins_can_add_members: boolean;
  approve_new_members: boolean;
}

export default function GroupInfoDrawer({
  isOpen,
  onClose,
  groupId,
  groupName = 'Group Chat',
  groupAvatar,
  currentUserId,
  currentUser,
  onGroupUpdated,
  onSelectUserDM,
  onTriggerInChatSearch,
  onStartGroupCall
}: GroupInfoDrawerProps) {
  const effectiveUserId = currentUserId || currentUser?.id || '';

  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member'>('member');

  // Group Header & Info State
  const [displayGroupName, setDisplayGroupName] = useState(groupName);
  const [displayGroupAvatar, setDisplayGroupAvatar] = useState(groupAvatar || '');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [groupBio, setGroupBio] = useState('');
  const [newGroupBio, setNewGroupBio] = useState('');
  const [groupCreatedAt, setGroupCreatedAt] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>('Admin');
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member Search & Action Menu
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Invites & Join Requests
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);

  // Group Permissions (Block 4)
  const [permissions, setPermissions] = useState<GroupPermissions>({
    only_admins_can_send: false,
    only_admins_can_edit_info: false,
    only_admins_can_add_members: false,
    approve_new_members: false
  });

  // Shared Media Tabs (Block 4)
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [sharedMessages, setSharedMessages] = useState<any[]>([]);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Modals: Add Members, Profile Preview, Confirm Dialogs
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidateUsers, setCandidateUsers] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<ParticipantItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canEditInfo = isAdminOrOwner || !permissions.only_admins_can_edit_info;
  const canAddMembers = isAdminOrOwner || !permissions.only_admins_can_add_members;

  const currentActorName = useMemo(() => {
    const me = participants.find((p) => p.id === effectiveUserId);
    return me?.name || currentUser?.name || currentUser?.username || 'Admin';
  }, [participants, effectiveUserId, currentUser]);

  useEffect(() => {
    setDisplayGroupName(groupName);
    setNewGroupName(groupName);
  }, [groupName]);

  useEffect(() => {
    if (groupAvatar) setDisplayGroupAvatar(groupAvatar);
  }, [groupAvatar]);

  // Fetch Group Metadata across chat_groups, rooms, and conversations
  const fetchRoomInfo = async () => {
    if (!groupId) return;
    try {
      let groupRecord: any = null;

      const { data: cgData } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();

      if (cgData) {
        groupRecord = cgData;
      } else {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', groupId)
          .maybeSingle();
        if (roomData) {
          groupRecord = roomData;
        } else {
          const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', groupId)
            .maybeSingle();
          if (convData) groupRecord = convData;
        }
      }

      if (groupRecord) {
        const resolvedName = groupRecord.name || groupRecord.title || groupName;
        const resolvedBio = groupRecord.description || groupRecord.bio || '';
        const resolvedAvatar = groupRecord.icon_url || groupRecord.avatar_url || groupAvatar || '';
        const resolvedCreator = groupRecord.created_by || groupRecord.owner_id || null;

        setDisplayGroupName(resolvedName);
        setNewGroupName(resolvedName);
        setGroupBio(resolvedBio);
        setNewGroupBio(resolvedBio);
        if (resolvedAvatar) setDisplayGroupAvatar(resolvedAvatar);
        if (resolvedCreator) setCreatorId(resolvedCreator);

        if (groupRecord.created_at) {
          setGroupCreatedAt(new Date(groupRecord.created_at).toLocaleDateString());
        }

        if (groupRecord.invite_code) {
          setInviteLink(`${window.location.origin}/invite/${groupRecord.invite_code}`);
        }

        setPermissions({
          only_admins_can_send: Boolean(groupRecord.only_admins_can_send),
          only_admins_can_edit_info: Boolean(groupRecord.only_admins_can_edit_info),
          only_admins_can_add_members: Boolean(groupRecord.only_admins_can_add_members),
          approve_new_members: Boolean(groupRecord.approve_new_members)
        });

        if (resolvedCreator) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('full_name, name, username')
            .eq('id', resolvedCreator)
            .maybeSingle();
          if (creatorProfile) {
            setCreatorName(
              creatorProfile.username
                ? `@${creatorProfile.username}`
                : creatorProfile.full_name || creatorProfile.name || 'Admin'
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch room info:', err);
    }
  };

  // Fetch Participants across group_members, room_participants, and conversation_participants
  const fetchParticipants = async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const rawMembersMap = new Map<string, { user_id: string; role: string }>();

      // 1. Check group_members
      const { data: gmData } = await supabase
        .from('group_members')
        .select('user_id, role, status')
        .eq('group_id', groupId);

      if (gmData && gmData.length > 0) {
        gmData.forEach((row: any) => {
          if (row.status !== 'removed' && row.status !== 'left') {
            rawMembersMap.set(row.user_id, {
              user_id: row.user_id,
              role: row.role || 'member'
            });
          }
        });
      }

      // 2. Check room_participants
      const { data: rpData } = await supabase
        .from('room_participants')
        .select('user_id, role')
        .eq('room_id', groupId);

      if (rpData && rpData.length > 0) {
        rpData.forEach((row: any) => {
          const existing = rawMembersMap.get(row.user_id);
          if (!existing || existing.role === 'member') {
            rawMembersMap.set(row.user_id, {
              user_id: row.user_id,
              role: row.role || existing?.role || 'member'
            });
          }
        });
      }

      // 3. Check conversation_participants
      const { data: cpData } = await supabase
        .from('conversation_participants')
        .select('user_id, role')
        .eq('conversation_id', groupId);

      if (cpData && cpData.length > 0) {
        cpData.forEach((row: any) => {
          if (!rawMembersMap.has(row.user_id)) {
            rawMembersMap.set(row.user_id, {
              user_id: row.user_id,
              role: row.role || 'member'
            });
          }
        });
      }

      // Ensure current user is at least listed if no table returned rows yet
      if (rawMembersMap.size === 0 && effectiveUserId) {
        rawMembersMap.set(effectiveUserId, {
          user_id: effectiveUserId,
          role: 'owner'
        });
      }

      const userIds = Array.from(rawMembersMap.keys());
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileLookup = new Map<string, any>();
      (profilesData || []).forEach((p: any) => profileLookup.set(p.id, p));

      const formatted: ParticipantItem[] = userIds.map((uid) => {
        const meta = rawMembersMap.get(uid)!;
        const u = profileLookup.get(uid) || {};
        const displayName = u.full_name || u.name || u.username || 'User';
        const username = u.username || displayName.toLowerCase().replace(/\s+/g, '');

        let role: 'owner' | 'admin' | 'member' =
          meta.role === 'owner'
            ? 'owner'
            : meta.role === 'admin'
            ? 'admin'
            : 'member';

        if (creatorId && uid === creatorId) {
          role = 'owner';
        }

        return {
          id: uid,
          name: displayName,
          username,
          avatarInitials: displayName.substring(0, 2).toUpperCase(),
          avatarUrl: u.avatar_url || (Array.isArray(u.images) && u.images[0]) || undefined,
          bio: u.bio || 'Available on EarnMega',
          joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Member',
          tier: u.subscription_tier || 'FREE',
          isOnline: Boolean(u.is_online),
          coinsGifted: Number(u.coins_gifted || 0),
          isSelf: uid === effectiveUserId,
          isVerified: Boolean(u.is_verified),
          role,
          images: Array.isArray(u.images) ? u.images : u.avatar_url ? [u.avatar_url] : []
        };
      });

      // If no one has owner/admin role at all, assign the first member or creator as owner
      const hasPrivileged = formatted.some((p) => p.role === 'owner' || p.role === 'admin');
      if (!hasPrivileged && formatted.length > 0) {
        const selfIdx = formatted.findIndex((p) => p.isSelf);
        if (selfIdx >= 0) formatted[selfIdx].role = 'owner';
        else formatted[0].role = 'owner';
      }

      // Sort: Owner first, then Admins, then alphabetically
      formatted.sort((a, b) => {
        const rank = { owner: 0, admin: 1, member: 2 };
        if (rank[a.role] !== rank[b.role]) return rank[a.role] - rank[b.role];
        return a.name.localeCompare(b.name);
      });

      setParticipants(formatted);

      const me = formatted.find((p) => p.id === effectiveUserId);
      setCurrentUserRole(me?.role || 'member');

      const ownerEntry = formatted.find((p) => p.role === 'owner') || formatted.find((p) => p.role === 'admin');
      if (ownerEntry) {
        setCreatorName(`@${ownerEntry.username}`);
      }
    } catch (err) {
      console.error('Failed to fetch group participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Shared Media, Docs & Links from messages
  const fetchSharedMedia = async () => {
    if (!groupId) return;
    try {
      const { data: msgByRoom } = await supabase
        .from('messages')
        .select('id, content, media_url, attachment_url, file_url, message_type, created_at')
        .or(`room_id.eq.${groupId},conversation_id.eq.${groupId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (msgByRoom) {
        setSharedMessages(msgByRoom);
      }
    } catch (err) {
      console.error('Failed to fetch shared media:', err);
    }
  };

  // Fetch Pending Join Requests
  const fetchJoinRequests = async () => {
    if (!isAdminOrOwner || !groupId) return;
    setIsRequestsLoading(true);
    try {
      const { data } = await supabase
        .from('group_join_requests')
        .select('id, user_id, status, created_at, profiles(id, full_name, name, avatar_url, username)')
        .or(`room_id.eq.${groupId},group_id.eq.${groupId}`)
        .eq('status', 'pending');
      setJoinRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      fetchRoomInfo();
      fetchParticipants();
      fetchSharedMedia();
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    if (isOpen && isAdminOrOwner) {
      fetchJoinRequests();
    }
  }, [isOpen, isAdminOrOwner, groupId]);

  // Realtime subscription to group member & room updates
  useEffect(() => {
    if (!isOpen || !groupId) return;
    const channel = supabase
      .channel(`group_info_${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${groupId}` },
        () => fetchParticipants()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, groupId]);

  // System Message Dispatcher
  const fireSystemMessage = async (content: string, type: string) => {
    if (!groupId || !effectiveUserId) return;
    try {
      const payload: any = {
        id: uuidv4(),
        sender_id: effectiveUserId,
        room_id: groupId,
        conversation_id: groupId,
        content,
        message_type: 'system',
        is_system_message: true,
        system_event_type: type,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('messages').insert(payload);
      if (error) {
        // Fallback minimal insert if optional columns don't exist
        await supabase.from('messages').insert({
          id: uuidv4(),
          sender_id: effectiveUserId,
          room_id: groupId,
          content,
          is_system_message: true
        });
      }
    } catch (err) {
      console.error('System message error:', err);
    }
  };

  // Update Group Name & Description
  const handleUpdateGroupInfo = async () => {
    if (!canEditInfo) {
      toast.error('Only admins can edit group info');
      return;
    }

    const trimmedName = newGroupName.trim();
    const trimmedBio = newGroupBio.trim();
    const isNameChanged = trimmedName && trimmedName !== displayGroupName;
    const isBioChanged = trimmedBio !== groupBio;

    if (!isNameChanged && !isBioChanged) {
      setIsEditingInfo(false);
      return;
    }

    const runUpdate = async () => {
      if (isNameChanged) {
        await supabase.from('chat_groups').update({ name: trimmedName }).eq('id', groupId);
        await supabase.from('rooms').update({ name: trimmedName }).eq('id', groupId);
        await supabase.from('conversations').update({ name: trimmedName }).eq('id', groupId);
        await fireSystemMessage(`${currentActorName} changed the group name to "${trimmedName}"`, 'group_name_changed');
        setDisplayGroupName(trimmedName);
      }
      if (isBioChanged) {
        await supabase.from('chat_groups').update({ description: trimmedBio }).eq('id', groupId);
        await supabase.from('rooms').update({ description: trimmedBio }).eq('id', groupId);
        await fireSystemMessage(`${currentActorName} updated the group description`, 'group_bio_changed');
        setGroupBio(trimmedBio);
      }
      setIsEditingInfo(false);
      onGroupUpdated?.();
    };

    toast.promise(runUpdate(), {
      loading: 'Saving group info...',
      success: 'Group info updated!',
      error: 'Failed to update group info'
    });
  };

  // Upload Group Icon
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `group-${groupId}-${Date.now()}.${fileExt}`;

    const uploadTask = async () => {
      let publicUrl = '';
      const { error: avatarErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (!avatarErr) {
        publicUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      } else {
        const { error: attachErr } = await supabase.storage.from('chat-attachments').upload(fileName, file, { upsert: true });
        if (attachErr) throw attachErr;
        publicUrl = supabase.storage.from('chat-attachments').getPublicUrl(fileName).data.publicUrl;
      }

      await supabase.from('chat_groups').update({ icon_url: publicUrl, avatar_url: publicUrl }).eq('id', groupId);
      await supabase.from('rooms').update({ avatar_url: publicUrl }).eq('id', groupId);
      await supabase.from('conversations').update({ avatar_url: publicUrl }).eq('id', groupId);

      setDisplayGroupAvatar(publicUrl);
      await fireSystemMessage(`${currentActorName} changed the group icon`, 'group_icon_changed');
      onGroupUpdated?.();
    };

    toast.promise(uploadTask(), {
      loading: 'Uploading group photo...',
      success: 'Group icon updated!',
      error: 'Failed to upload photo'
    });
  };

  // Search Candidate Users for Add Members Modal
  useEffect(() => {
    if (!isAddMemberOpen) return;
    let isCancelled = false;

    const searchProfiles = async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, name, username, avatar_url, bio, is_online')
        .limit(30);

      if (candidateQuery.trim()) {
        const q = candidateQuery.trim();
        query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,name.ilike.%${q}%`);
      }

      const { data } = await query;
      if (!isCancelled && data) {
        const existingIds = new Set(participants.map((p) => p.id));
        setCandidateUsers(data.filter((u: any) => !existingIds.has(u.id)));
      }
    };

    searchProfiles();
    return () => {
      isCancelled = true;
    };
  }, [isAddMemberOpen, candidateQuery, participants]);

  // Confirm Add Members (Block 3)
  const handleConfirmAddMembers = async () => {
    if (selectedCandidates.length === 0) return;
    setIsAddingMembers(true);

    try {
      for (const candidate of selectedCandidates) {
        await supabase.from('group_members').upsert({
          group_id: groupId,
          user_id: candidate.id,
          role: 'member',
          status: 'active',
          added_by: effectiveUserId
        });

        await supabase.from('room_participants').upsert({
          room_id: groupId,
          user_id: candidate.id,
          role: 'member'
        });

        await supabase.from('conversation_participants').upsert({
          conversation_id: groupId,
          user_id: candidate.id,
          role: 'member'
        });

        // Send global notification
        await supabase.from('notifications').insert({
          user_id: candidate.id,
          actor_id: effectiveUserId,
          type: 'GROUP_INVITE',
          title: `Added to ${displayGroupName}`,
          message: `${currentActorName} added you to "${displayGroupName}"`,
          reference_id: groupId,
          is_read: false
        });
      }

      // Format combined system message
      const names = selectedCandidates.map((c) => c.full_name || c.name || c.username || 'User');
      let sysText = '';
      if (names.length === 1) {
        sysText = `${currentActorName} added ${names[0]}`;
      } else if (names.length === 2) {
        sysText = `${currentActorName} added ${names[0]} and ${names[1]}`;
      } else {
        sysText = `${currentActorName} added ${names[0]}, ${names[1]} and ${names.length - 2} others`;
      }

      await fireSystemMessage(sysText, 'member_added');
      toast.success(`Added ${selectedCandidates.length} member(s)!`);
      setSelectedCandidates([]);
      setIsAddMemberOpen(false);
      await fetchParticipants();
      onGroupUpdated?.();
    } catch (err) {
      console.error('Failed to add members:', err);
      toast.error('Could not add selected members');
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Promote to Admin
  const handleMakeAdmin = async (targetId: string, targetName: string) => {
    if (!isAdminOrOwner) return;
    const task = async () => {
      await supabase.from('group_members').update({ role: 'admin' }).match({ group_id: groupId, user_id: targetId });
      await supabase.from('room_participants').update({ role: 'admin' }).match({ room_id: groupId, user_id: targetId });
      await supabase.from('conversation_participants').update({ role: 'admin' }).match({ conversation_id: groupId, user_id: targetId });

      setParticipants((prev) => prev.map((p) => (p.id === targetId ? { ...p, role: 'admin' } : p)));
      await fireSystemMessage(`${currentActorName} made ${targetName} an admin`, 'admin_promoted');
      setActiveMenuId(null);
    };

    toast.promise(task(), {
      loading: `Promoting ${targetName}...`,
      success: `${targetName} is now a Group Admin`,
      error: 'Failed to promote member'
    });
  };

  // Dismiss as Admin
  const handleDismissAdmin = async (targetId: string, targetName: string) => {
    if (!isAdminOrOwner) return;
    const task = async () => {
      await supabase.from('group_members').update({ role: 'member' }).match({ group_id: groupId, user_id: targetId });
      await supabase.from('room_participants').update({ role: 'member' }).match({ room_id: groupId, user_id: targetId });
      await supabase.from('conversation_participants').update({ role: 'member' }).match({ conversation_id: groupId, user_id: targetId });

      setParticipants((prev) => prev.map((p) => (p.id === targetId ? { ...p, role: 'member' } : p)));
      await fireSystemMessage(`${currentActorName} removed ${targetName} as an admin`, 'admin_dismissed');
      setActiveMenuId(null);
    };

    toast.promise(task(), {
      loading: `Updating ${targetName}'s role...`,
      success: `${targetName} dismissed as admin`,
      error: 'Failed to dismiss admin'
    });
  };

  // Transfer Group Ownership
  const handleTransferOwnership = async (targetId: string, targetName: string) => {
    if (currentUserRole !== 'owner') return;
    setActiveMenuId(null);
    setConfirmDialog({
      isOpen: true,
      title: 'Transfer Group Ownership?',
      message: `Are you sure you want to make ${targetName} the new Owner of "${displayGroupName}"? You will become a Group Admin.`,
      confirmText: 'Transfer Ownership',
      onConfirm: async () => {
        await supabase.from('group_members').update({ role: 'owner' }).match({ group_id: groupId, user_id: targetId });
        await supabase.from('group_members').update({ role: 'admin' }).match({ group_id: groupId, user_id: effectiveUserId });

        await supabase.from('room_participants').update({ role: 'owner' }).match({ room_id: groupId, user_id: targetId });
        await supabase.from('room_participants').update({ role: 'admin' }).match({ room_id: groupId, user_id: effectiveUserId });

        await supabase.from('chat_groups').update({ created_by: targetId }).eq('id', groupId);
        await supabase.from('rooms').update({ created_by: targetId }).eq('id', groupId);

        await fireSystemMessage(`${currentActorName} transferred group ownership to ${targetName}`, 'ownership_transferred');
        toast.success(`Ownership transferred to ${targetName}`);
        await fetchParticipants();
      }
    });
  };

  // Remove Member
  const handleRemoveUser = (targetId: string, targetName: string) => {
    if (!isAdminOrOwner) {
      toast.error('Only group admins can remove members');
      return;
    }
    setActiveMenuId(null);
    setConfirmDialog({
      isOpen: true,
      title: `Remove ${targetName}?`,
      message: `Remove ${targetName} from "${displayGroupName}"? They won't be able to send or receive new messages in this group.`,
      confirmText: 'Remove',
      isDanger: true,
      onConfirm: async () => {
        setParticipants((prev) => prev.filter((p) => p.id !== targetId));

        await supabase.from('group_members').delete().match({ group_id: groupId, user_id: targetId });
        await supabase.from('room_participants').delete().match({ room_id: groupId, user_id: targetId });
        await supabase.from('conversation_participants').delete().match({ conversation_id: groupId, user_id: targetId });
        await supabase.rpc('remove_participant', { room_id_param: groupId, target_user_id: targetId }).catch(() => {});

        await fireSystemMessage(`${currentActorName} removed ${targetName}`, 'user_removed');
        toast.success(`${targetName} removed from group`);
      }
    });
  };

  // Leave Group
  const handleLeaveGroup = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Leave Group?',
      message: `Are you sure you want to leave "${displayGroupName}"?`,
      confirmText: 'Leave Group',
      isDanger: true,
      onConfirm: async () => {
        // If owner leaves and others exist, promote next admin/member
        if (currentUserRole === 'owner') {
          const nextLeader = participants.find((p) => !p.isSelf && p.role === 'admin') || participants.find((p) => !p.isSelf);
          if (nextLeader) {
            await supabase.from('group_members').update({ role: 'owner' }).match({ group_id: groupId, user_id: nextLeader.id });
            await supabase.from('room_participants').update({ role: 'owner' }).match({ room_id: groupId, user_id: nextLeader.id });
          }
        }

        await fireSystemMessage(`${currentActorName} left`, 'user_left');
        await supabase.from('group_members').delete().match({ group_id: groupId, user_id: effectiveUserId });
        await supabase.from('room_participants').delete().match({ room_id: groupId, user_id: effectiveUserId });
        await supabase.from('conversation_participants').delete().match({ conversation_id: groupId, user_id: effectiveUserId });

        toast.success('You left the group');
        onClose();
        onGroupUpdated?.();
      }
    });
  };

  // Delete Group Permanently (Owner/Admin)
  const handleDeleteGroup = () => {
    if (!isAdminOrOwner) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Group Permanently?',
      message: `This will permanently delete "${displayGroupName}" and remove all members. This action cannot be undone.`,
      confirmText: 'Delete Group',
      isDanger: true,
      onConfirm: async () => {
        await supabase.from('group_members').delete().eq('group_id', groupId);
        await supabase.from('room_participants').delete().eq('room_id', groupId);
        await supabase.from('conversation_participants').delete().eq('conversation_id', groupId);
        await supabase.from('messages').delete().or(`room_id.eq.${groupId},conversation_id.eq.${groupId}`);
        await supabase.from('chat_groups').delete().eq('id', groupId);
        await supabase.from('rooms').delete().eq('id', groupId);
        await supabase.from('conversations').delete().eq('id', groupId);

        toast.success('Group deleted permanently');
        onClose();
        onGroupUpdated?.();
      }
    });
  };

  // Toggle Group Permission (Block 4)
  const handleTogglePermission = async (key: keyof GroupPermissions, label: string) => {
    if (!isAdminOrOwner) return;
    const nextVal = !permissions[key];
    setPermissions((prev) => ({ ...prev, [key]: nextVal }));

    try {
      await supabase.from('chat_groups').update({ [key]: nextVal }).eq('id', groupId);
      await supabase.from('rooms').update({ [key]: nextVal }).eq('id', groupId);
      await fireSystemMessage(
        `${currentActorName} updated group settings: ${label} is now ${nextVal ? 'enabled' : 'disabled'}`,
        'permissions_updated'
      );
      toast.success('Group permission updated');
    } catch (err) {
      console.error('Permission update error:', err);
    }
  };

  // Generate or Reset Invite Link
  const generateInviteLink = async (isReset = false) => {
    try {
      const code = uuidv4().substring(0, 8);
      await supabase.from('group_invites').insert({
        room_id: groupId,
        created_by: effectiveUserId,
        code,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      await supabase.from('chat_groups').update({ invite_code: code }).eq('id', groupId);
      const link = `${window.location.origin}/invite/${code}`;
      setInviteLink(link);
      if (isReset) {
        await fireSystemMessage(`${currentActorName} reset the group invite link`, 'invite_reset');
        toast.success('Invite link reset!');
      } else {
        toast.success('Invite link generated!');
      }
    } catch (err) {
      const fallbackLink = `${window.location.origin}/invite/${groupId.substring(0, 8)}`;
      setInviteLink(fallbackLink);
      toast.success('Invite link ready!');
    }
  };

  // Approve or Reject Join Request
  const handleRequestAction = async (requestId: string, userId: string, userName: string, action: 'approved' | 'rejected') => {
    try {
      await supabase.from('group_join_requests').update({ status: action }).eq('id', requestId);

      if (action === 'approved') {
        await supabase.from('group_members').upsert({ group_id: groupId, user_id: userId, role: 'member', status: 'active' });
        await supabase.from('room_participants').upsert({ room_id: groupId, user_id: userId, role: 'member' });
        await supabase.from('conversation_participants').upsert({ conversation_id: groupId, user_id: userId, role: 'member' });
        await fireSystemMessage(`${currentActorName} approved ${userName} to join the group`, 'member_approved');
        toast.success(`${userName} approved and added!`);
        fetchParticipants();
      } else {
        toast.success('Request declined');
      }
      fetchJoinRequests();
    } catch (err) {
      toast.error('Failed to process join request');
    }
  };

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) => p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
    );
  }, [participants, searchQuery]);

  // Categorized Shared Items (Media, Docs, Links)
  const { mediaItems, docItems, linkItems } = useMemo(() => {
    const media: any[] = [];
    const docs: any[] = [];
    const links: { id: string; url: string; created_at: string }[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    sharedMessages.forEach((m) => {
      const url = m.media_url || m.attachment_url || m.file_url;
      if (url) {
        if (/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(url) || m.message_type === 'image' || m.message_type === 'video') {
          media.push({ id: m.id, url, type: m.message_type || 'image', created_at: m.created_at });
        } else {
          docs.push({ id: m.id, url, name: url.split('/').pop() || 'Document', created_at: m.created_at });
        }
      }
      if (typeof m.content === 'string') {
        const found = m.content.match(urlRegex);
        if (found) {
          found.forEach((linkUrl: string) => {
            links.push({ id: `${m.id}-${linkUrl}`, url: linkUrl, created_at: m.created_at });
          });
        }
      }
    });

    return { mediaItems: media, docItems: docs, linkItems: links };
  }, [sharedMessages]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9998] flex justify-end">
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Slide-Over Drawer */}
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-[9999] w-full sm:w-[420px] h-full bg-[#070709] border-l border-white/10 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Top Floating Header */}
              <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <button
                  onClick={onClose}
                  className="p-2.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all"
                >
                  <X size={20} />
                </button>
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Group Info</span>
                {canEditInfo ? (
                  <button
                    onClick={() => setIsEditingInfo(!isEditingInfo)}
                    className="p-2.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                ) : (
                  <div className="w-9" />
                )}
              </div>

              {/* Main Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                {/* Hero Avatar Banner */}
                <div className="relative w-full h-72 bg-neutral-900">
                  {displayGroupAvatar ? (
                    <img src={displayGroupAvatar} alt={displayGroupName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-950/60 via-neutral-900 to-black">
                      <Users size={72} className="text-fuchsia-400/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/40 to-transparent" />

                  {canEditInfo && (
                    <div className="absolute bottom-5 right-5 z-20">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-fuchsia-600 hover:bg-fuchsia-500 border border-white/20 p-3 rounded-full text-white transition-all shadow-xl flex items-center gap-2"
                        title="Change Group Icon"
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Group Name, Description & Creator Meta */}
                <div className="px-6 -mt-6 relative z-20">
                  {isEditingInfo ? (
                    <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-white/40">Group Name</label>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full mt-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white font-bold text-lg focus:outline-none focus:border-fuchsia-500"
                          placeholder="Enter group name..."
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-white/40">Group Description</label>
                        <textarea
                          rows={2}
                          value={newGroupBio}
                          onChange={(e) => setNewGroupBio(e.target.value)}
                          className="w-full mt-1 bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white/80 text-sm focus:outline-none focus:border-fuchsia-500 resize-none"
                          placeholder="Add a group description or rules..."
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setIsEditingInfo(false)}
                          className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateGroupInfo}
                          className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-500 flex items-center gap-1.5"
                        >
                          <Check size={16} /> Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-2xl font-black text-white tracking-tight">{displayGroupName}</h2>
                      </div>
                      <p className="text-fuchsia-400 text-xs font-bold mt-1">
                        Group • {participants.length} {participants.length === 1 ? 'Member' : 'Members'}
                      </p>
                      {groupBio ? (
                        <p className="text-white/80 text-sm mt-3 leading-relaxed bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          {groupBio}
                        </p>
                      ) : (
                        canEditInfo && (
                          <button
                            onClick={() => setIsEditingInfo(true)}
                            className="text-white/40 hover:text-fuchsia-400 text-xs mt-2 flex items-center gap-1 transition-colors"
                          >
                            <Edit2 size={12} /> Add group description
                          </button>
                        )
                      )}
                      <p className="text-white/35 text-[11px] mt-2">
                        Created by {creatorName} • {groupCreatedAt || new Date().toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Action Bar */}
                <div className="px-6 mt-6 grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      if (onStartGroupCall) onStartGroupCall('audio');
                      else toast.success('Starting group audio call...');
                    }}
                    className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl py-3.5 flex flex-col items-center justify-center transition-all"
                  >
                    <Phone size={20} className="text-emerald-400 mb-1.5" />
                    <span className="text-[11px] font-bold text-white/90">Audio</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onStartGroupCall) onStartGroupCall('video');
                      else toast.success('Starting group video call...');
                    }}
                    className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl py-3.5 flex flex-col items-center justify-center transition-all"
                  >
                    <Video size={20} className="text-sky-400 mb-1.5" />
                    <span className="text-[11px] font-bold text-white/90">Video</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onTriggerInChatSearch) {
                        onClose();
                        onTriggerInChatSearch();
                      } else {
                        setIsMemberSearchOpen(true);
                      }
                    }}
                    className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl py-3.5 flex flex-col items-center justify-center transition-all"
                  >
                    <Search size={20} className="text-fuchsia-400 mb-1.5" />
                    <span className="text-[11px] font-bold text-white/90">Search</span>
                  </button>
                </div>

                {/* Shared Media, Docs & Links Tabs (Block 4) */}
                <div className="px-6 mt-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-fuchsia-400" /> Shared Content
                      </span>
                      <div className="flex gap-1 bg-black/50 p-1 rounded-xl border border-white/5">
                        {(['media', 'docs', 'links'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveMediaTab(tab)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                              activeMediaTab === tab
                                ? 'bg-fuchsia-600 text-white shadow'
                                : 'text-white/50 hover:text-white'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeMediaTab === 'media' && (
                      mediaItems.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                          {mediaItems.slice(0, 9).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setPreviewMediaUrl(item.url)}
                              className="aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/10 hover:opacity-85 transition"
                            >
                              <img src={item.url} alt="Shared" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/35 text-center py-4">No photos or videos shared yet</p>
                      )
                    )}

                    {activeMediaTab === 'docs' && (
                      docItems.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {docItems.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <FileText size={15} className="text-sky-400 shrink-0" />
                                <span className="truncate">{doc.name}</span>
                              </span>
                              <ExternalLink size={14} className="text-white/40 shrink-0" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/35 text-center py-4">No documents shared yet</p>
                      )
                    )}

                    {activeMediaTab === 'links' && (
                      linkItems.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {linkItems.map((lnk) => (
                            <a
                              key={lnk.id}
                              href={lnk.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-fuchsia-300 truncate"
                            >
                              <span className="truncate mr-2">{lnk.url}</span>
                              <ExternalLink size={14} className="text-white/40 shrink-0" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/35 text-center py-4">No links shared yet</p>
                      )
                    )}
                  </div>
                </div>

                {/* Group Permissions & Invite Links (Admin / Owner Section) */}
                {isAdminOrOwner && (
                  <div className="px-6 mt-6 space-y-4">
                    {/* Group Permissions Card */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <Lock size={14} className="text-amber-400" /> Group Permissions
                      </h4>

                      {[
                        { key: 'only_admins_can_send' as const, label: 'Only Admins Can Send Messages' },
                        { key: 'only_admins_can_edit_info' as const, label: 'Only Admins Can Edit Group Info' },
                        { key: 'only_admins_can_add_members' as const, label: 'Only Admins Can Add Members' },
                        { key: 'approve_new_members' as const, label: 'Approve New Members' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-1">
                          <span className="text-xs font-medium text-white/85">{item.label}</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(item.key, item.label)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                              permissions[item.key] ? 'bg-fuchsia-600' : 'bg-white/15'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                                permissions[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Invite Link Card */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                          <LinkIcon size={14} className="text-emerald-400" /> Invite via Link
                        </h4>
                        {inviteLink && (
                          <button
                            onClick={() => generateInviteLink(true)}
                            className="text-[11px] text-white/40 hover:text-rose-400 flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw size={11} /> Reset Link
                          </button>
                        )}
                      </div>

                      {!inviteLink ? (
                        <button
                          onClick={() => generateInviteLink(false)}
                          className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          <LinkIcon size={15} /> Generate Group Invite Link
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-black/50 border border-white/10 rounded-xl p-2.5">
                          <span className="text-white/75 text-xs truncate mr-3">{inviteLink}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink);
                              toast.success('Invite link copied!');
                            }}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1 shrink-0"
                          >
                            <Copy size={13} /> Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pending Join Requests */}
                    {joinRequests.length > 0 && (
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center justify-between">
                          <span>Pending Join Requests</span>
                          <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {joinRequests.length}
                          </span>
                        </h4>
                        <div className="space-y-2.5">
                          {joinRequests.map((req) => {
                            const reqName = req.profiles?.full_name || req.profiles?.name || req.profiles?.username || 'User';
                            return (
                              <div
                                key={req.id}
                                className="flex items-center justify-between bg-black/40 border border-white/5 p-2.5 rounded-xl"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                                    {req.profiles?.avatar_url ? (
                                      <img src={req.profiles.avatar_url} alt={reqName} className="w-full h-full object-cover" />
                                    ) : (
                                      reqName.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white text-xs font-bold">{reqName}</p>
                                    <p className="text-white/40 text-[10px] flex items-center gap-1">
                                      <Clock size={10} /> {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleRequestAction(req.id, req.user_id, reqName, 'approved')}
                                    className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRequestAction(req.id, req.user_id, reqName, 'rejected')}
                                    className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Block 3: Searchable Member List & RBAC */}
                <div className="px-6 mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-white/50 uppercase tracking-widest">
                      {participants.length} {participants.length === 1 ? 'Member' : 'Members'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsMemberSearchOpen((prev) => !prev)}
                        className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors"
                        title="Search Members"
                      >
                        <Search size={15} />
                      </button>
                      {canAddMembers && (
                        <button
                          onClick={() => setIsAddMemberOpen(true)}
                          className="flex items-center gap-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        >
                          <UserPlus size={14} /> Add Members
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search Input */}
                  {(isMemberSearchOpen || participants.length > 5) && (
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Search members by name or @username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500/60"
                      />
                    </div>
                  )}

                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-fuchsia-500" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredParticipants.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                          className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.05] transition-all relative cursor-pointer border border-transparent hover:border-white/5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar + Real-Time Online Green Dot */}
                            <div className="relative w-11 h-11 shrink-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center">
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white/70 font-bold text-sm">{p.avatarInitials}</span>
                                )}
                              </div>
                              <span
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#070709] ${
                                  p.isOnline ? 'bg-emerald-500' : 'bg-neutral-600'
                                }`}
                              />
                            </div>

                            {/* Name, You Tag & @username */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-white truncate">{p.name}</span>
                                {p.isSelf && (
                                  <span className="text-[10px] font-bold text-white/45 bg-white/10 px-1.5 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-white/40 block truncate">@{p.username}</span>
                            </div>
                          </div>

                          {/* Role Badges + Action Menu Trigger */}
                          <div className="flex items-center gap-2 shrink-0">
                            {p.role === 'owner' && (
                              <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                <Crown size={11} className="text-amber-400" /> Owner
                              </span>
                            )}
                            {p.role === 'admin' && (
                              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                <ShieldCheck size={11} className="text-emerald-400" /> Group Admin
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === p.id ? null : p.id);
                              }}
                              className="p-1.5 text-white/40 hover:text-white rounded-lg"
                            >
                              <MoreVertical size={17} />
                            </button>
                          </div>

                          {/* Member Action Sheet Dropdown */}
                          <AnimatePresence>
                            {activeMenuId === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-2 top-12 w-56 bg-[#121216] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedProfile(p);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs text-white font-semibold flex items-center gap-2.5"
                                  >
                                    <User size={15} className="text-fuchsia-400" />
                                    View Profile
                                  </button>

                                  {!p.isSelf && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        if (onSelectUserDM) {
                                          onClose();
                                          onSelectUserDM(p.id);
                                        } else {
                                          window.dispatchEvent(new CustomEvent('open_dm_chat', { detail: { userId: p.id, profile: p } }));
                                          toast.success(`Opening chat with ${p.name}`);
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs text-white font-semibold flex items-center gap-2.5"
                                    >
                                      <MessageCircle size={15} className="text-sky-400" />
                                      Message {p.name}
                                    </button>
                                  )}

                                  {/* Admin & Owner Controls */}
                                  {!p.isSelf && isAdminOrOwner && (
                                    <>
                                      {p.role === 'member' && (
                                        <button
                                          onClick={() => handleMakeAdmin(p.id, p.name)}
                                          className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs text-emerald-400 font-semibold flex items-center gap-2.5"
                                        >
                                          <ShieldCheck size={15} />
                                          Make Group Admin
                                        </button>
                                      )}

                                      {p.role === 'admin' && (
                                        <button
                                          onClick={() => handleDismissAdmin(p.id, p.name)}
                                          className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs text-amber-400 font-semibold flex items-center gap-2.5"
                                        >
                                          <ShieldAlert size={15} />
                                          Dismiss as Admin
                                        </button>
                                      )}

                                      {currentUserRole === 'owner' && (
                                        <button
                                          onClick={() => handleTransferOwnership(p.id, p.name)}
                                          className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-xs text-amber-300 font-semibold flex items-center gap-2.5"
                                        >
                                          <Crown size={15} />
                                          Transfer Group Ownership
                                        </button>
                                      )}

                                      {p.role !== 'owner' && (
                                        <button
                                          onClick={() => handleRemoveUser(p.id, p.name)}
                                          className="w-full text-left px-4 py-2.5 hover:bg-rose-500/15 text-xs text-rose-400 font-semibold flex items-center gap-2.5 border-t border-white/5"
                                        >
                                          <UserMinus size={15} />
                                          Remove from Group
                                        </button>
                                      )}
                                    </>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Danger Zone: Leave & Delete Group */}
                  <div className="mt-8 space-y-3 pt-4 border-t border-white/10">
                    <button
                      onClick={handleLeaveGroup}
                      className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-2xl text-rose-400 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <LogOut size={17} />
                      Leave Group
                    </button>

                    {isAdminOrOwner && (
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full py-3.5 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Trash2 size={17} />
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Built-in Searchable Multi-Select Add Members Modal */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0b0b0f] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[82vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-fuchsia-400" /> Add Members
                </h3>
                <button
                  onClick={() => setIsAddMemberOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Search EarnMega users by name or @username..."
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-500"
                />

                {/* Selected User Chips */}
                {selectedCandidates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedCandidates.map((sel) => (
                      <span
                        key={sel.id}
                        className="inline-flex items-center gap-1.5 bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-bold px-2.5 py-1 rounded-full"
                      >
                        {sel.full_name || sel.name || sel.username}
                        <button
                          onClick={() =>
                            setSelectedCandidates((prev) => prev.filter((item) => item.id !== sel.id))
                          }
                          className="hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* User Results List */}
                <div className="space-y-1.5 pt-2">
                  {candidateUsers.length === 0 ? (
                    <p className="text-center text-xs text-white/40 py-8">No matching users found</p>
                  ) : (
                    candidateUsers.map((u) => {
                      const isSelected = selectedCandidates.some((s) => s.id === u.id);
                      const uName = u.full_name || u.name || u.username || 'User';
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCandidates((prev) => prev.filter((item) => item.id !== u.id));
                            } else {
                              setSelectedCandidates((prev) => [...prev, u]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-fuchsia-600/15 border-fuchsia-500/40'
                              : 'hover:bg-white/5 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt={uName} className="w-full h-full object-cover" />
                              ) : (
                                uName.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{uName}</p>
                              <p className="text-[11px] text-white/40">@{u.username || 'user'}</p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-fuchsia-500 border-fuchsia-400 text-white'
                                : 'border-white/25'
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                <button
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-white/70 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedCandidates.length === 0 || isAddingMembers}
                  onClick={handleConfirmAddMembers}
                  className="px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-bold"
                >
                  {isAddingMembers ? 'Adding...' : `Add (${selectedCandidates.length})`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member Profile Quick View Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div
            onClick={() => setSelectedProfile(null)}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0d0d12] border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="relative h-56 bg-neutral-900">
                {selectedProfile.avatarUrl ? (
                  <img
                    src={selectedProfile.avatarUrl}
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/30">
                    {selectedProfile.avatarInitials}
                  </div>
                )}
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black text-white">{selectedProfile.name}</h4>
                    <p className="text-xs text-fuchsia-400">@{selectedProfile.username}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/80">
                    {selectedProfile.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-3">{selectedProfile.bio}</p>

                {selectedProfile.images && selectedProfile.images.length > 1 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-4">
                    {selectedProfile.images.slice(0, 6).map((imgUrl, idx) => (
                      <img
                        key={idx}
                        src={imgUrl}
                        alt="Gallery"
                        className="aspect-square rounded-lg object-cover border border-white/10"
                      />
                    ))}
                  </div>
                )}

                {!selectedProfile.isSelf && (
                  <button
                    onClick={() => {
                      const uid = selectedProfile.id;
                      setSelectedProfile(null);
                      onClose();
                      if (onSelectUserDM) onSelectUserDM(uid);
                    }}
                    className="w-full mt-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={15} /> Send Direct Message
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog Modal (Remove, Leave, Delete, Transfer) */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#101015] border border-white/15 rounded-3xl p-6 shadow-2xl"
            >
              <h4 className="text-base font-black text-white">{confirmDialog.title}</h4>
              <p className="text-xs text-white/65 mt-2 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex justify-end gap-2.5 mt-6">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await fn();
                  }}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold ${
                    confirmDialog.isDanger
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-fuchsia-600 hover:bg-fuchsia-500'
                  }`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Media Lightbox */}
      <AnimatePresence>
        {previewMediaUrl && (
          <div
            onClick={() => setPreviewMediaUrl(null)}
            className="fixed inset-0 z-[10003] bg-black/95 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 text-white"
            >
              <X size={22} />
            </button>
            <img src={previewMediaUrl} alt="Preview" className="max-w-full max-h-[88vh] rounded-2xl object-contain" />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
