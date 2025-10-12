"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

export default function LoginCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLoginCallback = async () => {
      try {
        console.log('Login callback page loaded');
        
        const supabase = createClient();
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication failed. Please try again.');
          return;
        }

        if (!user) {
          console.error('No user found after authentication');
          setError('Authentication failed. Please try again.');
          return;
        }

        console.log('User authenticated with ID:', user.id);

        // Check if user exists in users table
        const userCheckResponse = await fetch(`/api/user-profile?userId=${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (userCheckResponse.ok) {
          const userData = await userCheckResponse.json();
          if (userData.user) {
            // User exists, redirect to home
            console.log('User exists, redirecting to home');
            toast.success('Welcome back!');
            router.push('/');
            return;
          }
        }

        // User doesn't exist in users table
        console.log('User does not exist in users table');
        toast.error("You must first create an account before signing in. Please register first.");
        
        // Sign out the user
        await supabase.auth.signOut();
        
        router.push('/');
        
      } catch (error) {
        console.error('Error in login callback:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    handleLoginCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing you in...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please wait while we verify your account.</p>
        </CardContent>
      </Card>
    </div>
  );
}
