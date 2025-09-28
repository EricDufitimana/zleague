'use client';

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function NewSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const router = useRouter();

  const [userData, setUserData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    full_name: string;
  } | null>(null);

  useEffect(() => {
    // Mock user data for now
    setUserData({
      first_name: 'Eric',
      last_name: 'Dufitimana',
      email: 'eric@example.com',
      full_name: 'Eric Dufitimana'
    });
  }, []);

  const handleLogout = async () => {
    try {
      // Mock logout for now
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'grid', active: isActive('/dashboard') },
    { name: 'Tasks', href: '/dashboard/tasks', icon: 'check-square', active: isActive('/dashboard/tasks') },
    { name: 'Calendar', href: '/dashboard/calendar', icon: 'calendar', active: isActive('/dashboard/calendar') },
    { name: 'Analytics', href: '/dashboard/analytics', icon: 'bar-chart-3', active: isActive('/dashboard/analytics') },
    { name: 'Team', href: '/dashboard/team', icon: 'users', active: isActive('/dashboard/team') },
  ];

  const generalItems = [
    { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
    { name: 'Help', href: '/dashboard/help', icon: 'help-circle' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-2 py-0 md:py-0 bg-slate-50">
        <div className="flex gap-6 min-h-screen bg-slate-50">
          {/* Sidebar */}
          <aside className="hidden shrink-0 md:block w-72">
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 sticky top-6 h-[95vh] overflow-auto flex flex-col justify-center items-center">
              <div className="p-6">
                {/* Logo Section */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-slate-800">Donezo</span>
                </div>

                {/* User Profile */}
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="w-40 h-40 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                    {userData ? `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}` : 'U'}
                  </div>
                  <div className="text-center">
                    {userData ? (
                      <>
                        <p className="text-lg font-medium">{userData.full_name}</p>
                        <p className="text-sm text-slate-500">{userData.email}</p>
                      </>
                    ) : (
                      <>
                        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="p-3 pt-8 w-full">
                {/* Main Menu */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                    Menu
                  </h3>
                  <ul className="flex flex-col space-y-2">
                    {menuItems.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-start text-left gap-3 rounded-xl px-3 py-2 text-base transition-all duration-200 ${
                            item.active
                              ? 'bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-5 h-5 ${item.active ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {item.icon === 'grid' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                              </svg>
                            )}
                            {item.icon === 'check-square' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            )}
                            {item.icon === 'calendar' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                            {item.icon === 'bar-chart-3' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            )}
                            {item.icon === 'users' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            )}
                          </div>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* General Section */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                    General
                  </h3>
                  <ul className="flex flex-col space-y-2">
                    {generalItems.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="flex items-center justify-start text-left gap-3 rounded-xl px-3 py-2 text-base text-slate-600 hover:bg-slate-50 transition-all duration-200"
                        >
                          <div className="w-5 h-5 text-slate-500">
                            {item.icon === 'settings' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                            {item.icon === 'help-circle' && (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              {/* Mobile App Download Card */}
              <div className="p-6 mt-auto">
                <div className="bg-emerald-600 rounded-2xl p-4 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent"></div>
                  <div className="relative z-10">
                    <h4 className="font-semibold mb-1">Download our Mobile App</h4>
                    <p className="text-emerald-100 text-sm mb-4">Get easy in another way</p>
                    <button className="w-full bg-emerald-800/50 hover:bg-emerald-800/70 backdrop-blur-sm border border-emerald-400/30 rounded-xl py-2 px-4 text-sm font-medium transition-all duration-200">
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 w-full">
                <div className="flex items-center justify-center gap-2">
                  <button
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                    onClick={() => window.location.href = '/'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </button>
                  <span className="text-slate-400">|</span>
                  <button
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                    onClick={handleLogout}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-h-[95vh] md:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
