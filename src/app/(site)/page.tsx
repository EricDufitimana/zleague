import type { Metadata } from 'next';
import { MatchdayLab } from '@/components/design-tests/MatchdayLab';
export const metadata: Metadata = { title: 'Matchday' };
export default function Page() { return <MatchdayLab />; }
