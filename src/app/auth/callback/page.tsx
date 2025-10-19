"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle callback after OAuth authentication
    const handleCallback = async () => {
      try {
        console.log('Auth callback page loaded');
        
        // Check for error in URL params
        const urlParams = new URLSearchParams(window.location.search)
        const error_param = urlParams.get('error')
        
        if (error_param) {
          console.error('Auth error from URL:', error_param);
          setError(`Authentication error: ${error_param}`);
          return;
        }

        const supabase = createClient();
        
        // Handle OAuth callback and exchange code for session
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth error:', authError);
          setError('Authentication failed. Please try again.');
          return;
        }

        if (!data.session) {
          console.error('No session found after authentication');
          setError('Authentication failed. Please try again.');
          return;
        }

        const userId = data.session.user.id;
        console.log('User authenticated with ID:', userId);

        // First check if user already exists in users table
        const userCheckResponse = await fetch(`/api/user-profile?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (userCheckResponse.ok) {
          const userData = await userCheckResponse.json();
          if (userData.user) {
            // User already exists, redirect to home
            console.log('User already exists, redirecting to home');
            router.push('/');
            return;
          }
        }

        // Check for pending user metadata from registration
        const pendingMetadataStr = localStorage.getItem('pending_user_metadata');
        let pendingMetadata = null;
        if (pendingMetadataStr) {
          try {
            pendingMetadata = JSON.parse(pendingMetadataStr);
            console.log('Found pending user metadata:', pendingMetadata);
            localStorage.removeItem('pending_user_metadata'); // Clean up
          } catch (e) {
            console.error('Failed to parse pending metadata:', e);
          }
        }

        // If no pending metadata, user tried to sign in directly
        if (!pendingMetadata) {
          console.log('No pending metadata found - user tried to sign in directly');
          toast.error("You must first create an account before signing in. Please register first.");
          
          // Sign out the user
          const supabase = createClient();
          await supabase.auth.signOut();
          
          router.push('/');
          return;
        }

        console.log('Making API call to create account...');
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            user_id: userId,
            metadata: pendingMetadata
          }),
        })

        console.log('API response status:', response.status);
        const responseData = await response.json();
        console.log('API response data:', responseData);

        if (response.ok) {
          console.log('Account created successfully, redirecting to dashboard...');
          // Redirect to dashboard after successful account creation
          router.push('/')
        } else {
          console.error('Failed to create account:', responseData);
          setError(responseData.error || 'Failed to create account');
        }
      } catch (error) {
        console.error('Error in callback:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Account Creation Failed</CardTitle>
            <p className="text-gray-600">{error}</p>
          </CardHeader>
          <CardContent className="text-center">
            <button 
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-xl">Creating Account</CardTitle>
          <p className="text-gray-600">Please wait while we set up your account...</p>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce mx-1" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-sm text-gray-500">
              This may take a few moments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
