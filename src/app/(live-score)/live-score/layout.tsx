import { leagueFonts } from '@/lib/league-fonts';
import '@/components/operations/operations.css';
export default function LiveScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`operations op-console op-legacy ${leagueFonts}`}>
      {children}
    </div>
  );
}
