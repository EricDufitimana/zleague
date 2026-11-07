import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DashboardShell } from '@/components/operations/DashboardShell';
export const metadata: Metadata = { title: { default: 'League Operations — ZLeague', template: '%s — ZLeague Operations' }, robots: { index: false, follow: false } };
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<div role="status" style={{ padding: 32 }}>Loading league workspace…</div>}><DashboardShell>{children}</DashboardShell></Suspense>; }
