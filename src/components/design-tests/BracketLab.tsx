'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Check, Trophy } from 'lucide-react';
import { calculateStandings, type GroupMatch, type TournamentGroup } from '@/lib/group-stage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDesignLab } from './DesignLabShell';
import { LabHeading, PreviewNote, SportTabs } from './LabControls';
import { Crest, SportMark } from './LabPrimitives';
import { cleanName, useLabFamilies, type Sport, type Team } from './lab-data';

interface BracketMatch extends GroupMatch {
  teamA: Team | null; teamB: Team | null; gender?: string; group_id?: number | null;
  boys_stage_groups?: string | null; girls_stage_groups?: string | null; seedA?: string; seedB?: string;
}
interface Round { label: string; matches: BracketMatch[] }
function sampleMatch(id: number, sport: Sport, a: Team | null, b: Team | null, played = true, penalty = false): BracketMatch {
  const scores = sport === 'football' ? penalty ? [1, 1] : [2 + Math.abs(id % 2), 1] : sport === 'basketball' ? [66 + Math.abs(id % 9), 58] : [2, Math.abs(id % 2)];
  return { id, sport_type: sport, teamA: a, teamB: b, team_a_id: a?.id ?? null, team_b_id: b?.id ?? null,
    team_a_score: played ? scores[0] : null, team_b_score: played ? scores[1] : null, winner_id: played ? a?.id ?? null : null,
    status: played ? 'played' : 'not_yet_scheduled', created_at: '2026-11-01T12:00:00Z',
    penalty_score: penalty && played && sport === 'football' ? { team_a: 5, team_b: 4 } : null };
}
function previewGroups(teams: Team[], sport: Sport): TournamentGroup[] {
  if (teams.length < 6) return [];
  return ['A', 'B'].map((name, index) => {
    const three = teams.slice(index * 3, index * 3 + 3);
    return { id: -index - 1, name, championship_id: 0, sport_type: sport, finalized: true, teams: three,
      matches: [[0, 1], [1, 2], [0, 2]].map(([a, b], i) => sampleMatch(-10 - index * 3 - i, sport, three[a], three[b], true, i === 1)) };
  });
}
function previewRounds(teams: Team[], groups: TournamentGroup[], sport: Sport, gender: string): Round[] {
  if (gender === 'male') {
    if (groups.length !== 2) return [];
    const [a, b] = groups.map(g => calculateStandings(g.teams, g.matches).map(row => row.team as Team));
    const semi = [sampleMatch(-30, sport, a[0], b[1]), sampleMatch(-31, sport, b[0], a[1])];
    return [{ label: 'Semifinals', matches: semi }, { label: 'The final', matches: [sampleMatch(-32, sport, semi[0].teamA, semi[1].teamA, false)] }];
  }
  const count = teams.length >= 8 ? 8 : teams.length >= 4 ? 4 : teams.length >= 2 ? 2 : 0;
  if (!count) return [];
  let entrants = teams.slice(0, count), id = -50;
  const rounds: Round[] = [];
  while (entrants.length > 1) {
    const final = entrants.length === 2;
    const matches = Array.from({ length: entrants.length / 2 }, (_, i) => sampleMatch(id--, sport, entrants[i * 2], entrants[i * 2 + 1], !final, i === 1));
    rounds.push({ label: final ? 'The final' : entrants.length === 4 ? 'Semifinals' : 'Quarterfinals', matches });
    entrants = matches.map(m => m.teamA!);
  }
  return rounds;
}
export function BracketLab() {
  const { sport, preview, palette, fontClassName } = useDesignLab();
  const [gender, setGender] = useState('male');
  const [selected, setSelected] = useState<{ text?: string; match?: BracketMatch } | null>(null);
  const families = useLabFamilies();
  const actual = useQuery<{ groups: TournamentGroup[]; matches: BracketMatch[] }>({ queryKey: ['design-lab-bracket', sport], enabled: !preview,
    queryFn: async () => {
      const responses = await Promise.all([fetch(`/api/groups?sport=${sport}`), fetch('/api/matches?ongoing_only=true')]);
      if (responses.some(r => !r.ok)) throw new Error('Could not load the tournament.');
      const [groupData, matchData] = await Promise.all(responses.map(r => r.json()));
      return { groups: groupData.groups || [], matches: matchData.matches || [] };
    }, staleTime: 10000, refetchInterval: preview ? false : 15000, retry: 1 });
  const teams = useMemo(() => (families.data || []).filter(f => f.gender === gender && f.is_active && f.grade !== 'alumni'), [families.data, gender]);
  const groups = preview ? gender === 'male' ? previewGroups(teams, sport) : [] : gender === 'male' ? actual.data?.groups || [] : [];
  const rounds: Round[] = preview ? previewRounds(teams, groups, sport, gender) : ['preliminary', 'quarter-finals', 'semi-finals', 'finals'].map(stage => ({
    label: stage === 'preliminary' ? 'Opening round' : stage === 'quarter-finals' ? 'Quarterfinals' : stage === 'semi-finals' ? 'Semifinals' : 'The final',
    matches: (actual.data?.matches || []).filter(m => m.sport_type === sport && !m.group_id &&
      (m.gender === (gender === 'male' ? 'boys' : 'girls') || m.teamA?.gender === gender || m.teamB?.gender === gender) &&
      (gender === 'male' ? m.boys_stage_groups : m.girls_stage_groups) === stage).sort((a, b) => a.id - b.id),
  })).filter(r => r.matches.length);
  const loading = preview ? families.isPending : actual.isPending;
  const error = preview ? families.isError : actual.isError;
  const retry = () => preview ? families.refetch() : actual.refetch();
  return <section id="matchday-content" className="ml-matchday-section ml-tournament" aria-label="Tournament standings and bracket">
    <LabHeading title="Groups & bracket" /><SportTabs />
    <div className="ml-page-toolbar"><div className="ml-status-tabs" role="group" aria-label="Tournament division">{[{ id: 'male', label: 'Boys’ tournament' }, { id: 'female', label: 'Girls’ tournament' }].map(g => <button key={g.id} aria-pressed={gender === g.id} className={gender === g.id ? 'ml-status-active' : ''} onClick={() => { setGender(g.id); setSelected(null); }}>{g.label}<ArrowUpRight size={14} /></button>)}</div><span className="ml-toolbar-note">{gender === 'male' ? 'Two groups. One champion.' : 'Every round counts.'}</span></div>
    {preview && <PreviewNote>Sample draw and results using current family names. No tournament changes are saved.</PreviewNote>}
    {loading ? <div className="ml-empty" role="status">Loading the tournament…</div> : error ? <div className="ml-empty"><SportMark sport={sport} size={36} /><h3>The draw couldn’t load.</h3><button className="ml-pill ml-pill-dark" onClick={retry}>Try again <ArrowRight size={16} /></button></div> : <>
      {gender === 'male' && <><div className="ml-subheading"><h2>The group stage<span>01</span></h2><p>Each pair meets once · Top two advance</p></div>
        {groups.length === 0 ? <div className="ml-empty ml-bordered"><h3>The draw is on its way.</h3><p>{preview ? 'Six active boys’ families are needed to preview two groups.' : 'Group standings will appear once the draw is announced.'}</p></div> : <div className="ml-group-grid">{groups.map(group => <article className="ml-group-card" key={group.id}><header><div><span className="ml-eyebrow">{preview ? 'SAMPLE STANDINGS' : group.finalized ? 'GROUP COMPLETE' : 'GROUP STANDINGS'}</span><h3>Group {group.name}</h3></div><span className="ml-group-letter">{group.name}</span></header>
          <div className="ml-table-scroll"><table className="ml-league-table"><caption className="sr-only">Group {group.name} standings</caption><thead><tr><th scope="col">Family</th><th scope="col"><abbr title="Matches played">MP</abbr></th><th scope="col"><abbr title="Wins">W</abbr></th><th scope="col"><abbr title="Losses">L</abbr></th>{sport === 'football' && <><th scope="col"><abbr title="Goal difference, excluding shootouts">GD</abbr></th><th scope="col">Pts</th></>}<th scope="col">Last 3</th></tr></thead><tbody>{calculateStandings(group.teams, group.matches).map((row, i) => <tr key={row.team.id} className={i < 2 ? 'ml-advancing' : ''}><th scope="row"><span className="ml-table-team"><span className="ml-rank">{i + 1}</span><Crest team={{ ...row.team, grade: row.team.grade || '' }} /><span>{cleanName(row.team.name)}</span></span></th><td>{row.mp}</td><td>{row.wins}</td><td>{row.losses}</td>{sport === 'football' && <><td>{row.difference > 0 ? '+' : ''}{row.difference}</td><td className="ml-points">{row.points}</td></>}<td><span className="ml-form">{row.form.map((form, index) => <button key={form.matchId} className={form.won ? 'ml-form-win' : 'ml-form-loss'} aria-label={`${cleanName(row.team.name)}: ${cleanName(form.label)}, ${index === row.form.length - 1 ? 'latest result' : 'previous result'}`} title={cleanName(form.label)} onClick={() => setSelected({ text: `${cleanName(row.team.name)}: ${cleanName(form.label)}` })}>{form.won ? <Check size={11} /> : '×'}{form.penalties && <sup>P</sup>}</button>)}{Array.from({ length: 3 - row.form.length }, (_, j) => <span className="ml-form-placeholder" key={j}>–</span>)}</span></td></tr>)}</tbody></table></div>
          <footer><span><i /> Top two advance</span><span>{group.matches.filter(m => m.status === 'played').length}/3 played</span></footer></article>)}</div>}
        <p className="ml-caption">{sport === 'football' ? 'Win = 3 points. Shootouts decide tied games; shootout goals do not count toward GD. ' : 'Matches played, wins and losses. No drawn games. '}Last 3 runs left to right, newest last. Each team plays two group games. <b>P</b> = penalties.</p></>}
      <div className="ml-subheading"><h2>The knockout road<span>{gender === 'male' ? '02' : '01'}</span></h2><p>Win. Advance. Do it again.</p></div>
      {!rounds.length ? <div className="ml-empty ml-bordered"><Trophy size={32} /><h3>A place in the next round.</h3><p>Knockout fixtures will appear here once they’re announced.</p></div> : <div className="ml-bracket-scroll" tabIndex={0} role="region" aria-label="Knockout rounds; scroll horizontally to see later rounds"><div className="ml-bracket" style={{ '--ml-rounds': rounds.length } as React.CSSProperties}>{rounds.map((round, index) => <div className={`ml-round ${index === rounds.length - 1 ? 'ml-round-final' : ''}`} key={round.label}><h3><span>0{index + 1}</span>{round.label}{index === rounds.length - 1 && <Trophy size={17} />}</h3><div className="ml-round-matches">{round.matches.map((match, i) => <button className="ml-knockout-card" key={match.id} onClick={() => setSelected({ match })}><span className="ml-knockout-top">{preview ? 'PREVIEW' : match.status === 'live' ? 'LIVE NOW' : match.status === 'played' ? 'FULL TIME' : 'UPCOMING'}<span>{round.label === 'The final' ? <Trophy size={14} /> : `MATCH ${i + 1}`}</span></span>{[match.teamA, match.teamB].map((team, side) => <span className={`ml-knockout-team ${team && match.winner_id === team.id ? 'ml-knockout-winner' : ''}`} key={side}>{team ? <Crest team={team} /> : <span className="ml-tbd-crest">?</span>}<span>{team ? cleanName(team.name) : side === 0 ? match.seedA || 'To be announced' : match.seedB || 'To be announced'}</span><strong>{match.status === 'played' || match.status === 'live' ? side === 0 ? match.team_a_score : match.team_b_score : '–'}</strong></span>)}<span className="ml-knockout-bottom">{match.penalty_score ? `Won on penalties · ${match.penalty_score.team_a}–${match.penalty_score.team_b}` : match.status === 'played' ? 'Full time' : match.match_time ? new Date(match.match_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Time to be announced'}<ArrowUpRight size={13} /></span></button>)}</div></div>)}</div></div>}
    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className={`ml-dialog ml-palette-${palette} ${fontClassName}`}><DialogHeader className="ml-dialog-header"><p className="ml-eyebrow">{preview ? 'DESIGN PREVIEW' : 'TOURNAMENT RESULT'}</p><DialogTitle>{selected?.match ? 'The matchup' : 'Recent form'}</DialogTitle><DialogDescription>{preview ? 'Sample results for design review.' : 'Results from the current tournament.'}</DialogDescription></DialogHeader><div className="ml-dialog-body">{selected?.text ? <p>{selected.text}</p> : selected?.match && <><div className="ml-result-line">{cleanName(selected.match.teamA?.name)} <strong>{selected.match.team_a_score ?? '–'} : {selected.match.team_b_score ?? '–'}</strong> {cleanName(selected.match.teamB?.name)}</div><p>{selected.match.penalty_score ? `${cleanName(selected.match.winner_id === selected.match.team_a_id ? selected.match.teamA?.name : selected.match.teamB?.name)} won on penalties · ${selected.match.penalty_score.team_a}–${selected.match.penalty_score.team_b}` : selected.match.status === 'played' ? `${cleanName(selected.match.winner_id === selected.match.team_a_id ? selected.match.teamA?.name : selected.match.teamB?.name)} advances.` : 'The next chapter is still to be played.'}</p></>}</div></DialogContent></Dialog>
  </section>;
}
