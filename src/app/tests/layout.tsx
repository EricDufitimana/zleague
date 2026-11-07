import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { leagueFonts } from '@/lib/league-fonts';
import { DesignLabShell } from '@/components/design-tests/DesignLabShell';

export const metadata: Metadata = { title: { default: 'ZLeague Design Lab', template: '%s — ZLeague Design Lab' }, robots: { index: false, follow: false } };
export default function TestsLayout({ children }: { children: ReactNode }) {
  return <DesignLabShell fontClassName={leagueFonts}>{children}</DesignLabShell>;
}
