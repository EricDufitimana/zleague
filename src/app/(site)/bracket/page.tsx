import type { Metadata } from 'next';
import { BracketLab } from '@/components/design-tests/BracketLab';
export const metadata: Metadata = { title: 'Groups & Bracket' };
export default function Page() { return <BracketLab />; }
