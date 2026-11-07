import type { Metadata } from 'next';
import { LeaguePredictions } from '@/components/sports/LeaguePredictions';
export const metadata: Metadata = { title: 'Predictions' };
export default function Page() { return <LeaguePredictions />; }
