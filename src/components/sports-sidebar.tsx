"use client"

import * as React from "react"
import {
  Trophy,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Home,
  FileText,
  Target,
  Award,
  Clock
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Sports Admin",
    email: "admin@zleague.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Championships",
      url: "/dashboard/create-championship", 
      icon: Trophy,
    },
    {
      title: "Matches",
      url: "/dashboard/match",
      icon: Target,
    },
    {
      title: "Schedule",
      url: "/dashboard/schedule",
      icon: Calendar,
    },
    {
      title: "Record Results",
      url: "/dashboard/record",
      icon: Award,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics", 
      icon: BarChart3,
    },
  ],
}

export function SportsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <Trophy className="!size-5" />
                <span className="text-base font-semibold">ZLeague</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

