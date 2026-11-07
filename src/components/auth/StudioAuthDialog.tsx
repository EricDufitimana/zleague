'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, AtSign, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { leagueFonts } from '@/lib/league-fonts';
import './studio-auth.css';

export function StudioAuthDialog({ open, onOpenChange, defaultMode = 'login' }: { open: boolean; onOpenChange: (open: boolean) => void; defaultMode?: 'login' | 'register' }) {
  const [mode, setMode] = useState(defaultMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '' });
  useEffect(() => { if (open) { setMode(defaultMode); setError(''); setBusy(false); } }, [open, defaultMode]);
  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (mode === 'register' && (!form.firstName.trim() || !form.lastName.trim() || form.username.trim().length < 3)) { setError('Enter your name and a username with at least 3 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') localStorage.setItem('pending_user_metadata', JSON.stringify({ first_name: form.firstName.trim(), last_name: form.lastName.trim(), username: form.username.trim() }));
      else localStorage.removeItem('pending_user_metadata');
      const { error: authError } = await createClient().auth.signInWithOAuth({ provider: 'google', options: {
        redirectTo: `${window.location.origin}/auth/${mode === 'login' ? 'login-callback' : 'callback'}`,
        ...(mode === 'register' ? { queryParams: { access_type: 'offline', prompt: 'consent' } } : {}),
      } });
      if (authError) throw authError;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Couldn’t connect to Google. Please try again.'); try { localStorage.removeItem('pending_user_metadata'); } catch { /* The error remains visible. */ } setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className={`studio-auth ${leagueFonts}`}>
    <div className="sa-story" aria-hidden="true"><span className="sa-wordmark">zleague<span>®</span></span><div className="sa-ball"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="50" cy="50" r="46" /><path d="M4 50h92M50 4v92M18 17c34 19 34 47 0 66m64-66c-34 19-34 47 0 66" /></svg></div><div><span className="sa-kicker">ONE LEAGUE. EVERY FAMILY.</span><p>Your side.<br />Your people.<br /><em>Your league.</em></p></div><span className="sa-story-foot">ASYV CHAMPIONS LEAGUE <ArrowUpRight size={18} /></span></div>
    <div className="sa-main"><div className="sa-modes" role="group" aria-label="Account access">{(['login', 'register'] as const).map(value => <button key={value} aria-pressed={mode === value} disabled={busy} onClick={() => { setMode(value); setError(''); }}>{value === 'login' ? 'Sign in' : 'Join the league'}</button>)}</div>
      <DialogHeader><p className="sa-kicker">{mode === 'login' ? 'GOOD TO HAVE YOU HERE' : 'MAKE YOURSELF AT HOME'}</p><DialogTitle>{mode === 'login' ? 'Back in the game.' : 'A place in the league.'}</DialogTitle><DialogDescription>{mode === 'login' ? 'Sign in to make your picks and follow your league.' : 'Choose your name, then connect your Google account.'}</DialogDescription></DialogHeader>
      <form onSubmit={authenticate} className="sa-form">{mode === 'register' && <><div className="sa-name-fields"><label>First name<input autoComplete="given-name" required maxLength={80} value={form.firstName} disabled={busy} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" /></label><label>Last name<input autoComplete="family-name" required maxLength={80} value={form.lastName} disabled={busy} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" /></label></div><label>Your league name<div className="sa-username"><AtSign size={16} /><input autoComplete="username" required minLength={3} maxLength={40} value={form.username} disabled={busy} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Choose a username" /></div><small>This name appears alongside your predictions.</small></label></>}
        {error && <p className="sa-error" role="alert">{error}</p>}
        <button type="submit" className="sa-google" disabled={busy}>{busy ? <Loader2 size={19} className="sa-spin" /> : <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>}{busy ? 'Connecting to Google…' : 'Continue with Google'}{!busy && <ArrowUpRight size={17} />}</button><p className="sa-footnote">{mode === 'login' ? 'Use the Google account you registered with.' : 'Google handles your sign-in. No new password to remember.'}</p>
      </form><div className="sa-bottom">{mode === 'login' ? 'New to ZLeague?' : 'Already part of the league?'}<button disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'} <ArrowUpRight size={13} /></button></div>
    </div>
  </DialogContent></Dialog>;
}
