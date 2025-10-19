"use client"

import { usePathname } from "next/navigation"
import Head from "../head"
import { Navbar } from "@/components/navigation/Navbar"

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname()
  
  const getTitle = () => {
    if (pathname === "/") return "Champions League"
    else if (pathname?.includes("/predictors")) return "Predict Winners | Champions League"
    else if (pathname?.includes("/bracket")) return "Tournament Bracket | Champions League"
    else if (pathname?.includes("/dashboard")) return "Dashboard | Champions League"
    else if (pathname?.includes("/leaders")) return "Leaders | Champions League"
    else return "Champions League"
  }

  return <>
    {Head(getTitle())}
    <Navbar />
    {children}
  </>
}

