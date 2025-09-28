"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUserData } from "@/hooks/useUserData"

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { userId, isLoading: userLoading, error: userError } = useUserData();

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

        // Wait for user data to be loaded
        if (userLoading) {
          console.log('Still loading user data...');
          return;
        }

        if (userError) {
          console.error('User data error:', userError);
          setError(userError);
          return;
        }

        if (!userId) {
          console.error('No user ID found after authentication');
          setError('Authentication failed. Please try logging in again.');
          return;
        }

        console.log('User authenticated with ID:', userId);

        console.log('Making API call to create admin account...');
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        })

        console.log('API response status:', response.status);
        const responseData = await response.json();
        console.log('API response data:', responseData);

        if (response.ok) {
          console.log('Account created successfully, redirecting to dashboard...');
          // Redirect to dashboard after successful account creation
          router.push('/dashboard')
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
  }, [userId, userLoading, userError, router])

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
