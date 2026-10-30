'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

export interface GlobalNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: GlobalNotification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  unreadCount: 0,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Fetch initial unread notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('global_notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching global notifications:', error);
      } else {
        setNotifications(data || []);
      }
    };

    fetchNotifications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('global_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as GlobalNotification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as GlobalNotification;
          if (updatedNotification.is_read) {
             setNotifications((prev) => prev.filter(n => n.id !== updatedNotification.id));
          } else {
             setNotifications((prev) =>
               prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
             );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase
      .from('global_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking notification as read:', error);
      // Optional: Revert optimistic update here if needed
    }
  };

  const markAllAsRead = async () => {
      setNotifications([]);

      if(user) {
          const { error } = await supabase
            .from('global_notifications')
            .update({ is_read: true })
            .eq('recipient_id', user.id)
            .eq('is_read', false);

          if (error) {
            console.error('Error marking all notifications as read:', error);
          }
      }
  };

  const unreadCount = notifications.length;

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotifications() {
  return useContext(NotificationContext);
}
