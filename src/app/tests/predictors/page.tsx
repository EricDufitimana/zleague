import type { Metadata } from 'next';
import { PredictionsLab } from '@/components/design-tests/PredictionsLab';
export const metadata: Metadata = { title: 'Predictions' };
export default function PredictionsTestPage() { return <PredictionsLab />; }
