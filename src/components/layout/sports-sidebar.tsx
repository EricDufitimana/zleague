"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconTrophy,
  IconCalendar,
  IconChartBar,
  IconSettings,
  IconHome,
  IconTarget,
  IconAward
} from "@tabler/icons-react"

import { NavMain } from "@/components/navigation/nav-main"
import { NavSecondary } from "@/components/navigation/nav-secondary"
import { NavUser } from "@/components/navigation/nav-user"
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
      icon: IconHome,
    },
    {
      title: "Championships",
      url: "/dashboard/create-championship", 
      icon: IconTrophy,
    },
    {
      title: "Matches",
      url: "/dashboard/match",
      icon: IconTarget,
    },
    {
      title: "Schedule",
      url: "/dashboard/schedule",
      icon: IconCalendar,
    },
    {
      title: "Record Results",
      url: "/dashboard/record",
      icon: IconAward,
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
              <Link href="/dashboard">
                <IconTrophy className="!size-5" />
                <span className="text-base font-semibold">ZLeague</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

