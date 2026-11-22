"use client";

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, Search, X } from 'lucide-react';
import type { Sport } from '@/components/design-tests/lab-data';
import { SportMark } from '@/components/design-tests/LabPrimitives';

interface Fixture {
  id: number;
  sport_type: string;
  status: string;
  match_time?: string;
  team_a_score?: number | null;
  team_b_score?: number | null;
  teamA: { name: string; gender?: string; grade: string };
  teamB: { name: string; gender?: string; grade: string };
}

const clean = (name: string) => name.replaceAll('_', ' ');
const statusLabel = (status: string) => status === 'played' ? 'Result recorded' : status === 'live' ? 'Live now' : status === 'scheduled' ? 'Scheduled' : 'Unscheduled';

export function FixturePicker({ matches, selectedId, onSelect, loading, disabled, hasChampionship }: {
  matches: Fixture[]; selectedId: string; onSelect: (id: string) => void;
  loading: boolean; disabled: boolean; hasChampionship: boolean;
}) {
  const [search, setSearch] = useState('');
  const [sport, setSport] = useState('all');
  const [view, setView] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(6);
  const selected = matches.find(match => String(match.id) === selectedId);
  const open = !selected || expanded;
  const filtered = matches.filter(match =>
    (sport === 'all' || match.sport_type === sport) &&
    (view === 'all' || (view === 'played' ? match.status === 'played' : match.status !== 'played')) &&
    `${clean(match.teamA.name)} ${clean(match.teamB.name)} ${match.teamA.grade} ${match.teamA.gender === 'male' ? 'boys' : 'girls'}`.toLowerCase().includes(search.toLowerCase().trim()),
  );

  return <section className="op-fixture-picker" aria-labelledby="fixture-picker-title">
    <header className="op-picker-heading">
      <div><p className="op-eyebrow">THE SCORING DESK</p><h2 id="fixture-picker-title">{selected ? 'Your selected fixture' : 'Which game are we scoring?'}</h2><p>{selected ? 'Saved results open with the scores and players already filled in.' : 'Find your matchup. Record a new result or correct an existing one.'}</p></div>
      {selected && <button type="button" className="op-button op-button-outline" disabled={disabled} aria-expanded={open} aria-controls="fixture-browser" onClick={() => setExpanded(!expanded)}>{open ? 'Close browser' : 'Change match'}<ChevronDown size={15} /></button>}
    </header>
    {open && <div id="fixture-browser">
      <div className="op-picker-tools">
        <label className="op-search"><Search size={17} /><input type="search" aria-label="Search fixtures" placeholder="Search a family or team…" value={search} onChange={event => { setSearch(event.target.value); setLimit(6); }} />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</label>
        <div className="op-picker-views" role="group" aria-label="Result status">{[['all', 'All games'], ['pending', 'To record'], ['played', 'Edit results']].map(([id, label]) => <button type="button" key={id} aria-pressed={view === id} onClick={() => { setView(id); setLimit(6); }}>{label}<span>{matches.filter(match => id === 'all' || (id === 'played' ? match.status === 'played' : match.status !== 'played')).length}</span></button>)}</div>
      </div>
      <div className="op-picker-sports" role="group" aria-label="Filter fixtures by sport">{['all', 'football', 'basketball', 'volleyball'].map(id => <button type="button" key={id} aria-pressed={sport === id} onClick={() => { setSport(id); setLimit(6); }}>{id !== 'all' && <SportMark sport={id as Sport} size={17} />}{id === 'all' ? 'All sports' : id}</button>)}<span aria-live="polite">{filtered.length} {filtered.length === 1 ? 'fixture' : 'fixtures'}</span></div>
      {loading ? <div className="op-empty" role="status">Loading fixtures…</div> : !filtered.length ? <div className="op-empty"><Search size={27} /><h3>{!hasChampionship ? 'Choose a championship to begin.' : !matches.length ? 'No ready fixtures yet.' : 'No matching games.'}</h3><p>{!hasChampionship ? 'Use the championship picker at the top of your workspace.' : !matches.length ? 'Fixtures appear here once both opponents are confirmed.' : 'Try another family name or adjust your filters.'}</p>{matches.length > 0 && <button type="button" className="op-text-button" onClick={() => { setSearch(''); setSport('all'); setView('all'); }}>Reset filters</button>}</div> : <>
        <div className="op-picker-grid">{filtered.slice(0, limit).map(match => <button type="button" key={match.id} className={`op-picker-fixture ${match.status === 'live' ? 'op-picker-live' : ''}`} aria-pressed={selectedId === String(match.id)} disabled={disabled} onClick={() => { onSelect(String(match.id)); setExpanded(false); }}>
          <span className="op-picker-card-meta"><span><SportMark sport={match.sport_type as Sport} size={17} />{match.sport_type}</span><span className={`op-picker-state op-picker-state-${match.status}`}>{statusLabel(match.status)}</span></span>
          <span className="op-picker-division">{match.teamA.gender === 'male' ? 'Boys' : 'Girls'} · {match.teamA.grade}{match.teamB.grade !== match.teamA.grade ? ` / ${match.teamB.grade}` : ''}</span>
          <span className="op-picker-teams">{[match.teamA, match.teamB].map((team, index) => <span key={index}><span className={`op-picker-team-mark op-picker-team-${index}`}>{clean(team.name).replace(/^family\s+/i, '').slice(0, 2).toUpperCase()}</span><strong>{clean(team.name)}</strong>{['live', 'played'].includes(match.status) && <b>{(index === 0 ? match.team_a_score : match.team_b_score) ?? '–'}</b>}</span>)}</span>
          <span className="op-picker-card-footer"><span><Clock3 size={12} />{match.match_time ? new Date(match.match_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Date not set'}</span><span>{selectedId === String(match.id) ? <>Selected <Check size={14} /></> : <>{match.status === 'played' ? 'Edit result' : match.status === 'live' ? 'Continue scoring' : 'Enter score'}<ArrowRight size={14} /></>}</span></span>
        </button>)}</div>
        {filtered.length > limit && <button type="button" className="op-more" onClick={() => setLimit(limit + 6)}>Show more fixtures <span>{filtered.length - limit} remaining</span><ChevronDown size={14} /></button>}
      </>}
    </div>}
  </section>;
}
