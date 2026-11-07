'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Check, LogOut, Menu, X } from 'lucide-react';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useLeagueAccount } from '@/hooks/useLeagueAccount';
import { Asterisk } from './LabPrimitives';
import { PALETTES, type Palette, type Sport } from './lab-data';
import './matchday-lab.css';

interface LabContext {
  palette: Palette; preview: boolean; sport: Sport; fontClassName: string; isLab: boolean;
  setPalette: (value: Palette) => void; setPreview: (value: boolean) => void; setSport: (value: Sport) => void;
  route: (path: string) => string; openLogin: () => void;
}
const Context = createContext<LabContext | null>(null);
export function useDesignLab() { const value = useContext(Context); if (!value) throw new Error('League pages need the league layout.'); return value; }
const navigation = [{ href: '', label: 'Matchday' }, { href: '/bracket', label: 'Groups & Bracket' }, { href: '/leaders', label: 'Leaders' }, { href: '/predictors', label: 'Predictions' }];
export function DesignLabShell({ children, fontClassName, mode = 'lab' }: { children: ReactNode; fontClassName: string; mode?: 'lab' | 'public' }) {
  const isLab = mode === 'lab'; const pathname = usePathname();
  const [palette, setPaletteState] = useState<Palette>('orvena');
  const [preview, setPreviewState] = useState(isLab);
  const [sport, setSport] = useState<Sport>('football');
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState(false);
  const [accountError, setAccountError] = useState('');
  const account = useLeagueAccount();
  useEffect(() => { if (isLab) { try { const stored = localStorage.getItem('zleague-design-palette'); if (PALETTES.some(p => p.id === stored)) setPaletteState(stored as Palette); } catch { /* In-memory palette still works. */ } } }, [isLab]);
  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    const closeAccount = (event: Event) => { if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target as Element)?.closest('.ml-account')) document.querySelector<HTMLDetailsElement>('.ml-account')?.removeAttribute('open'); };
    document.addEventListener('pointerdown', closeAccount); document.addEventListener('keydown', closeAccount);
    return () => { document.removeEventListener('pointerdown', closeAccount); document.removeEventListener('keydown', closeAccount); };
  }, []);
  useEffect(() => { document.querySelector<HTMLDetailsElement>('.ml-account')?.removeAttribute('open'); }, [pathname]);
  const setPalette = (value: Palette) => { if (!isLab) return; setPaletteState(value); try { localStorage.setItem('zleague-design-palette', value); } catch { /* In-memory palette still works. */ } };
  const route = (path: string) => `${isLab ? '/tests' : ''}${path}` || '/';
  const openLogin = () => setAuth(true);
  return <Context.Provider value={{ palette, setPalette, preview: isLab && preview, setPreview: value => { if (isLab) setPreviewState(value); }, sport, setSport, fontClassName, isLab, route, openLogin }}>
    <div className={`matchday-lab ml-palette-${isLab ? palette : 'orvena'} ${fontClassName}`}>
      <a className="ml-skip" href="#matchday-content">Skip to content</a>
      {isLab && <div className="ml-lab-bar"><div className="ml-shell ml-lab-inner"><span><i className="ml-lab-dot" />DESIGN LAB <b>STUDY 01 / MATCHDAY</b></span><div className="ml-palette-switch" role="group" aria-label="Color palette">{PALETTES.map(p => <button key={p.id} aria-label={`${p.name} palette`} aria-pressed={palette === p.id} onClick={() => setPalette(p.id)}><i style={{ background: p.color }}>{palette === p.id && <Check size={9} />}</i><span>{p.name}</span></button>)}</div><Link href="/">Current website <ArrowUpRight size={12} /></Link></div></div>}
      <div className="ml-shell"><header className="ml-header"><Link href={route('')} className="ml-wordmark" aria-label="ZLeague home">zleague<span>®</span><Asterisk /></Link>
        <nav id="ml-navigation" aria-label={isLab ? 'Design lab navigation' : 'Main navigation'} className={`ml-nav ${menu ? 'ml-nav-open' : ''}`}>{navigation.map(item => <Link href={route(item.href)} key={item.href} className={pathname === route(item.href) ? 'ml-nav-active' : ''} aria-current={pathname === route(item.href) ? 'page' : undefined}>{item.label}{pathname === route(item.href) && <span />}</Link>)}</nav>
        <div className="ml-header-actions">{account.authId ? <details className="ml-account"><summary className="ml-pill ml-pill-dark">{account.profile?.username || 'Your account'}<Check size={14} /></summary><div>{account.isAdmin && <Link href="/dashboard">Manage league <ArrowUpRight size={15} /></Link>}<Link href={route('/predictors')}>Your predictions <ArrowUpRight size={15} /></Link><button onClick={async () => { try { await account.signOut(); } catch { setAccountError('Couldn’t sign out. Please try again.'); } }}>Sign out <LogOut size={15} /></button>{accountError && <p role="alert">{accountError}</p>}</div></details> : <button className="ml-pill ml-pill-dark" onClick={openLogin}>Sign in <ArrowUpRight size={15} /></button>}<button className="ml-menu-button" aria-controls="ml-navigation" aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>{menu ? <X size={21} /> : <Menu size={21} />}</button></div>
      </header><main>{children}</main><footer className="ml-footer"><Link href={route('')} className="ml-wordmark">zleague<span>®</span><Asterisk /></Link><p>One league. Every family.</p><span><span>ASYV CHAMPIONS LEAGUE</span><span>{isLab ? 'DESIGN PREVIEW · NOT THE LIVE SITE' : 'FOOTBALL · BASKETBALL · VOLLEYBALL'}</span></span></footer></div>
      <AuthDialog open={auth} onOpenChange={setAuth} defaultMode="login" />
    </div>
  </Context.Provider>;
}
