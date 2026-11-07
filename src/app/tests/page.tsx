import type { Metadata } from 'next';
import { MatchdayLab } from '@/components/design-tests/MatchdayLab';


export const metadata: Metadata = {
  title: 'Matchday',
  description: 'An experimental ZLeague matchday design with live fixtures, results and family match statistics.',
  robots: { index: false, follow: false },
};

export default function TestsPage() {
  return <MatchdayLab />;
}
