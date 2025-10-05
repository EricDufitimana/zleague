"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navigation/Navbar"
import Link from "next/link"
import { Chrome } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export default function RegisterPage() {
  const handleGoogleSignUp = async () => {
    console.log("Google sign-up initiated")
 
    const supabase = createClient();

    const {data, error} = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/exchange`,
      }
    })

    if (error) {
      console.error("Error signing in with Google:", error);
    } else {
      console.log("Google sign-in successful:", data);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Chrome className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <p className="text-gray-600">Join the Champions League community</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Button 
                  onClick={handleGoogleSignUp} 
                  size="lg"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 hover:shadow-md transition-all bg-white text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-center w-5 h-5 mr-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  Sign up with Google
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}