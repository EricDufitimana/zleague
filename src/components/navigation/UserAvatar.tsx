"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconLogout, IconSettings, IconUser, IconShield } from "@tabler/icons-react";
import Link from "next/link";
import { AuthDialog } from "@/components/auth/AuthDialog";

export function UserAvatar() {
  const { user, isAdmin, isLoading, signOut } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => {
              setAuthMode("login");
              setAuthDialogOpen(true);
            }}
            className="text-sm font-medium"
          >
            Sign In
          </Button>
          <Button
            onClick={() => {
              setAuthMode("register");
              setAuthDialogOpen(true);
            }}
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700"
          >
            Register
          </Button>
        </div>
        <AuthDialog 
          open={authDialogOpen} 
          onOpenChange={setAuthDialogOpen} 
          defaultMode={authMode}
        />
      </>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     'User';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
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
              <IconShield className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <IconLogout className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
