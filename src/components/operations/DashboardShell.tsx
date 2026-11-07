'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, Check, ChevronDown, ClipboardCheck, GitBranch, Home, LogOut, Menu, Trophy, UsersRound, X } from 'lucide-react';
import { useLeagueAccount } from '@/hooks/useLeagueAccount';
import { Asterisk } from '@/components/design-tests/LabPrimitives';
import { leagueFonts } from '@/lib/league-fonts';
import type { Sport, Team } from '@/components/design-tests/lab-data';
import './operations.css';

export interface Championship { id: number; name: string; status: string; team_count: number; created_at: string }
export interface AdminMatch { id: number; championship_id: number; sport_type: Sport; status: string; match_time: string | null; created_at: string; gender?: string; team_a_id: number | null; team_b_id: number | null; teamA: Team | null; teamB: Team | null; team_a_score: number | null; team_b_score: number | null; winner_id: number | null; penalty_score?: { team_a: number; team_b: number } | null; group_id?: number | null; boys_stage_groups?: string; girls_stage_groups?: string }
interface DashboardContext { championships: Championship[]; championship?: Championship; loading: boolean; setChampionship: (id: string) => void; href: (path: string, extra?: Record<string, string>) => string }
const Context = createContext<DashboardContext | null>(null);
export function useDashboard() { const value = useContext(Context); if (!value) throw new Error('Dashboard pages need the dashboard layout.'); return value; }
const nav = [
  { group: 'MATCHDAY', items: [{ path: '/dashboard', label: 'Overview', icon: Home }, { path: '/dashboard/schedule', label: 'Match center', icon: CalendarDays }, { path: '/dashboard/record', label: 'Record results', icon: ClipboardCheck }] },
  { group: 'SETUP', items: [{ path: '/dashboard/create-championship', label: 'Championships & teams', icon: Trophy }, { path: '/dashboard/match', label: 'Groups & draws', icon: GitBranch }, { path: '/dashboard/families', label: 'Families', icon: UsersRound }] },
];
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const params = useParams(); const query = useSearchParams();
  const pathId = String(params.championshipId || params.id || '');
  const requested = pathId || query.get('championship_id') || '';
  const [remembered, setRemembered] = useState(''); const [menu, setMenu] = useState(false); const [error, setError] = useState('');
  const sidebar = useRef<HTMLElement>(null);
  const account = useLeagueAccount();
  const championships = useQuery<Championship[]>({ queryKey: ['admin-championships'], queryFn: async () => { const r = await fetch('/api/championships'); if (!r.ok) throw new Error('Championships could not be loaded.'); return r.json(); }, staleTime: 10000, refetchOnMount: 'always', retry: 1 });
  useEffect(() => { try { setRemembered(sessionStorage.getItem('zleague-admin-championship') || ''); } catch { /* URL selection remains available. */ } }, []);
  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') || []);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
      if (event.key !== 'Tab') return;
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [menu]);
  const all = championships.data || [];
  const championship = all.find(c => String(c.id) === (requested || remembered)) || all.find(c => c.status === 'ongoing') || all[0];
  const href = (path: string, extra: Record<string, string> = {}) => { const search = new URLSearchParams(extra); if (championship) search.set('championship_id', String(championship.id)); return `${path}${search.size ? `?${search}` : ''}`; };
  const setChampionship = (id: string) => { setRemembered(id); try { sessionStorage.setItem('zleague-admin-championship', id); } catch { /* URL selection remains available. */ }
    if (pathId) router.push(pathname.replace(`/${pathId}`, `/${id}`));
    else { const search = new URLSearchParams(query.toString()); search.set('championship_id', id); search.delete('match_id'); router.push(`${pathname}?${search}`); }
  };
  const current = nav.flatMap(g => g.items).find(item => pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`)));
  return <Context.Provider value={{ championships: all, championship, setChampionship, loading: championships.isPending, href }}><div className={`operations ${leagueFonts}`}>
    <a className="op-skip" href="#operations-main">Skip to workspace</a>
    {menu && <button className="op-backdrop" onClick={() => setMenu(false)} aria-label="Close navigation" />}
    <aside ref={sidebar} className={`op-sidebar ${menu ? 'op-sidebar-open' : ''}`} aria-label="League operations"><div className="op-sidebar-brand"><Link href={href('/dashboard')} className="op-wordmark">zleague<span>®</span><Asterisk /></Link><button className="op-mobile-close" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button></div><span className="op-workspace-label">THE LEAGUE WORKSPACE</span>
      <nav aria-label="Dashboard navigation">{nav.map(group => <div className="op-nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => <Link href={href(item.path)} key={item.path} aria-current={current?.path === item.path ? 'page' : undefined} onClick={() => setMenu(false)}><item.icon size={18} strokeWidth={1.6} /><span>{item.label}</span>{current?.path === item.path && <i />}</Link>)}</div>)}</nav>
      <div className="op-sidebar-bottom"><Link href="/" className="op-public-link">Open public scoreboard <ArrowUpRight size={16} /></Link><div className="op-admin-account"><span>{(account.profile?.first_name || account.profile?.username || 'A')[0].toUpperCase()}</span><div><strong>{account.profile?.first_name || account.profile?.username || 'League admin'}</strong><small>ADMINISTRATOR</small></div><button aria-label="Sign out" onClick={async () => { try { await account.signOut(); router.push('/'); router.refresh(); } catch { setError('Couldn’t sign out. Please try again.'); } }}><LogOut size={17} /></button></div>{error && <p className="op-error" role="alert">{error}</p>}</div>
    </aside><div className="op-workspace"><header className="op-topbar"><div><button className="op-menu-button" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}><Menu size={21} /></button><span>LEAGUE OPERATIONS <i>/</i> <b>{current?.label || 'Workspace'}</b></span></div><div className="op-championship-picker"><Trophy size={15} /><label className="sr-only" htmlFor="workspace-championship">Workspace championship</label><select id="workspace-championship" value={championship?.id || ''} disabled={championships.isPending || !all.length} onChange={e => setChampionship(e.target.value)}>{!all.length && <option value="">{championships.isPending ? 'Loading championships…' : 'No championships'}</option>}{all.map(c => <option key={c.id} value={c.id}>{c.name}{c.status !== 'ongoing' ? ' · Ended' : ''}</option>)}</select><ChevronDown size={14} /></div></header>
      {championships.isError && <div className="op-global-notice" role="alert">Championships couldn’t load. <button onClick={() => championships.refetch()}>Try again</button></div>}
      {championship?.status === 'ended' && <div className="op-global-notice"><Check size={15} />You’re viewing an ended championship. Switch championships above to return to the current season.</div>}
      <main id="operations-main" className="op-main"><div className="op-legacy">{children}</div></main>
    </div>
  </div></Context.Provider>;
}
export function useAdminMatches(autoRefresh = true) {
  const { championship } = useDashboard();
  return useQuery<AdminMatch[]>({ queryKey: ['admin-matches', championship?.id], enabled: !!championship, queryFn: async () => { const r = await fetch(`/api/matches?championship_id=${championship!.id}`); if (!r.ok) throw new Error('Matches could not be loaded.'); return (await r.json()).matches || []; }, staleTime: 10000, refetchInterval: autoRefresh ? 15000 : false, retry: 1 });
}
export function OperationsHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  const { championship } = useDashboard();
  return <div className="op-page-heading"><div><p className="op-eyebrow">{championship?.name || 'LEAGUE WORKSPACE'}</p><h1>{title}<span>.</span></h1><p>{description}</p></div>{children && <div className="op-heading-actions">{children}</div>}</div>;
}
export const readyMatch = (match: AdminMatch) => !!match.teamA && !!match.teamB && !!match.team_a_id && !!match.team_b_id;
export const matchTitle = (match: AdminMatch) => `${(match.teamA?.name || 'To be announced').replaceAll('_', ' ')} vs ${(match.teamB?.name || 'To be announced').replaceAll('_', ' ')}`;
export const matchWhen = (match: AdminMatch) => match.match_time ? new Date(match.match_time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Needs a date';
