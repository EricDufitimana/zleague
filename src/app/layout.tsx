"use client"

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";
import Head from "./head";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  const getTitle = () => {
    if (pathname === "/") return "Champions League"
    else if (pathname?.includes("/predictors")) return "Predict Winners | Champions League"
    else if (pathname?.includes("/bracket")) return "Tournament Bracket | Champions League"
    else if (pathname?.includes("/dashboard")) return "Dashboard | Champions League"
    else return "Champions League"
  }

  return (
    <html lang="en">
      {Head(getTitle())}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster 
        
        />
      </body>
    </html>
  );
}
