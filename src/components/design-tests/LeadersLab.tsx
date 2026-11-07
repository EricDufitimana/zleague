'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUpRight, Crown, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDesignLab } from './DesignLabShell';
import { GenderFilter, LabHeading, PreviewNote, SearchField, SportTabs } from './LabControls';
import { Crest, SportMark } from './LabPrimitives';
import { cleanName, initials, useLabFamilies, useLabFixtures, type Team } from './lab-data';

interface Leader { id: number; name: string; team: string; teamId?: number; gender?: string; gamesPlayed: number; goals?: number; assists?: number; shotsOnTarget?: number; saves?: number; points?: number; rebounds?: number }
type Stat = 'goals' | 'assists' | 'shotsOnTarget' | 'saves' | 'points' | 'rebounds';
interface RosterPlayer { id: number; first_name: string; last_name: string; team_id: number }
const footballStats: { key: Stat; label: string; short: string }[] = [{ key: 'goals', label: 'Goals', short: 'G' }, { key: 'assists', label: 'Assists', short: 'A' }, { key: 'shotsOnTarget', label: 'Shots on target', short: 'SOT' }, { key: 'saves', label: 'Saves', short: 'SV' }];
const basketballStats: typeof footballStats = [{ key: 'points', label: 'Points', short: 'PTS' }, { key: 'rebounds', label: 'Rebounds', short: 'REB' }, { key: 'assists', label: 'Assists', short: 'AST' }];
export function LeadersLab() {
  const { sport, preview, palette, fontClassName, route } = useDesignLab();
  const [gender, setGender] = useState('all');
  const [search, setSearch] = useState('');
  const [stat, setStat] = useState<Stat>('goals');
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<Leader | null>(null);
  const fixtures = useLabFixtures();
  const families = useLabFamilies();
  const teams = useMemo(() => [...new Map((fixtures.data || []).flatMap(m => [m.teamA, m.teamB]).map(team => [team.id, team])).values()], [fixtures.data]);
  const roster = useQuery<RosterPlayer[]>({ queryKey: ['design-lab-roster', teams.map(t => t.id).join(',')], enabled: preview && sport !== 'volleyball' && teams.length > 0,
    queryFn: async () => {
      const pairs = Array.from({ length: Math.ceil(teams.length / 2) }, (_, i) => [teams[i * 2], teams[i * 2 + 1] || teams[i * 2]]);
      const results = await Promise.all(pairs.map(async ([a, b]) => {
        const response = await fetch(`/api/players?team_a_id=${a.id}&team_b_id=${b.id}`);
        if (!response.ok) throw new Error('Could not load the roster.');
        return await response.json() as RosterPlayer[];
      }));
      return [...new Map(results.flat().map(p => [p.id, p])).values()];
    }, staleTime: 60000, retry: 1 });
  const actual = useQuery<Leader[]>({ queryKey: ['design-lab-leaders', sport, gender], enabled: !preview && sport !== 'volleyball', queryFn: async () => {
    const response = await fetch(`/api/leaders?sport=${sport}&gender=${gender}`);
    if (!response.ok) throw new Error('Could not load leaders.');
    return (await response.json()).leaders || [];
  }, staleTime: 15000, retry: 1 });
  const columns = sport === 'basketball' ? basketballStats : footballStats;
  const activeStat = columns.find(c => c.key === stat) || columns[0];
  useEffect(() => { setLimit(10); setSelected(null); }, [sport, gender, stat, search, preview]);
  const previewLeaders = useMemo<Leader[]>(() => {
    const active = (families.data || []).filter(f => f.is_active && f.grade !== 'alumni');
    return active.flatMap((family, familyIndex) => {
      const team = teams.find(t => cleanName(t.name).toLowerCase() === cleanName(family.name).toLowerCase());
      const players = team ? (roster.data || []).filter(p => p.team_id === team.id).slice(0, 2) : [];
      return Array.from({ length: 2 }, (_, i) => {
        const player = players[i]; const seed = familyIndex * 2 + i;
        return { id: player?.id || -seed - 1, name: player ? `${player.first_name} ${player.last_name}` : `Preview player ${String(seed + 1).padStart(2, '0')}`,
          team: cleanName(family.name), teamId: family.id, gender: family.gender, gamesPlayed: 2 + seed % 3,
          goals: 2 + (seed * 3) % 8, assists: 1 + (seed * 5) % 6, shotsOnTarget: 5 + (seed * 3) % 14,
          saves: seed % 3 === 0 ? 7 + seed % 9 : 0, points: 24 + (seed * 13) % 91, rebounds: 8 + (seed * 7) % 29 };
      });
    });
  }, [families.data, roster.data, teams]);
  const leaders = useMemo(() => (preview ? previewLeaders.filter(p => gender === 'all' || p.gender === gender) : actual.data || [])
    .sort((a, b) => Number(b[activeStat.key] || 0) - Number(a[activeStat.key] || 0) || a.name.localeCompare(b.name)), [preview, previewLeaders, gender, actual.data, activeStat.key]);
  const filtered = leaders.filter(p => `${p.name} ${p.team}`.toLowerCase().includes(search.trim().toLowerCase()));
  const loading = preview ? families.isPending || fixtures.isPending || (roster.isFetching && !roster.data) : actual.isPending;
  const error = preview ? families.isError : actual.isError;
  const teamFor = (p: Leader): Team => ({ id: p.teamId || p.id, name: p.team, grade: '' });
  return <section id="matchday-content" className="ml-matchday-section ml-leaders" aria-label="Player leaders"><LabHeading title="The game changers" /><SportTabs />
    <div className="ml-page-toolbar"><div className="ml-status-tabs" role="group" aria-label="Rank players by statistic">{sport !== 'volleyball' && columns.map(c => <button key={c.key} aria-pressed={c.key === activeStat.key} className={c.key === activeStat.key ? 'ml-status-active' : ''} onClick={() => setStat(c.key)}>{c.label}{c.key === activeStat.key && <TrendingUp size={14} />}</button>)}</div><GenderFilter value={gender} onChange={setGender} /></div>
    {preview && <PreviewNote>Sample player totals for design review. Names come from the roster where available; other cards use preview identities.</PreviewNote>}
    {sport === 'volleyball' ? <div className="ml-volley-panel"><div><SportMark sport="volleyball" size={70} /><span className="ml-eyebrow">EVERY POINT IS A TEAM EFFORT</span><h2>The whole team.<br />The whole game.</h2><p>Volleyball tracks match and set scores. Follow your family’s results and their road through the tournament.</p><Link href={route('/bracket')} className="ml-pill ml-pill-dark">See the tournament <ArrowUpRight size={16} /></Link></div><div className="ml-volley-art" aria-hidden="true"><SportMark sport="volleyball" size={220} /><span>SET.<br />MATCH.</span></div></div>
      : loading ? <div className="ml-empty" role="status">Finding the game changers…</div> : error ? <div className="ml-empty"><h3>The stats couldn’t load.</h3><button className="ml-pill ml-pill-dark" onClick={() => preview ? families.refetch() : actual.refetch()}>Try again <ArrowRight size={15} /></button></div> : !leaders.length ? <div className="ml-empty ml-bordered"><SportMark sport={sport} size={40} /><h3>The numbers start here.</h3><p>Player rankings will appear as soon as match statistics are recorded.</p></div> : <>
        <div className="ml-spotlight-grid">{leaders.slice(0, 3).map((player, i) => <button className={`ml-spotlight ml-spotlight-${i}`} key={player.id} onClick={() => setSelected(player)}><span className="ml-spotlight-top"><span>{i === 0 ? <Crown size={16} /> : `0${i + 1}`}{i === 0 ? 'LEADING THE WAY' : 'IN THE CHASE'}</span><ArrowUpRight size={18} /></span><div className="ml-player-portrait" aria-hidden="true">{initials(player.name)}<span>{String(i + 1).padStart(2, '0')}</span></div><span className="ml-spotlight-name">{player.name}</span><span className="ml-spotlight-family"><Crest team={teamFor(player)} />{cleanName(player.team)}</span><span className="ml-spotlight-score"><strong>{player[activeStat.key] || 0}</strong><span>{activeStat.label}<small>{player.gamesPlayed} matches played{preview ? ' · Sample' : ''}</small></span></span></button>)}</div>
        <div className="ml-subheading"><h2>The full lineup<span>{leaders.length}</span></h2><SearchField value={search} onChange={setSearch} placeholder="Search players or families" /></div>
        <div className="ml-table-scroll ml-ranking-table"><table className="ml-league-table"><caption className="sr-only">Players ranked by {activeStat.label.toLowerCase()}{preview ? ', sample statistics' : ''}</caption><thead><tr><th scope="col">Rank / Player</th><th scope="col">Family</th>{columns.map(c => <th scope="col" className={activeStat.key === c.key ? 'ml-stat-selected' : ''} key={c.key}><abbr title={c.label}>{c.short}</abbr></th>)}<th scope="col"><abbr title="Matches played">MP</abbr></th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{filtered.slice(0, limit).map(player => <tr key={player.id}><th scope="row"><button className="ml-player-cell" onClick={() => setSelected(player)}><span className="ml-rank">{String(leaders.indexOf(player) + 1).padStart(2, '0')}</span><span className="ml-player-avatar">{initials(player.name)}</span><span>{player.name}<small>{preview ? 'PREVIEW STATS' : 'PLAYER'}</small></span></button></th><td><span className="ml-table-team"><Crest team={teamFor(player)} /><span>{cleanName(player.team)}</span></span></td>{columns.map(c => <td className={activeStat.key === c.key ? 'ml-stat-selected' : ''} key={c.key}>{player[c.key] || 0}</td>)}<td>{player.gamesPlayed}</td><td><button className="ml-icon-button" aria-label={`View ${player.name} statistics`} onClick={() => setSelected(player)}><ArrowUpRight size={17} /></button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={columns.length + 4} className="ml-table-empty">No players found. Try another name or family.</td></tr>}</tbody></table></div>
        {filtered.length > limit && <button className="ml-load-more" onClick={() => setLimit(n => n + 10)}>More of the lineup <ArrowDown size={16} /></button>}<p className="ml-caption">Ranked by {activeStat.label.toLowerCase()} · {preview ? 'All totals shown are samples.' : 'Current championship totals.'} Select a player for their breakdown.</p>
      </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className={`ml-dialog ml-palette-${palette} ${fontClassName}`}><DialogHeader className="ml-dialog-header"><p className="ml-eyebrow">{preview ? 'SAMPLE PLAYER STATISTICS' : 'CURRENT CHAMPIONSHIP'}</p><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected ? cleanName(selected.team) : ''} · {selected?.gamesPlayed} matches played</DialogDescription></DialogHeader>{selected && <div className="ml-dialog-body"><div className="ml-player-stat-grid">{columns.map(c => <div key={c.key}><strong>{selected[c.key] || 0}</strong><span>{c.label}</span><small>{((selected[c.key] || 0) / Math.max(1, selected.gamesPlayed)).toFixed(1)} per match</small></div>)}</div>{preview && <p>These totals are sample data for design review.</p>}</div>}</DialogContent></Dialog>
  </section>;
}
