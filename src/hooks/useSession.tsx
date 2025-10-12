import { useState, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface UserData {
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface SessionData {
  user: any | null;
  userData: any | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  userExists: boolean;
}

export function useSession() {
  const [sessionData, setSessionData] = useState<SessionData>({
    user: null,
    userData: null,
    isAdmin: false,
    isLoading: true,
    error: null,
    userExists: false
  });

  const checkUserExists = async (userId: string): Promise<{ userData: any | null; exists: boolean; isAdmin: boolean }> => {
    try {
      const response = await fetch(`/api/user-profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          userData: data.user,
          exists: !!data.user,
          isAdmin: data.user?.role === 'admin'
        };
      }
      return { userData: null, exists: false, isAdmin: false };
    } catch (error) {
      console.error('Error checking user status:', error);
      return { userData: null, exists: false, isAdmin: false };
    }
  };

  const fetchSession = async () => {
    try {
      setSessionData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const supabase = createClient();
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setSessionData(prev => ({ ...prev, isLoading: false, error: sessionError.message }));
        return;
      }
      
      if (!user) {
        setSessionData(prev => ({ 
          ...prev, 
          user: null, 
          userData: null,
          isAdmin: false, 
          userExists: false,
          isLoading: false 
        }));
        return;
      }

      // Check if user exists in users table
      const { userData, exists, isAdmin } = await checkUserExists(user.id);
      
      if (!exists) {
        // User is authenticated but doesn't exist in users table
        toast.error("You must first create an account before signing in. Please register first.");
        
        // Sign out the user since they shouldn't be authenticated
        await supabase.auth.signOut();
        
        setSessionData(prev => ({
          ...prev,
          user: null,
          userData: null,
          isAdmin: false,
          userExists: false,
          isLoading: false
        }));
        return;
      }
      
      setSessionData(prev => ({
        ...prev,
        user,
        userData,
        isAdmin,
        userExists: true,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error fetching session:', error);
      setSessionData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return {
    ...sessionData,
    refreshSession: fetchSession
  };
} 