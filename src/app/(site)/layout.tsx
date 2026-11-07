import type { Metadata } from 'next';
import { DesignLabShell } from '@/components/design-tests/DesignLabShell';
import { leagueFonts } from '@/lib/league-fonts';
export const metadata: Metadata = { title: { default: 'ZLeague — ASYV Champions League', template: '%s — ZLeague' }, description: 'Follow your family’s matches, results and road to the championship.' };
export default function SiteLayout({ children }: { children: React.ReactNode }) { return <DesignLabShell mode="public" fontClassName={leagueFonts}>{children}</DesignLabShell>; }
