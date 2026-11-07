import { initials, type Sport, type Team } from './lab-data';
import { Volleyball } from 'lucide-react';

export function SportMark({ sport, size = 22 }: { sport: Sport; size?: number }) {
  if (sport === 'volleyball') return <Volleyball width={size} height={size} strokeWidth={1.6} aria-hidden="true" />;
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="16" cy="16" r="12.5" />
    {sport === 'football' ? <><path d="m16 10 5.7 4.1-2.2 6.7h-7l-2.2-6.7L16 10Z" /><path d="m16 10 0-6m5.7 10.1 5.8-1.9m-8 8.6 3.6 4.9m-10.6-4.9-3.6 4.9m1.4-11.6-5.8-1.9" /></> : sport === 'basketball'
      ? <><path d="M3.5 16h25M16 3.5v25M7 7c9 5 9 13 0 18M25 7c-9 5-9 13 0 18" /></>
      : <><path d="M16 16 6 8m10 8 12 3M16 16l-3 12M7 6c7 0 13 4 15 12M27 22c-4-6-10-8-18-5M9 27c5-5 6-11 2-20" /></>}
  </svg>;
}

export function Asterisk({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">{Array.from({ length: 8 }, (_, i) =>
    <path key={i} d="M40 6v68" stroke="currentColor" strokeWidth="4" transform={`rotate(${i * 22.5} 40 40)`} />)}</svg>;
}

export function Crest({ team, large = false }: { team: Team; large?: boolean }) {
  return <span className={`ml-crest ${large ? 'ml-crest-large' : ''} ml-crest-${team.id % 4}`} aria-hidden="true"><span>{initials(team.name)}</span></span>;
}
