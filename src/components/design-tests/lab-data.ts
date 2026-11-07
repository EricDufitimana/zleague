'use client';
import { useQuery } from '@tanstack/react-query';
import type { Family } from '@/lib/grades';

export type Sport = 'football' | 'basketball' | 'volleyball';
export type StatusFilter = 'all' | 'live' | 'upcoming' | 'played';
export type Palette = 'orvena' | 'electric' | 'courtside';
export interface Team { id: number; name: string; grade: string; gender?: string }
export interface Match {
  preview?: boolean;
  id: number; sport_type: Sport; status: string; team_a_id: number; team_b_id: number;
  teamA: Team; teamB: Team; team_a_score: number | null; team_b_score: number | null;
  winner_id: number | null; match_time: string | null; created_at: string; group_id?: number | null;
  penalty_score?: { team_a: number; team_b: number } | null;
  boys_stage_groups?: string | null; girls_stage_groups?: string | null;
  championship?: { id: number; name: string; status: string };
}
export interface PlayerScore {
  id: number; team_id: number; player_id?: number | null;
  player?: { first_name: string; last_name: string } | null;
  points?: number; rebounds?: number; assists?: number; goals?: number; shots_on_target?: number; saves?: number;
  sets?: { setNumber: number; points: number }[];
}
export const SPORTS: { id: Sport; label: string; number: string }[] = [
  { id: 'football', label: 'Football', number: '01' },
  { id: 'basketball', label: 'Basketball', number: '02' },
  { id: 'volleyball', label: 'Volleyball', number: '03' },
];
export const PALETTES: { id: Palette; name: string; color: string }[] = [
  { id: "orvena", name: "Studio", color: "#ff5b1f" },
  { id: "electric", name: "Electric", color: "#3448ef" },
  { id: "courtside", name: "Courtside", color: "#147552" },
];
export const cleanName = (name?: string) => (name || 'To be announced').replaceAll('_', ' ');
export const initials = (name: string) => cleanName(name).replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
export const hasScore = (match: Match) => match.status === 'live' || match.status === 'played';
export const isUpcoming = (match: Match) => match.status === 'scheduled' || match.status === 'not_yet_scheduled';
export const isShootout = (match: Match) => match.sport_type === 'football' && match.status === 'played' && match.team_a_score === match.team_b_score &&
  !!match.penalty_score && match.penalty_score.team_a !== match.penalty_score.team_b;
export function matchDate(match: Match, withTime = true) {
  if (!match.match_time) return match.status === 'played' ? 'Full time' : 'Time to be announced';
  return new Date(match.match_time).toLocaleString('en-GB', { day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
export function stageLabel(match: Match) {
  if (match.group_id) return 'Group stage';
  const stage = match.boys_stage_groups || match.girls_stage_groups;
  return stage === 'finals' ? 'The final' : stage === 'semi-finals' ? 'Semifinals' : stage === 'quarter-finals' ? 'Quarterfinals' : 'Opening round';
}

export function withPreviewScores(matches: Match[]): Match[] {
  const indexBySport: Record<Sport, number> = { football: 0, basketball: 0, volleyball: 0 };
  return matches.map(match => {
    const index = indexBySport[match.sport_type]++ % 6;
    const status = index === 0 ? 'live' : index === 3 || index === 5 ? 'not_yet_scheduled' : 'played';
    const examples: Record<Sport, number[][]> = {
      football: [[2, 1], [1, 1], [0, 3], [0, 0], [3, 1], [0, 0]],
      basketball: [[48, 42], [67, 61], [55, 62], [0, 0], [72, 59], [0, 0]],
      volleyball: [[1, 1], [2, 1], [0, 2], [0, 0], [2, 0], [0, 0]],
    };
    const [a, b] = examples[match.sport_type][index];
    const penalty = match.sport_type === 'football' && index === 1;
    return { ...match, preview: true, status, team_a_score: isUpcoming({ ...match, status }) ? null : a,
      team_b_score: isUpcoming({ ...match, status }) ? null : b,
      winner_id: status === 'played' ? (penalty || b > a ? match.team_b_id : match.team_a_id) : null,
      penalty_score: penalty ? { team_a: 4, team_b: 5 } : null };
  });
}
export function useLabFixtures() {
  return useQuery<Match[]>({ queryKey: ['design-lab-matches'], queryFn: async () => {
    const response = await fetch('/api/matches?ongoing_only=true', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load fixtures.');
    const data = await response.json();
    return (data.matches || []).filter((match: Match) => match.team_a_id && match.team_b_id && match.teamA && match.teamB);
  }, staleTime: 10000, refetchInterval: 15000, retry: 1 });
}
export function useLabFamilies() {
  return useQuery<Family[]>({ queryKey: ['design-lab-families'], queryFn: async () => {
    const response = await fetch('/api/families');
    if (!response.ok) throw new Error('Could not load families.');
    return (await response.json()).families || [];
  }, staleTime: 60000, retry: 1 });
}
