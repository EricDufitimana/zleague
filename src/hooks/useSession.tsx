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

// Longer timeouts for development/localhost environments
const ADMIN_CHECK_TIMEOUT = process.env.NODE_ENV === 'development' ? 15000 : 5000;
const SESSION_INIT_TIMEOUT = process.env.NODE_ENV === 'development' ? 30000 : 10000;

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
      const startTime = Date.now();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Admin check timeout')), ADMIN_CHECK_TIMEOUT)
      );
      
      const queryPromise = supabaseRef.current
        .from('users')
        .select('role')
        .eq('user_id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[useSession] Admin check took ${duration}ms (slow connection)`);
      }

      // User not found in users table (PGRST116) or any other error = not admin
      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('[useSession] Admin check error:', error.message);
        }
        return false;
      }

      return data?.role === 'admin';
    } catch (error) {
      console.error('[useSession] Admin check failed:', error);
      return false;
    }
  }, []);

  const updateSessionData = useCallback((updates: Partial<SessionData>) => {
    if (!mountedRef.current) return;
    setSessionData(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session initialization timeout')), SESSION_INIT_TIMEOUT)
      );

      const userPromise = supabaseRef.current.auth.getUser();
      const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);

      if (!mountedRef.current) return;

      if (error || !user) {
        updateSessionData({
          isLoading: false,
          user: null,
          isAdmin: false,
          error: error?.message || null
        });
        return;
      }

      // Check admin status in parallel with setting user
      const isAdmin = await checkAdminStatus(user.id);

      if (!mountedRef.current) return;

      updateSessionData({
        isLoading: false,
        user,
        isAdmin,
        error: null
      });
    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('[useSession] Initialization failed:', error);
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
      await supabaseRef.current.auth.signOut();
      updateSessionData({ 
        user: null,
        isAdmin: false,
        error: null,
        isLoading: false
      });
    } catch (error) {
      console.error('[useSession] Sign out failed:', error);
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

        switch (event) {
          case 'SIGNED_OUT':
            updateSessionData({ 
              user: null,
              isAdmin: false,
              error: null,
              isLoading: false
            });
            break;

          case 'SIGNED_IN':
            if (session?.user) {
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
            if (session?.user && mountedRef.current) {
              updateSessionData({ user: session.user });
            }
            break;

          case 'USER_UPDATED':
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