import type { Metadata } from 'next';
import { LeadersLab } from '@/components/design-tests/LeadersLab';
export const metadata: Metadata = { title: 'Leaders' };
export default function Page() { return <LeadersLab />; }
