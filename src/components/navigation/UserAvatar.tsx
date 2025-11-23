"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Loader2 } from "lucide-react";
  
export function UserAvatar() {
  const { user, userData, isAdmin, isLoading, refreshSession } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const supabase = createClient();
  const [isLoadingLogout, setIsLoadingLogout] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  const handleSignIn = () => {
    setAuthMode("login");
    setAuthDialogOpen(true);
  };

  const handleRegister = () => {
    setAuthMode("register");
    setAuthDialogOpen(true);
  };

  if (!user) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSignIn}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={handleRegister}
            className="px-4 py-2 text-sm font-medium bg-blueish hover:bg-blueish/80 text-white rounded-md transition-colors"
          >
            Create Account
          </button>
        </div>
        <AuthDialog 
          open={authDialogOpen} 
          onOpenChange={setAuthDialogOpen}
          defaultMode={authMode}
        />
      </>
    );
  }
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default menu item behavior
    setIsLoadingLogout(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      // Close dropdown and navigate
      setIsOpen(false);
      // Refresh session first to clear user state
      await refreshSession();
      // Then navigate and force a full page refresh
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoadingLogout(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.user_metadata?.full_name || 
                     user?.user_metadata?.name || 
                     user?.email?.split('@')[0] || 
                     'User';

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => {
      // Prevent closing if logout is in progress
      if (!isLoadingLogout) {
        setIsOpen(open);
      }
    }}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user.user_metadata?.avatar_url} 
              alt={displayName} 
            />
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {userData?.username && (
              <p className="text-xs leading-none text-muted-foreground">
                @{userData.username}
              </p>
            )}
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {isAdmin && (
              <p className="text-xs leading-none text-blue-600 font-medium">
                Administrator
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        
        <DropdownMenuItem 
          onSelect={(e) => e.preventDefault()} // Prevent automatic dropdown close
          onClick={handleLogout}
          disabled={isLoadingLogout}
          className="text-red-600 cursor-pointer"
        >
          {isLoadingLogout ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}