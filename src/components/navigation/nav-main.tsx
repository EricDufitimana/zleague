"use client"

import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useState } from "react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}) {

  const pathname = usePathname()

  const getIsActive = (itemUrl: string) => {
    // Check if the current pathname matches the item's URL
    if (pathname === itemUrl) {
      return 'bg-gray-100 text-black hover:bg-gray-200 hover:text-black'
    }
    
    // For dynamic routes, check if the pathname starts with the item URL
    if (itemUrl.includes('[') && itemUrl.includes(']')) {
      // Handle dynamic routes like /dashboard/match/[championshipId]
      const basePath = itemUrl.split('[')[0].replace(/\/$/, '') // Remove trailing slash
      if (pathname.startsWith(basePath)) {
        return 'bg-gray-100 text-black hover:bg-gray-200 hover:text-black'
      }
    }
    
    return ''
  }
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
      
        <SidebarMenu>
          {items.map((item) => {

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  className={getIsActive(item.url)}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
