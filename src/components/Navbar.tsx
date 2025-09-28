"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

const navigationItems = [
  { href: "/", label: "Scores" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bracket", label: "Bracket" },
  { href: "/leaders", label: "Leaders" },
  { href: "/predictors", label: "Predict & Winners" },
  { href: "/register", label: "Register" },
  { href: "/login", label: "Sign In" },
]

export function Navbar() {
  const pathname = usePathname()

  const navbarStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 20px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
  }

  return (
    <nav className="sticky top-0 z-50" style={navbarStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <span className="font-semibold text-lg text-gray-900">Champions League</span>
            </Link>
          </div>

          {/* Navigation */}
          <NavigationMenu>
            <NavigationMenuList className="space-x-1">
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.href}>
                  <Link 
                    href={item.href} 
                    className={cn(
                      "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                      pathname === item.href
                        ? "bg-accent/50 text-accent-foreground"
                        : "text-gray-700 hover:text-gray-900"
                    )}
                  >
                    {item.label}
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
    </nav>
  )
} 