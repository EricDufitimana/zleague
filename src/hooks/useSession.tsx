"use client"

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface SessionData {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
}

export function useSession() {
  const [sessionData, setSessionData] = useState<SessionData>({
    user: null,
    isLoading: true,
    isAdmin: false,
    error: null,
  });

  const mountedRef = useRef(true);
  const supabaseRef = useRef(createClient());

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log('🔐 Checking admin status for user:', userId);
      
      const { data, error } = await supabaseRef.current
        .from('users')
        .select('role')
        .eq('user_id', userId)
        .single();

      // User not found in users table (PGRST116) or any other error = not admin
      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('⚠️ Admin check error:', error.message);
        }
        console.log('👤 User role: regular user');
        return false;
      }

      const isAdmin = data?.role === 'admin';
      console.log('👑 User role:', isAdmin ? 'admin' : 'regular user');
      return isAdmin;
    } catch (error) {
      console.error('❌ Admin check failed:', error);
      return false;
    }
  }, []);

  const updateSessionData = useCallback((updates: Partial<SessionData>) => {
    if (!mountedRef.current) return;
    setSessionData(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      console.log('🔄 Initializing session...');
      
      const { data: { user }, error } = await supabaseRef.current.auth.getUser();

      if (!mountedRef.current) return;

      if (error || !user) {
        console.log('👤 No authenticated user found');
        updateSessionData({
          isLoading: false,
          user: null,
          isAdmin: false,
          error: error?.message || null
        });
        return;
      }

      console.log('✅ User authenticated:', {
        id: user.id,
        email: user.email
      });

      // Check admin status
      const isAdmin = await checkAdminStatus(user.id);

      if (!mountedRef.current) return;

      console.log('🎉 Session initialized successfully');
      updateSessionData({
        isLoading: false,
        user,
        isAdmin,
        error: null
      });
    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('❌ Session initialization failed:', error);
      updateSessionData({
        isLoading: false,
        user: null,
        isAdmin: false,
        error: error instanceof Error ? error.message : 'Session initialization failed'
      });
    }
  }, [checkAdminStatus, updateSessionData]);

  const signOut = useCallback(async () => {
    try {
      console.log('👋 Signing out...');
      await supabaseRef.current.auth.signOut();
      console.log('✅ Sign out successful');
      updateSessionData({ 
        user: null,
        isAdmin: false,
        error: null,
        isLoading: false
      });
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  }, [updateSessionData]);

  useEffect(() => {
    mountedRef.current = true;

    // Initialize session
    initializeSession();

    // Set up auth state listener
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('🔔 Auth state changed:', event);

        switch (event) {
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            updateSessionData({ 
              user: null,
              isAdmin: false,
              error: null,
              isLoading: false
            });
            break;

          case 'SIGNED_IN':
            if (session?.user) {
              console.log('✅ User signed in:', session.user.email);
              const isAdmin = await checkAdminStatus(session.user.id);
              if (mountedRef.current) {
                updateSessionData({ 
                  user: session.user,
                  isAdmin,
                  error: null,
                  isLoading: false
                });
              }
            }
            break;

          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            if (session?.user && mountedRef.current) {
              updateSessionData({ user: session.user });
            }
            break;

          case 'USER_UPDATED':
            console.log('📝 User data updated');
            if (session?.user && mountedRef.current) {
              updateSessionData({ user: session.user });
            }
            break;
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [initializeSession, checkAdminStatus, updateSessionData]);

  return {
    ...sessionData,
    signOut,
    refetch: initializeSession, // Expose refetch in case needed
  };
}