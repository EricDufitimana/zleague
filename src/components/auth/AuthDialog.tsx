"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, Chrome, User, AtSign, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: "login" | "register"
}

export function AuthDialog({ open, onOpenChange, defaultMode = "login" }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
  })
  const supabase = createClient()

  // Update mode when defaultMode prop changes
  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode])

  const handleGoogleAuth = async () => {
    // For login mode, we'll allow it but check if user exists after OAuth
    if (mode === "login") {
      // Allow sign-in but we'll validate in the callback
      console.log("Sign-in mode - will validate user existence after OAuth");
    }
   
    // Validate fields for register mode
    if (mode === "register") {
      if (!formData.firstName.trim()) {
        toast.error("Please enter your first name")
        return
      }
      if (!formData.lastName.trim()) {
        toast.error("Please enter your last name")
        return
      }
      if (!formData.username.trim()) {
        toast.error("Please enter a username")
        return
      }
      if (formData.username.length < 3) {
        toast.error("Username must be at least 3 characters")
        return
      }
    }
  

    try {
      setIsLoading(true)
      
      // Store metadata in localStorage for register mode to use after OAuth callback
      if (mode === "register") {
        localStorage.setItem('pending_user_metadata', JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username,
        }))
      }

      // Use the same pattern as the server-side exchange route
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const origin = isLocalEnv 
        ? window.location.origin  // localhost in development
        : process.env.NEXT_PUBLIC_SITE_URL // your Vercel URL in production

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: mode === "login" 
            ? `${origin}/auth/exchange?type=login` 
            : `${origin}/auth/exchange?type=register`,
          queryParams: mode === "register" ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('Google auth error:', error)
      toast.error((error as Error).message || 'Failed to authenticate with Google')
      localStorage.removeItem('pending_user_metadata')
    } 
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setFormData({ firstName: "", lastName: "", username: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-full flex items-center justify-center mb-2">
            {mode === "login" ? (
              <LogIn className="h-6 w-6 text-indigo-600" />
            ) : (
              <Chrome className="h-6 w-6 text-indigo-600" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "login" 
              ? "Sign in to your Champions League account" 
              : "Join the Champions League community"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "register" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username or Nickname</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Choose a username"
                    className="pl-10"
                    disabled={isLoading}
                    minLength={3}
                  />
                </div>
                <p className="text-xs text-gray-500">This is the name that will show when you predict</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Then continue with</span>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleGoogleAuth}
            disabled={isLoading}
            size="lg"
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          >
            
 
            {isLoading ?
            <>
             <Loader2 className="animate-spin" />
             Connecting...
            </>
              :
            <>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
            
            </>
            }

          </Button>

          <div className="text-center text-sm pt-2">
            <button
              type="button"
              onClick={switchMode}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
              disabled={isLoading}
            >
              {mode === "login" 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

