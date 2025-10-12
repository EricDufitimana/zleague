"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SportsSidebar } from "@/components/layout/sports-sidebar";
import { SportsHeader } from "@/components/sports/sports-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import Head from "@/app/head";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const getTitle = (path: string) => {
    const pathSegments = path.split('/').filter(Boolean);
    
    if (pathSegments.length <= 1) {
      return "Dashboard | Champions League";
    }
    
    const page = pathSegments[1];
    
    switch (page) {
      case 'create-championship':
        return "Create Championship | Champions League";
      case 'match':
        return "Matches | Champions League";
      case 'schedule':
        return "Schedule | Champions League";
      case 'record':
        return "Record Results | Champions League";
      case 'users':
        return "Users | Champions League";
      case 'settings':
        return "Settings | Champions League";
      default:
        return `${page.charAt(0).toUpperCase() + page.slice(1)} | Champions League`;
    }
  };

  useEffect(() => {
    const title = getTitle(pathname);
    document.title = title;
  }, [pathname]);

  return (
    <>
      {Head(getTitle(pathname))}
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <SportsSidebar variant="inset" />
        <SidebarInset>
          <SportsHeader title="Sports Management" />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}