"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Users, AlertCircle, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InvitePage() {
    const { code } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [inviteData, setInviteData] = useState<any>(null);
    const [groupData, setGroupData] = useState<any>(null);
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            if (!code || !user) return;
            try {
                // 1. Fetch Invite
                const { data: invite, error: inviteError } = await supabase
                    .from('group_invites')
                    .select('*')
                    .eq('code', code)
                    .single();

                if (inviteError || !invite) {
                    toast.error("Invalid or expired invite link");
                    router.push('/');
                    return;
                }

                // Check expiry
                if (new Date(invite.expires_at) < new Date()) {
                    toast.error("This invite link has expired");
                    router.push('/');
                    return;
                }

                setInviteData(invite);

                // 2. Fetch Group Details
                // Assuming group data is derived from the first message or a dedicated groups table.
                // We'll just fetch a minimal group placeholder since there isn't a strict 'groups' fetch available in all schemas.
                // If it's a room ID, we check room_participants for metadata or profiles.

                // Let's check if the user is already a member
                const { data: participantData } = await supabase
                    .from('room_participants')
                    .select('*')
                    .eq('room_id', invite.group_id)
                    .eq('user_id', user.id)
                    .single();

                if (participantData) {
                    toast.success("You are already a member of this group.");
                    router.push('/');
                    return;
                }

                // Check for existing request
                const { data: requestData } = await supabase
                    .from('group_join_requests')
                    .select('*')
                    .eq('group_id', invite.group_id)
                    .eq('user_id', user.id)
                    .single();

                if (requestData) {
                    setRequestStatus(requestData.status);
                }

                setIsLoading(false);
            } catch (err) {
                console.error("Failed to fetch invite", err);
                setIsLoading(false);
            }
        };
        fetchInvite();
    }, [code, user, router]);

    const handleJoinRequest = async () => {
        if (!user || !inviteData) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('group_join_requests').insert({
                group_id: inviteData.group_id,
                user_id: user.id,
                invite_id: inviteData.id,
                status: 'pending'
            });
            if (error) throw error;

            setRequestStatus('pending');
            toast.success("Join request sent successfully!");
        } catch (err) {
            console.error("Failed to request join", err);
            toast.error("Failed to send request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-t-amber-500 border-white/10 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col p-6">
            <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-8">
                <ArrowLeft size={20} />
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto w-full bg-[#111] border border-white/10 p-8 rounded-3xl text-center shadow-2xl mt-12"
            >
                <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users size={32} className="text-amber-500" />
                </div>

                <h1 className="text-2xl font-bold mb-2">Group Invitation</h1>
                <p className="text-white/50 mb-8 text-sm">You have been invited to join a private group. The admin must approve your request before you can participate.</p>

                {requestStatus === 'none' && (
                    <button
                        onClick={handleJoinRequest}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? "Sending Request..." : "Request to Join"}
                    </button>
                )}

                {requestStatus === 'pending' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-center gap-3">
                        <AlertCircle className="text-amber-500" />
                        <span className="text-amber-500 font-bold">Request Pending Approval</span>
                    </div>
                )}

                {requestStatus === 'approved' && (
                    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-center justify-center gap-3">
                        <CheckCircle className="text-green-500" />
                        <span className="text-green-500 font-bold">Request Approved! Redirecting...</span>
                        {/* Optionally auto-redirect to app root */}
                    </div>
                )}

                {requestStatus === 'rejected' && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center justify-center gap-3">
                        <X className="text-rose-500" />
                        <span className="text-rose-500 font-bold">Request Rejected</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
