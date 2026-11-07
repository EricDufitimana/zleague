'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Circle, Clock3, Loader2, RefreshCw, Search, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDesignLab } from './DesignLabShell';
import { Crest, SportMark } from './LabPrimitives';
import { SPORTS, cleanName, hasScore, isUpcoming, isShootout, matchDate, stageLabel, withPreviewScores, useLabFixtures, type Match, type PlayerScore, type Palette, type StatusFilter } from './lab-data';

export function MatchdayLab() {
  const { isLab, palette, preview: previewScores, setPreview: setPreviewScores, sport, setSport, fontClassName } = useDesignLab();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [gender, setGender] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Match | null>(null);
  const [limit, setLimit] = useState(9);
  const { data: realMatches = [], isPending, isError, isFetching, refetch, dataUpdatedAt } = useLabFixtures();
  useEffect(() => { setLimit(9); }, [sport, status, gender, search, previewScores]);
  const matches = useMemo(() => previewScores ? withPreviewScores(realMatches) : realMatches, [realMatches, previewScores]);
  const sportMatches = useMemo(() => matches.filter(match => match.sport_type === sport), [matches, sport]);
  const baseMatches = useMemo(() => sportMatches.filter(match =>
    (gender === 'all' || (match.teamA.gender || match.teamB.gender) === gender) &&
    (!search.trim() || `${cleanName(match.teamA.name)} ${cleanName(match.teamB.name)}`.toLowerCase().includes(search.trim().toLowerCase()))), [sportMatches, gender, search]);
  const counts = { all: baseMatches.length, live: baseMatches.filter(m => m.status === 'live').length,
    upcoming: baseMatches.filter(isUpcoming).length, played: baseMatches.filter(m => m.status === 'played').length };
  const filtered = useMemo(() => baseMatches.filter(match => status === 'all' || (status === 'upcoming' ? isUpcoming(match) : match.status === status))
    .sort((a, b) => {
      const priority = (m: Match) => m.status === 'live' ? 0 : m.status === 'played' ? 1 : 2;
      if (priority(a) !== priority(b)) return priority(a) - priority(b);
      if (isUpcoming(a)) return (a.match_time ? Date.parse(a.match_time) : Infinity) - (b.match_time ? Date.parse(b.match_time) : Infinity) || a.id - b.id;
      return Date.parse(b.match_time || b.created_at) - Date.parse(a.match_time || a.created_at);
    }), [baseMatches, status]);
  const selectedMatch = matches.find(match => match.id === selected?.id) || selected;

  return <>
<section id="matchday-content" className="ml-matchday-section" aria-labelledby="matches-heading">
        <div className="ml-section-heading"><div><p className="ml-eyebrow">{realMatches[0]?.championship?.name || 'ASYV CHAMPIONS LEAGUE'}</p><h1 id="matches-heading">Matchday<span>.</span></h1></div>
          <div className="ml-board-controls">{isLab && <button className="ml-preview-switch" role="switch" aria-checked={previewScores} onClick={() => { setPreviewScores(!previewScores); setSelected(null); }}><span>Preview scores</span><i><span /></i></button>}
            <span className="ml-live-indicator"><i />{previewScores ? 'Sample scores for design review' : isError ? 'Connection interrupted' : 'Real fixtures · auto-refreshing'}</span></div></div>
        <div className="ml-sport-tabs" role="group" aria-label="Choose sport">{SPORTS.map(s => <button key={s.id} aria-pressed={sport === s.id} onClick={() => { setSport(s.id); setStatus('all'); }} className={sport === s.id ? 'ml-sport-active' : ''}>
          <span className="ml-sport-number">{s.number}</span><SportMark sport={s.id} size={25} /><span>{s.label}</span><span className="ml-sport-count">{isPending ? '—' : matches.filter(m => m.sport_type === s.id).length}</span><ArrowUpRight size={20} /></button>)}</div>

        <div className="ml-board-layout"><div className="ml-board">
          <div className="ml-filters"><label className="ml-search"><Search size={17} /><input type="search" aria-label="Search matches by family" placeholder="Find your family" value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}</label>
            <label className="ml-gender"><Users size={16} /><select aria-label="Filter by gender" value={gender} onChange={e => setGender(e.target.value)}><option value="all">Everyone</option><option value="male">Boys</option><option value="female">Girls</option></select><ChevronDown size={14} /></label></div>
          <div className="ml-status-tabs" role="group" aria-label="Match status">{([{ id: 'all', label: 'All matches' }, { id: 'live', label: 'Live' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'played', label: 'Results' }] as const).map(filter =>
            <button key={filter.id} onClick={() => setStatus(filter.id)} aria-pressed={status === filter.id} className={status === filter.id ? 'ml-status-active' : ''}>{filter.id === 'live' && <i />}{filter.label}<span>{isPending ? '—' : counts[filter.id]}</span></button>)}</div>
          <div className="ml-list-topline"><span>{SPORTS.find(s => s.id === sport)?.label} <span>/</span> {status === 'played' ? 'THE RESULTS' : status === 'live' ? 'HAPPENING NOW' : status === 'upcoming' ? 'COMING UP' : 'FIXTURES & RESULTS'}</span>
            <button onClick={() => refetch()} disabled={isFetching} aria-label="Refresh matches"><RefreshCw size={14} className={isFetching ? 'ml-spin' : ''} /></button></div>
          <div className="ml-match-list" aria-live="polite" aria-busy={isPending}>
            {isPending ? Array.from({ length: 4 }, (_, i) => <div className="ml-match-skeleton" key={i}><span /><span /><span /></div>)
              : isError ? <div className="ml-empty"><Circle size={32} /><h3>A little break in play.</h3><p>We couldn’t load the matches. Please give it another try.</p><button className="ml-pill ml-pill-dark" onClick={() => refetch()}>Try again <RefreshCw size={15} /></button></div>
              : filtered.length === 0 ? <div className="ml-empty"><SportMark sport={sport} size={42} /><h3>{status === 'live' ? 'No whistles blowing right now.' : 'No matches on this board.'}</h3><p>{search || gender !== 'all' ? 'Try another family name or clear your filters.' : status === 'live' ? 'Browse the upcoming fixtures or catch up on the results.' : 'Fixtures will appear here as soon as they’re announced.'}</p>
                {(search || gender !== 'all' || status !== 'all') && <button className="ml-pill ml-pill-dark" onClick={() => { setSearch(''); setGender('all'); setStatus('all'); }}>Show all matches <ArrowRight size={15} /></button>}</div>
              : filtered.slice(0, limit).map((match, index) => <button className={`ml-score-card ml-score-card-${index % 6} ${match.status === 'live' ? 'ml-score-card-live' : ''}`} key={match.id} onClick={() => setSelected(match)} aria-label={`View ${cleanName(match.teamA.name)} versus ${cleanName(match.teamB.name)}${hasScore(match) ? `, ${match.team_a_score ?? 0} to ${match.team_b_score ?? 0}` : ''}${match.preview ? ', sample scores' : ''}`}>
                <span className="ml-card-top"><span className={`ml-card-status ${match.status === 'live' ? 'ml-card-status-live' : ''}`}>{match.status === 'live' ? <><i /> LIVE NOW</> : match.status === 'played' ? 'FULL TIME' : 'UPCOMING'}</span><span><SportMark sport={match.sport_type} size={17} />{match.preview ? 'PREVIEW' : stageLabel(match)}</span></span>
                <span className="ml-card-match"><span className={`ml-card-team ${match.winner_id === match.team_a_id ? 'ml-card-winner' : ''}`}><Crest team={match.teamA} large /><span>{cleanName(match.teamA.name)}</span></span>
                  <span className="ml-card-score"><span>{hasScore(match) ? match.team_a_score ?? 0 : '—'}</span><i>:</i><span>{hasScore(match) ? match.team_b_score ?? 0 : '—'}</span></span>
                  <span className={`ml-card-team ${match.winner_id === match.team_b_id ? 'ml-card-winner' : ''}`}><Crest team={match.teamB} large /><span>{cleanName(match.teamB.name)}</span></span></span>
                <span className="ml-card-result">{isShootout(match) ? <span className="ml-card-penalties">{cleanName(match.winner_id === match.team_a_id ? match.teamA.name : match.teamB.name)} won on penalties · {match.penalty_score!.team_a}–{match.penalty_score!.team_b}</span> : <span>{match.teamA.gender === 'male' ? 'Boys' : match.teamA.gender === 'female' ? 'Girls' : 'League'} <i>·</i> {stageLabel(match)}</span>}</span>
                <span className="ml-card-footer"><span>{match.preview && hasScore(match) ? 'Sample score' : matchDate(match)}</span><span>{match.preview ? 'Match preview' : 'Match details'}<ArrowUpRight size={17} /></span></span>
              </button>)}
          </div>
          {!isPending && !isError && filtered.length > limit && <button className="ml-load-more" onClick={() => setLimit(n => n + 9)}>More matchday <span>+{Math.min(9, filtered.length - limit)}</span><ArrowDown size={17} /></button>}
          {!isPending && !isError && filtered.length > 0 && <p className="ml-list-footnote">Showing {Math.min(limit, filtered.length)} of {filtered.length} matches<span>{dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></p>}
        </div>

        </div>
      </section>
<MatchDetail match={selectedMatch} onClose={() => setSelected(null)} palette={palette} fontClassName={fontClassName} />
</>;
}

function MatchDetail({ match, onClose, palette, fontClassName }: { match: Match | null; onClose: () => void; palette: Palette; fontClassName: string }) {
  const { data: scores = [], isPending, isError } = useQuery<PlayerScore[]>({
    queryKey: ['design-lab-stats', match?.sport_type, match?.id], enabled: !!match && hasScore(match) && !match.preview,
    queryFn: async () => {
      const response = await fetch(`/api/${match!.sport_type}-scores?match_id=${match!.id}`);
      if (!response.ok) throw new Error('Could not load match statistics.');
      return (await response.json()).scores || [];
    }, refetchInterval: match?.status === 'live' ? 10000 : false,
  });
  return <Dialog open={!!match} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className={`ml-dialog ml-palette-${palette} ${fontClassName}`}>
    {match && <><DialogHeader className="ml-dialog-header"><p className="ml-eyebrow">{match.sport_type} / {stageLabel(match)}</p><DialogTitle>{cleanName(match.teamA.name)} <span>vs</span> {cleanName(match.teamB.name)}</DialogTitle><DialogDescription>{matchDate(match)} · {match.teamA.gender === 'male' ? 'Boys' : match.teamA.gender === 'female' ? 'Girls' : 'League'}</DialogDescription></DialogHeader>
      <div className="ml-dialog-score"><Crest team={match.teamA} large /><strong>{hasScore(match) ? `${match.team_a_score ?? 0} : ${match.team_b_score ?? 0}` : 'VS'}</strong><Crest team={match.teamB} large /></div>
      {isShootout(match) && <p className="ml-dialog-penalties">{cleanName(match.winner_id === match.team_a_id ? match.teamA.name : match.teamB.name)} won on penalties · {match.penalty_score!.team_a}–{match.penalty_score!.team_b}</p>}
      <div className="ml-dialog-body">{match.preview ? <div className="ml-empty"><SportMark sport={match.sport_type} size={36} /><h3>A look at the scoreboard.</h3><p>These are sample scores for design review. Switch off Preview scores to see the actual fixtures and match statistics.</p></div> : !hasScore(match) ? <div className="ml-empty"><Clock3 size={28} /><h3>The best is yet to come.</h3><p>Match statistics will appear here once the game starts.</p></div> : isPending ? <div className="ml-empty"><Loader2 className="ml-spin" /> Loading the match breakdown…</div> : isError ? <p role="alert">We couldn’t load the player statistics. Please try opening the match again.</p> : scores.length === 0 ? <p>No player statistics have been recorded for this match yet.</p> : match.sport_type === 'volleyball' ? <div className="ml-stats-scroll"><table><caption>Set scores</caption><thead><tr><th>Set</th><th>{cleanName(match.teamA.name)}</th><th>{cleanName(match.teamB.name)}</th></tr></thead><tbody>{[...new Set(scores.flatMap(s => s.sets?.map(set => set.setNumber) || []))].sort((a, b) => a - b).map(set => <tr key={set}><th>{set}</th><td>{scores.find(s => s.team_id === match.team_a_id)?.sets?.find(s => s.setNumber === set)?.points ?? '—'}</td><td>{scores.find(s => s.team_id === match.team_b_id)?.sets?.find(s => s.setNumber === set)?.points ?? '—'}</td></tr>)}</tbody></table></div>
        : [match.teamA, match.teamB].map(team => {
          const teamScores = scores.filter(s => s.team_id === team.id && s.player_id);
          const columns = match.sport_type === 'basketball' ? [{ key: 'points', label: 'PTS' }, { key: 'rebounds', label: 'REB' }, { key: 'assists', label: 'AST' }] : [{ key: 'goals', label: 'G' }, { key: 'assists', label: 'A' }, { key: 'shots_on_target', label: 'SOT' }, { key: 'saves', label: 'SV' }];
          return <div className="ml-stats-scroll" key={team.id}><table><caption>{cleanName(team.name)}</caption><thead><tr><th scope="col">Player</th>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{teamScores.map(score => <tr key={score.id}><th scope="row">{score.player ? `${score.player.first_name} ${score.player.last_name}` : 'Player'}</th>{columns.map(c => <td key={c.key}>{Number(score[c.key as keyof PlayerScore]) || 0}</td>)}</tr>)}{!teamScores.length && <tr><td colSpan={columns.length + 1}>No individual stats recorded.</td></tr>}</tbody></table></div>;
        })}</div>
    </>}
  </DialogContent></Dialog>;
}
