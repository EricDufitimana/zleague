"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconTrophy,
  IconCalendar,
  IconChartBar,
  IconSettings,
  IconHome,
  IconUsers
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
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

const navMainData = [
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
    icon: IconUsers,
  },
  {
    title: "Schedule",
    url: "/dashboard/schedule",
    icon: IconCalendar,
  },
  {
    title: "Record Results",
    url: "/dashboard/record",
    icon: IconChartBar,
  },
]

interface UserData {
  name: string
  email: string
  avatar: string
}

function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="grid flex-1 gap-1.5 text-left text-sm leading-tight">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function SportsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [userData, setUserData] = useState<UserData>({
    name: "Loading...",
    email: "loading@zleague.com",
    avatar: "/avatars/default.jpg",
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user-profile')
        
        if (!response.ok) {
          console.error("Error fetching user profile:", response.statusText)
          setIsLoading(false)
          return
        }

        const data = await response.json()
        setUserData(data)
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

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
        <NavMain items={navMainData} />
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? <NavUserSkeleton /> : <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}

