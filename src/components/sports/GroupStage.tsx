'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Loader2, Shuffle, Trophy, X } from 'lucide-react';
import { calculateStandings, type GroupSport, type GroupTeam, type TournamentGroup, wonOnPenalties } from '@/lib/group-stage';
import './group-stage.css';

interface Props { sport: GroupSport; championshipId?: number; teams?: GroupTeam[]; editable?: boolean; onFinalized?: () => void }

export function GroupStage({ sport, championshipId, teams = [], editable = false, onFinalized }: Props) {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draw, setDraw] = useState<number[]>(Array(6).fill(0));
  const [orders, setOrders] = useState<Record<string, number[]>>({});
  const [review, setReview] = useState(false);
  const [detail, setDetail] = useState('');
  const [notice, setNotice] = useState('');
  const activeKey = useRef('');
  const lastResults = useRef('');
  activeKey.current = `${sport}:${championshipId}`;
  const load = useCallback(async () => {
    const key = `${sport}:${championshipId}`;
    try {
      const response = await fetch(`/api/groups?sport=${sport}${championshipId ? `&championship_id=${championshipId}` : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (key !== activeKey.current) return;
      if (!response.ok) throw new Error(data.error || 'Could not load standings.');
      const snapshot = JSON.stringify(data.groups.map((g: TournamentGroup) => g.matches.map(m => [m.id, m.status, m.winner_id, m.team_a_score, m.team_b_score])));
      if (lastResults.current !== snapshot) { setOrders({}); setReview(false); lastResults.current = snapshot; }
      setGroups(data.groups); setError('');
    } catch (e) { if (key === activeKey.current) setError(e instanceof Error ? e.message : 'Could not load standings.'); }
    finally { if (key === activeKey.current) setLoading(false); }
  }, [sport, championshipId]);
  useEffect(() => {
    setLoading(true); setGroups([]); setDraw(Array(6).fill(0)); setOrders({}); setReview(false); setDetail(''); setNotice('');
    void load(); const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function mutate(method: 'POST' | 'PATCH') {
    const key = `${sport}:${championshipId}`;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/groups', { method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championship_id: championshipId, sport, group_a: draw.slice(0, 3), group_b: draw.slice(3), orders }) });
      const data = await response.json();
      if (key !== activeKey.current) return;
      if (!response.ok) throw new Error(data.error || 'Could not save the group stage.');
      setGroups(data.groups); setReview(false);
      setNotice(method === 'POST' ? 'Groups saved. All six fixtures are ready to schedule.' : 'Group stage finalized. Semifinals and the final are ready.');
      if (method === 'PATCH') onFinalized?.();
    } catch (e) { if (key === activeKey.current) setError(e instanceof Error ? e.message : 'Could not save the group stage.'); }
    finally { setBusy(false); }
  }

  function shuffle() {
    const ids = teams.map(t => t.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setDraw(ids.slice(0, 6));
  }

  const played = groups.flatMap(g => g.matches).filter(m => m.status === 'played').length;
  const completed = groups.length === 2 && groups.every(g => g.matches.length === 3 && g.matches.every(m => m.status === 'played' && m.winner_id));
  const finalized = groups.length > 0 && groups.every(g => g.finalized);
  const unresolved = completed && groups.some(g => !orders[g.name] && calculateStandings(g.teams, g.matches).some(row => row.tied));
  const football = sport === 'football';

  return <section className="group-stage" aria-label="Boys group stage" aria-busy={loading || busy}>
    <header className="gs-masthead">
      <div><p className="gs-eyebrow">ZLEAGUE / BOYS / {sport}</p><h2>THE GROUP STAGE<span>.</span></h2>
        <p>Two groups. One meeting each. Every match has a winner.</p></div>
      <div className="gs-progress"><strong>{played}<span>/ 6</span></strong><span>matches complete</span>
        <div className="gs-track"><i style={{ width: `${played / 6 * 100}%` }} /></div></div>
    </header>
    <div role="status" aria-live="polite">{notice && <p className="gs-notice">{notice}</p>}</div>
    {error && <p role="alert" className="gs-error">{editable ? error : 'Standings are temporarily unavailable. Please try again shortly.'}</p>}
    {loading ? <div className="gs-empty"><Loader2 className="animate-spin" aria-hidden="true" /> Loading group standings…</div> : <>
      {groups.length === 0 && !error && (editable ? <div className="gs-draw">
        <div className="gs-section-title"><div><p className="gs-eyebrow">01 / THE DRAW</p><h3>Set the starting line.</h3></div>
          <button className="gs-button gs-secondary" onClick={shuffle} disabled={teams.length < 6 || busy}><Shuffle size={16} /> Shuffle teams</button></div>
        <p>Select six boys’ teams for {sport}. Review the groups before creating the six fixtures.</p>
        {teams.length < 6 && <p className="gs-error">Add at least six boys’ teams to this championship first.</p>}
        <div className="gs-grid">{['A', 'B'].map((name, groupIndex) => <fieldset className="gs-draw-group" key={name}>
          <legend>GROUP {name}</legend>{[0, 1, 2].map(slot => {
            const index = groupIndex * 3 + slot;
            return <label key={slot}><span>0{slot + 1}</span><select aria-label={`Group ${name}, team ${slot + 1}`} value={draw[index]} disabled={busy}
              onChange={e => setDraw(previous => previous.map((id, i) => i === index ? Number(e.target.value) : id))}>
              <option value={0}>Choose a team</option>{teams.map(team => <option key={team.id} value={team.id} disabled={draw.includes(team.id) && draw[index] !== team.id}>{team.name}</option>)}
            </select><ChevronDown size={14} aria-hidden="true" /></label>;
          })}</fieldset>)}</div>
        <button className="gs-button" disabled={busy || draw.some(id => !id) || new Set(draw).size !== 6} onClick={() => mutate('POST')}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Create groups & six fixtures</button>
      </div> : <div className="gs-empty">The group draw has not been announced yet.</div>)}
      <div className="gs-grid">{groups.map(group => {
        const standings = calculateStandings(group.teams, group.matches);
        if (group.finalized && group.qualification_order) standings.sort((a, b) => group.qualification_order!.indexOf(a.team.id) - group.qualification_order!.indexOf(b.team.id));
        const ranked = orders[group.name] || standings.map(row => row.team.id);
        return <article className="gs-panel" key={group.id}>
          <header className="gs-panel-header"><div><span className="gs-eyebrow">ROUND ROBIN</span><h3>Group {group.name}</h3></div>
            <span className="gs-tag">{group.finalized ? 'QUALIFIED' : `${group.matches.filter(m => m.status === 'played').length} / 3 PLAYED`}</span></header>
          <div className="gs-table-scroll"><table className="gs-table"><caption className="sr-only">Group {group.name} standings. Most recent result on the right.</caption>
            <thead><tr><th scope="col">TEAM</th>{['MP', 'W', 'L', ...(football ? ['GD', 'PTS'] : []), 'LAST 3'].map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
            <tbody>{standings.map((row, index) => <tr key={row.team.id} className={group.finalized && ranked.indexOf(row.team.id) < 2 ? 'gs-qualified' : ''}>
              <th scope="row"><span className="gs-rank">{row.tied && completed && !group.finalized ? '=' : index + 1}</span><span>{row.team.name.replaceAll('_', ' ')}</span></th>
              <td>{row.mp}</td><td>{row.wins}</td><td>{row.losses}</td>{football && <><td>{row.difference > 0 ? '+' : ''}{row.difference}</td><td className="gs-points">{row.points}</td></>}
              <td><div className="gs-form">{Array.from({ length: 3 - row.form.length }, (_, i) => <span className="gs-result gs-unplayed" key={`empty-${i}`} aria-label="No match">—</span>)}
                {row.form.map(result => <button key={result.matchId} className={`gs-result ${result.won ? 'gs-win' : 'gs-loss'} ${result.penalties ? 'gs-pens' : ''}`} title={result.label} aria-label={result.label}
                  onClick={() => setDetail(result.label)}>{result.won ? <Check size={13} /> : <X size={13} />}{result.penalties && <span>P</span>}</button>)}
              </div></td></tr>)}</tbody></table></div>
          <div className="gs-fixtures"><p className="gs-eyebrow">THE MATCHES</p>{group.matches.map(match => {
            const a = group.teams.find(t => t.id === match.team_a_id), b = group.teams.find(t => t.id === match.team_b_id);
            const pens = wonOnPenalties(match);
            return <div className="gs-fixture" key={match.id}><div className="gs-fixture-line">
              <span className={match.winner_id === a?.id ? 'gs-winner' : ''}>{a?.name.replaceAll('_', ' ')}</span>
              <strong>{match.status === 'played' || match.status === 'live' ? `${match.team_a_score ?? 0} – ${match.team_b_score ?? 0}` : 'VS'}</strong>
              <span className={match.winner_id === b?.id ? 'gs-winner' : ''}>{b?.name.replaceAll('_', ' ')}</span></div>
              <div className="gs-fixture-meta">{pens ? <span className="gs-penalty-badge">{group.teams.find(t => t.id === match.winner_id)?.name} won on penalties · {match.penalty_score!.team_a}–{match.penalty_score!.team_b}</span>
                : <span>{match.status === 'played' ? 'FULL TIME' : match.status === 'live' ? 'LIVE' : match.match_time ? new Date(match.match_time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'TO BE SCHEDULED'}</span>}</div>
            </div>;
          })}</div>
          {editable && completed && !finalized && standings.some(row => row.tied) && <div className="gs-tiebreak"><h4>Resolve the remaining tie</h4><p>Points, score difference and head-to-head are equal. Set the official order; other rankings cannot be changed.</p>
            {ranked.map((id, index) => <label key={index}>{index + 1}<select aria-label={`Group ${group.name} position ${index + 1}`} value={id} onChange={e => {
              const next = [...ranked], swapIndex = next.indexOf(Number(e.target.value));
              [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
              setOrders(previous => ({ ...previous, [group.name]: next }));
            }}>{standings.map(row => <option value={row.team.id} key={row.team.id}>{row.team.name}</option>)}</select></label>)}
            <button className="gs-button gs-secondary mt-3" onClick={() => setOrders(previous => ({ ...previous, [group.name]: ranked }))}>
              <Check size={16} />{orders[group.name] ? 'Official order confirmed' : 'Use this official order'}
            </button>
          </div>}
        </article>;
      })}</div>
      {detail && <div className="gs-detail" role="status"><span>{detail}</span><button onClick={() => setDetail('')} aria-label="Close result details"><X size={16} /></button></div>}
      {groups.length > 0 && <footer className="gs-footer"><span><i className="gs-key" /> W = win · L = loss · P = penalties. Newest result on the right.</span>
        <span>{football ? 'Win = 3 pts. Shootouts do not affect GD.' : 'Ranked by wins, then score difference and head-to-head.'}</span></footer>}
      {editable && groups.length > 0 && <div className="gs-qualification"><Trophy size={22} /><div><h3>{finalized ? 'The knockout stage is ready.' : 'Next stop: the semifinals.'}</h3>
        <p>{finalized ? 'Group results are locked. Schedule the semifinals in Schedule.' : unresolved ? 'Confirm the official order in each tied group before reviewing qualifiers.' : 'A1 vs B2 · B1 vs A2. Complete every group fixture before confirming qualification.'}</p>
        {review && <div className="gs-review">{[[0, 1], [1, 0]].map(([aIndex, bIndex], i) => {
          const a = groups.find(g => g.name === 'A')!, b = groups.find(g => g.name === 'B')!;
          const idsA = orders.A || calculateStandings(a.teams, a.matches).map(r => r.team.id);
          const idsB = orders.B || calculateStandings(b.teams, b.matches).map(r => r.team.id);
          return <p key={i}>Semifinal {i + 1}: {a.teams.find(t => t.id === idsA[aIndex])?.name} vs {b.teams.find(t => t.id === idsB[bIndex])?.name}</p>;
        })}<p>Confirming locks the group results and creates both semifinals and the final.</p></div>}
      </div>{!finalized && <button className="gs-button" disabled={!completed || unresolved || busy} onClick={() => review ? mutate('PATCH') : setReview(true)}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}{review ? 'Confirm qualification' : 'Review qualifiers'}</button>}</div>}
    </>}
  </section>;
}
