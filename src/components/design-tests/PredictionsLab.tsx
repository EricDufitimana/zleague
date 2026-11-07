'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Check, History, Target, Trash2, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDesignLab } from './DesignLabShell';
import { GenderFilter, LabHeading, PreviewNote, SearchField, SportTabs } from './LabControls';
import { Crest, SportMark } from './LabPrimitives';
import { cleanName, initials, isUpcoming, matchDate, useLabFixtures, type Sport } from './lab-data';

interface TestPick { key: string; matchId: number; sport: Sport; preview: boolean; teamA: string; teamB: string; winner: string; winnerId: number; savedAt: string }
interface Prediction { user_id: number; is_correct: boolean | null; user?: { username?: string; first_name?: string; last_name?: string } }
interface Fan { id: number; name: string; correct: number; settled: number }
const STORAGE = 'zleague-design-picks';
const sampleFans: Fan[] = [
  { id: -1, name: 'Matchday fan 01', correct: 17, settled: 20 }, { id: -2, name: 'Matchday fan 02', correct: 15, settled: 19 },
  { id: -3, name: 'Matchday fan 03', correct: 14, settled: 20 }, { id: -4, name: 'Matchday fan 04', correct: 12, settled: 18 },
  { id: -5, name: 'Matchday fan 05', correct: 11, settled: 18 },
];
function isStoredPick(value: unknown): value is TestPick {
  if (!value || typeof value !== 'object') return false;
  const p = value as TestPick;
  return typeof p.key === 'string' && typeof p.matchId === 'number' && ['football', 'basketball', 'volleyball'].includes(p.sport) && typeof p.preview === 'boolean' &&
    typeof p.teamA === 'string' && typeof p.teamB === 'string' && typeof p.winner === 'string' && typeof p.winnerId === 'number' && typeof p.savedAt === 'string';
}
export function PredictionsLab() {
  const { sport, preview, palette, fontClassName } = useDesignLab();
  const [gender, setGender] = useState('all');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [picks, setPicks] = useState<TestPick[]>([]);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState(false);
  const [limit, setLimit] = useState(6);
  const fixtures = useLabFixtures();
  const rankings = useQuery<Prediction[]>({ queryKey: ['design-lab-prediction-ranking'], enabled: !preview,
    queryFn: async () => { const response = await fetch('/api/predictions'); if (!response.ok) throw new Error('Could not load prediction rankings.'); return (await response.json()).predictions || []; }, staleTime: 15000, retry: 1 });
  useEffect(() => {
    try { const stored: unknown = JSON.parse(localStorage.getItem(STORAGE) || '[]'); if (Array.isArray(stored)) setPicks(stored.filter(isStoredPick)); }
    catch { setMessage('Previous test picks could not be loaded. You can start a new set.'); }
  }, []);
  useEffect(() => { setLimit(6); }, [sport, gender, search, preview]);
  const matches = useMemo(() => (fixtures.data || []).filter(m => m.sport_type === sport)
    .filter((m, i) => preview ? i < 6 : isUpcoming(m) && (!m.match_time || Date.parse(m.match_time) > Date.now()))
    .filter(m => (gender === 'all' || m.teamA.gender === gender || m.teamB.gender === gender) && `${cleanName(m.teamA.name)} ${cleanName(m.teamB.name)}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (a.match_time ? Date.parse(a.match_time) : Infinity) - (b.match_time ? Date.parse(b.match_time) : Infinity) || a.id - b.id), [fixtures.data, sport, preview, gender, search]);
  const fans = useMemo<Fan[]>(() => {
    if (preview) return sampleFans;
    const byUser = new Map<number, Fan>();
    for (const p of rankings.data || []) {
      if (p.is_correct === null) continue;
      const fan = byUser.get(p.user_id) || { id: p.user_id, name: p.user?.username || [p.user?.first_name, p.user?.last_name].filter(Boolean).join(' ') || 'League fan', correct: 0, settled: 0 };
      fan.settled++; fan.correct += Number(p.is_correct); byUser.set(p.user_id, fan);
    }
    return [...byUser.values()].sort((a, b) => b.correct - a.correct || b.correct / b.settled - a.correct / a.settled || b.settled - a.settled);
  }, [preview, rankings.data]);
  const persist = (updated: TestPick[], success: string) => {
    setPicks(updated);
    try { localStorage.setItem(STORAGE, JSON.stringify(updated)); setMessage(success); }
    catch { setMessage('Storage is unavailable. Your test picks will last until you leave this page.'); }
  };
  const activePicks = picks.filter(p => p.preview === preview);
  return <section id="matchday-content" className="ml-matchday-section ml-predictions" aria-label="Match predictions"><LabHeading title="Back your instinct" note="Real fixtures · test picks only" /><SportTabs />
    <div className="ml-page-toolbar"><div className="ml-status-tabs"><span className="ml-status-label">PICK THE WINNER <Target size={15} /></span><span className="ml-toolbar-note">Who are you backing?</span></div><button className="ml-history-button" onClick={() => setHistory(true)}><History size={16} />Your test picks<span>{picks.length}</span></button></div>
    <PreviewNote>{preview ? 'Sample match picks and fan rankings. ' : 'Actual upcoming fixtures. '}Test picks are saved only in this browser.</PreviewNote>
    <div className="ml-predictions-layout"><div className="ml-pick-board"><div className="ml-filters"><SearchField value={search} onChange={setSearch} /><GenderFilter value={gender} onChange={setGender} /></div><div className="ml-list-topline"><span>{sport} <span>/</span> {matches.length} MATCHUPS</span><span>NO DRAWS. CHOOSE A SIDE.</span></div>
      <div className="ml-pick-grid" aria-busy={fixtures.isPending}>{fixtures.isPending ? <div className="ml-empty" role="status">Finding the next matchups…</div> : fixtures.isError ? <div className="ml-empty"><h3>The fixtures couldn’t load.</h3><button className="ml-pill ml-pill-dark" onClick={() => fixtures.refetch()}>Try again <ArrowRight size={15} /></button></div> : !matches.length ? <div className="ml-empty ml-bordered"><SportMark sport={sport} size={38} /><h3>Next up? We’ll see.</h3><p>{search || gender !== 'all' ? 'Try another family or clear your filters.' : 'Upcoming fixtures will appear when they’re announced.'}</p>{(search || gender !== 'all') && <button className="ml-pill ml-pill-dark" onClick={() => { setSearch(''); setGender('all'); }}>Clear filters <ArrowRight size={15} /></button>}</div> : matches.slice(0, limit).map((match, index) => {
        const key = `${preview ? 'sample' : 'actual'}:${sport}:${match.id}`;
        const saved = picks.find(p => p.key === key);
        const choice = drafts[key] ?? saved?.winnerId;
        const changed = !!choice && choice !== saved?.winnerId;
        return <article className={`ml-pick-card ml-pick-card-${index % 4}`} key={key}><header><span>{preview ? 'PREVIEW MATCHUP' : matchDate(match)}</span><SportMark sport={sport} size={18} /></header><p className="ml-pick-division">{match.teamA.gender === 'male' ? 'Boys' : 'Girls'} · {preview ? 'Sample fixture' : 'Upcoming fixture'}</p>
          <div className="ml-pick-sides" role="group" aria-label={`Pick the winner: ${cleanName(match.teamA.name)} versus ${cleanName(match.teamB.name)}`}>{[match.teamA, match.teamB].map(team => <button key={team.id} className={choice === team.id ? 'ml-pick-selected' : ''} aria-pressed={choice === team.id} onClick={() => { setDrafts(current => ({ ...current, [key]: team.id })); setMessage(''); }}><span className="ml-choice-tick">{choice === team.id && <Check size={12} />}</span><Crest team={team} large /><span>{cleanName(team.name)}</span><small>{choice === team.id ? 'YOUR PICK' : 'CHOOSE FAMILY'}</small></button>)}<span className="ml-pick-vs" aria-hidden="true">VS</span></div>
          <footer><span>{saved && !changed ? <><Check size={13} /> Saved in this browser</> : choice ? 'Ready to back your pick?' : 'Choose a family above'}</span><button disabled={!changed} onClick={() => {
            if (!choice) return;
            const pick: TestPick = { key, sport, preview, matchId: match.id, teamA: cleanName(match.teamA.name), teamB: cleanName(match.teamB.name), winnerId: choice,
              winner: cleanName(choice === match.team_a_id ? match.teamA.name : match.teamB.name), savedAt: new Date().toISOString() };
            persist([...picks.filter(p => p.key !== key), pick], `Test pick saved: ${pick.winner}.`);
          }}>{saved && !changed ? 'Saved' : saved ? 'Update pick' : 'Save test pick'}<ArrowUpRight size={14} /></button></footer>
        </article>;
      })}</div>{matches.length > limit && <button className="ml-load-more" onClick={() => setLimit(n => n + 6)}>More matchups <ArrowRight size={16} /></button>}
    </div><aside className="ml-prediction-sidebar"><div className="ml-your-picks"><span className="ml-eyebrow">YOUR MATCHDAY</span><div><strong>{String(activePicks.length).padStart(2, '0')}</strong><Target size={36} strokeWidth={1.3} /></div><h2>Instinct, on record.</h2><p>{activePicks.length ? 'Your test picks are ready to review.' : 'Choose a family. Make your first test pick.'}</p><button onClick={() => setHistory(true)}>Review your picks <ArrowUpRight size={16} /></button></div>
      <div className="ml-fan-ranking"><header><span className="ml-eyebrow">{preview ? 'SAMPLE FAN RANKINGS' : 'FAN RANKINGS'}</span><Trophy size={19} /></header><h2>The ones who called it.</h2>{!preview && rankings.isPending ? <p className="ml-caption" role="status">Loading rankings…</p> : !preview && rankings.isError ? <div className="ml-ranking-empty"><p>Rankings couldn’t load.</p><button onClick={() => rankings.refetch()}>Try again</button></div> : !fans.length ? <p className="ml-caption">Rankings appear after predictions are settled.</p> : <ol>{fans.slice(0, 5).map((fan, i) => <li key={fan.id}><span className="ml-fan-rank">{i + 1}</span><span className="ml-fan-avatar">{initials(fan.name)}</span><div><strong>{fan.name}</strong><span>{fan.correct}/{fan.settled} correct · {Math.round(fan.correct / fan.settled * 100)}%</span><i><span style={{ width: `${fan.correct / fan.settled * 100}%` }} /></i></div>{i === 0 && <CrownIcon />}</li>)}</ol>}<p className="ml-caption">Most correct picks, then accuracy. {preview && 'All identities and rankings are samples.'}</p></div>
    </aside></div><p className="ml-pick-feedback" role="status" aria-live="polite">{message}</p>
    <Dialog open={history} onOpenChange={setHistory}><DialogContent className={`ml-dialog ml-palette-${palette} ${fontClassName}`}><DialogHeader className="ml-dialog-header"><p className="ml-eyebrow">SAVED IN THIS BROWSER</p><DialogTitle>Your test picks</DialogTitle><DialogDescription>Design testing only. These picks are not submitted to the league.</DialogDescription></DialogHeader><div className="ml-dialog-body">{!picks.length ? <div className="ml-empty"><Target size={35} /><h3>Trust your first instinct.</h3><p>Choose a family from a matchup to save a test pick.</p></div> : <><ul className="ml-pick-history">{[...picks].reverse().map(pick => <li key={pick.key}><div><small>{pick.sport} · {pick.preview ? 'Sample fixture' : 'Actual fixture'}</small><strong>{pick.teamA} <span>vs</span> {pick.teamB}</strong><span><Check size={12} /> {pick.winner}</span></div><button className="ml-icon-button" aria-label={`Remove test pick for ${pick.teamA} versus ${pick.teamB}`} onClick={() => { persist(picks.filter(p => p.key !== pick.key), 'Test pick removed.'); setDrafts(current => { const copy = { ...current }; delete copy[pick.key]; return copy; }); }}><Trash2 size={16} /></button></li>)}</ul><button className="ml-clear-picks" onClick={() => { persist([], 'All test picks cleared.'); setDrafts({}); }}>Clear all test picks <Trash2 size={14} /></button></>}</div></DialogContent></Dialog>
  </section>;
}
function CrownIcon() { return <Trophy className="ml-fan-trophy" size={15} />; }
