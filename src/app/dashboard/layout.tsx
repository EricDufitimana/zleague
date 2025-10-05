"use client";

import { ReactNode } from "react";
import { SportsSidebar } from "@/components/layout/sports-sidebar";
import { SportsHeader } from "@/components/sports/sports-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
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
  );
}