"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Calendar, Users, Target, CheckCircle, AlertCircle, Clock, BarChart3, Loader2, Play, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { gradeBadgeClasses, isTeamStatsOnlyGrade } from '@/lib/grades';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { OperationsHeading, useDashboard, useAdminMatches } from '@/components/operations/DashboardShell';

interface Championship {
  id: number;
  name: string;
  status: string;
}

interface Team {
  id: number;
  name: string;
  grade: string;
  gender?: string;
}

interface Match {
  id: number;
  team_a_id: number;
  team_b_id: number;
  championship_id: number;
  sport_type: string;
  match_time?: string;
  status: string;
  winner_id?: number;
  penalty_score?: { team_a: number; team_b: number } | null;
  teamA: Team;
  teamB: Team;
  championship: Championship;
}

interface BasketballScore {
  team_id: number;
  points: number;
  rebounds: number;
  assists: number;
  player_id?: number;
}

interface FootballScore {
  team_id: number;
  goals: number;
  assists: number;
  shots_on_target?: number;
  saves?: number;
  player_id?: number;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  team_id: number;
}

export default function RecordPage() {
  const dashboard = useDashboard();
  const matchQuery = useAdminMatches(false);
  const recordQuery = useSearchParams();
  const cache = useQueryClient();
  const consumedMatch = useRef('');
  const loadVersion = useRef(0);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingError, setExistingError] = useState('');
  const [selectedChampionship, setSelectedChampionship] = useState<string>("");
  const [allMatches, setAllMatches] = useState<Match[]>([]); // Store all matches from all championships
  const [matches, setMatches] = useState<Match[]>([]); // Filtered matches based on selected championship
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [selectedMatchData, setSelectedMatchData] = useState<Match | null>(null);
  const [winningTeam, setWinningTeam] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [basketballScores, setBasketballScores] = useState<{
    teamA: BasketballScore;
    teamB: BasketballScore;
  }>({
    teamA: { team_id: 0, points: 0, rebounds: 0, assists: 0 },
    teamB: { team_id: 0, points: 0, rebounds: 0, assists: 0 }
  });
  
  const [footballScores, setFootballScores] = useState<{
    teamA: FootballScore;
    teamB: FootballScore;
  }>({
    teamA: { team_id: 0, goals: 0, assists: 0 },
    teamB: { team_id: 0, goals: 0, assists: 0 }
  });
  
  const [volleyballScores, setVolleyballScores] = useState<{
    teamA: { team_id: number; sets: Array<{ setNumber: number; points: number }> };
    teamB: { team_id: number; sets: Array<{ setNumber: number; points: number }> };
  }>({
    teamA: { team_id: 0, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] },
    teamB: { team_id: 0, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] }
  });
  
  const [individualStats, setIndividualStats] = useState<{
    teamA: Array<{ player_id: number; points: number; rebounds: number; assists: number }>;
    teamB: Array<{ player_id: number; points: number; rebounds: number; assists: number }>;
  }>({
    teamA: [],
    teamB: []
  });
  
  const [footballIndividualStats, setFootballIndividualStats] = useState<{
    teamA: Array<{ player_id: number; goals: number; assists: number; shots_on_target: number; saves: number }>;
    teamB: Array<{ player_id: number; goals: number; assists: number; shots_on_target: number; saves: number }>;
  }>({
    teamA: [],
    teamB: []
  });
  const [selectedTeamForStats, setSelectedTeamForStats] = useState<'teamA' | 'teamB' | 'both'>('both');
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  // Penalty scores state: { team_a: number, team_b: number } or null
  const [penaltyScores, setPenaltyScores] = useState<{ team_a: number; team_b: number } | null>(null);
  const [showPenaltyDialog, setShowPenaltyDialog] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<{
    teamA: number[];
    teamB: number[];
  }>({
    teamA: [],
    teamB: []
  });
  // ✅ EY player names state: { teamId: Array<{firstName: string, lastName: string}> }
  const [eyPlayerNames, setEyPlayerNames] = useState<{
    [teamId: number]: Array<{ firstName: string; lastName: string }>;
  }>({});
  const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    teamAPoints: boolean;
    teamBPoints: boolean;
    teamARebounds: boolean;
    teamBRebounds: boolean;
    teamAAssists: boolean;
    teamBAssists: boolean;
    teamAGoals: boolean;
    teamBGoals: boolean;
    teamAAssistsFootball: boolean;
    teamBAssistsFootball: boolean;
  }>({
    teamAPoints: false,
    teamBPoints: false,
    teamARebounds: false,
    teamBRebounds: false,
    teamAAssists: false,
    teamBAssists: false,
    teamAGoals: false,
    teamBGoals: false,
    teamAAssistsFootball: false,
    teamBAssistsFootball: false
  });

  const isFetchingMatches = matchQuery.isPending;
  
  // Reuse the workspace selection and fetch only this championship.
  useEffect(() => {
    setSelectedChampionship(dashboard.championship ? String(dashboard.championship.id) : '');
  }, [dashboard.championship?.id]);
  useEffect(() => {
    setAllMatches((matchQuery.data || []).filter(m => m.team_a_id && m.team_b_id && m.teamA && m.teamB) as unknown as Match[]);
  }, [matchQuery.data]);
  useEffect(() => { setSelectedMatch(''); setSelectedMatchData(null); }, [selectedChampionship]);
  useEffect(() => {
    const id = recordQuery.get('match_id');
    const key = `${selectedChampionship}:${id}`;
    if (id && consumedMatch.current !== key && matches.some(m => String(m.id) === id)) { consumedMatch.current = key; setSelectedMatch(id); }
  }, [recordQuery, selectedChampionship, matches]);

  // Filter matches when championship changes (no fetching, just filtering)
  useEffect(() => {
    console.log('🔄 Championship selection changed:', selectedChampionship);
    
    if (selectedChampionship && allMatches.length > 0) {
      console.log('🔍 Filtering matches for championship:', selectedChampionship);
      const filtered = allMatches.filter(
        match => match.championship_id.toString() === selectedChampionship
      );
      console.log('✅ Filtered matches:', filtered.length);
      setMatches(filtered);
      
    } else if (selectedChampionship && allMatches.length === 0) {
      // If matches haven't loaded yet, show empty
      console.log('⏳ Waiting for matches to load...');
      setMatches([]);
    } else {
      console.log('🧹 Clearing matches data (no championship selected)');
      setMatches([]);
      setSelectedMatch("");
      setSelectedMatchData(null);
    }
  }, [selectedChampionship, allMatches]);

  // Ignore responses for a fixture that is no longer selected.
  useEffect(() => {
    const version = ++loadVersion.current;
    setLoadingExisting(false); setExistingError(''); setPlayers([]);
    if (selectedMatch && matches.length > 0) {
      const match = matches.find(m => m.id.toString() === selectedMatch);
      if (match) {
        setSelectedMatchData(match);
        
        // Reset form data
        setBasketballScores({
          teamA: { team_id: match.team_a_id, points: 0, rebounds: 0, assists: 0 },
          teamB: { team_id: match.team_b_id, points: 0, rebounds: 0, assists: 0 }
        });
        setFootballScores({
          teamA: { team_id: match.team_a_id, goals: 0, assists: 0 },
          teamB: { team_id: match.team_b_id, goals: 0, assists: 0 }
        });
        setVolleyballScores({
          teamA: { team_id: match.team_a_id, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] },
          teamB: { team_id: match.team_b_id, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] }
        });
        setWinningTeam("");
        setIndividualStats({ teamA: [], teamB: [] });
        setPenaltyScores(null);
        setFootballIndividualStats({ teamA: [], teamB: [] });
        setSelectedPlayers({ teamA: [], teamB: [] });
        setEyPlayerNames({}); // Reset EY player names
        
        // Fetch players for both teams
        fetchPlayers(match.team_a_id, match.team_b_id, version);
        
        // If match is already played, load existing data
        if (match.status === 'played' || match.status === 'live') {
          loadExistingMatchData(match.id, match, version);
        }
      }
    } else {
      setSelectedMatchData(null);
      setPlayers([]);
      setIndividualStats({ teamA: [], teamB: [] });
      setFootballIndividualStats({ teamA: [], teamB: [] });
      setSelectedPlayers({ teamA: [], teamB: [] });
    }
  }, [selectedMatch, matches]);

  const fetchPlayers = async (teamAId: number, teamBId: number, version = loadVersion.current) => {
    setIsLoadingPlayers(true);
    try {
      console.log('🎯 Fetching players for teams:', { teamAId, teamBId });
      const response = await fetch(`/api/players?team_a_id=${teamAId}&team_b_id=${teamBId}`);
      if (version !== loadVersion.current) return;
      console.log('📡 Players API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        if (version !== loadVersion.current) return;
        console.log('👥 Players data received:', data);
        console.log('👥 Total players:', data?.length || 0);
        
        // Ensure data is an array
        const playersArray = Array.isArray(data) ? data : [];
        setPlayers(playersArray);
        
        // Participant selection creates only the statistic fields that are needed.
      } else {
        console.error('❌ Players API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Players error response body:', errorText);
        setPlayers([]);
      }
    } catch (error) {
      if (version !== loadVersion.current) return;
      console.error('💥 Error fetching players:', error);
      console.error('💥 Players error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setPlayers([]);
    } finally {
      if (version === loadVersion.current) setIsLoadingPlayers(false);
    }
  };

  const loadExistingMatchData = async (matchId: number, match: Match, version: number) => {
    const selectedMatchData = match;
    setLoadingExisting(true); setExistingError('');
    try {
      console.log('🔄 Loading existing match data for match ID:', matchId);
      
      // Fetch existing basketball scores if it's a basketball match
      if (selectedMatchData?.sport_type === 'basketball') {
        const scoresResponse = await fetch(`/api/basketball-scores?match_id=${matchId}`);
        if (!scoresResponse.ok) throw new Error('Could not load the saved statistics. Please retry before editing.');
        if (scoresResponse.ok) {
          const scorePayload = await scoresResponse.json();
          if (version !== loadVersion.current) return;
          const scoresData = Array.isArray(scorePayload) ? scorePayload : scorePayload.scores || [];
          console.log('📊 Existing basketball scores data:', scoresData);
          
          if (!scoresData.length) throw new Error('No saved statistics were found for this result. Please retry before editing.');
          if (scoresData && scoresData.length > 0) {
            // Separate team and individual scores
            const teamScores = scoresData.filter((score: any) => !score.player_id);
            const individualScores = scoresData.filter((score: any) => score.player_id);
            
            if (!teamScores.some((score: { team_id: number }) => score.team_id === match.team_a_id) || !teamScores.some((score: { team_id: number }) => score.team_id === match.team_b_id)) throw new Error('The saved team statistics are incomplete. Reload them before editing this result.');
            // Update team scores
            if (teamScores.length >= 2) {
              const teamAScore = teamScores.find((s: any) => s.team_id === selectedMatchData?.team_a_id);
              const teamBScore = teamScores.find((s: any) => s.team_id === selectedMatchData?.team_b_id);
              
              if (teamAScore && teamBScore) {
                setBasketballScores({
                  teamA: { 
                    team_id: teamAScore.team_id, 
                    points: teamAScore.points, 
                    rebounds: teamAScore.rebounds, 
                    assists: teamAScore.assists 
                  },
                  teamB: { 
                    team_id: teamBScore.team_id, 
                    points: teamBScore.points, 
                    rebounds: teamBScore.rebounds, 
                    assists: teamBScore.assists 
                  }
                });
              }
            }
            
            // Update individual stats
            if (individualScores.length > 0) {
              const teamAStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_a_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  points: score.points,
                  rebounds: score.rebounds,
                  assists: score.assists,
                  shots_on_target: score.shots_on_target || 0, saves: score.saves || 0
                }));
              
              const teamBStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_b_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  points: score.points,
                  rebounds: score.rebounds,
                  assists: score.assists,
                  shots_on_target: score.shots_on_target || 0, saves: score.saves || 0
                }));
              
              setIndividualStats({
                teamA: teamAStats,
                teamB: teamBStats
              });
              
              // Set selected players based on who has stats
              setSelectedPlayers({
                teamA: teamAStats.map((stat: { player_id: number; points: number; rebounds: number; assists: number }) => stat.player_id),
                teamB: teamBStats.map((stat: { player_id: number; points: number; rebounds: number; assists: number }) => stat.player_id)
              });
            }
          }
        }
      }

      // Fetch existing football scores if it's a football match
      if (selectedMatchData?.sport_type === 'football') {
        const scoresResponse = await fetch(`/api/football-scores?match_id=${matchId}`);
        if (!scoresResponse.ok) throw new Error('Could not load the saved statistics. Please retry before editing.');
        if (scoresResponse.ok) {
          const scorePayload = await scoresResponse.json();
          if (version !== loadVersion.current) return;
          const scoresData = Array.isArray(scorePayload) ? scorePayload : scorePayload.scores || [];
          console.log('⚽ Existing football scores data:', scoresData);
          
          if (!scoresData.length) throw new Error('No saved statistics were found for this result. Please retry before editing.');
          if (scoresData && scoresData.length > 0) {
            // Separate team and individual scores
            const teamScores = scoresData.filter((score: any) => !score.player_id);
            const individualScores = scoresData.filter((score: any) => score.player_id);
            
            if (!teamScores.some((score: { team_id: number }) => score.team_id === match.team_a_id) || !teamScores.some((score: { team_id: number }) => score.team_id === match.team_b_id)) throw new Error('The saved team statistics are incomplete. Reload them before editing this result.');
            // Update team scores
            if (teamScores.length >= 2) {
              const teamAScore = teamScores.find((s: any) => s.team_id === selectedMatchData?.team_a_id);
              const teamBScore = teamScores.find((s: any) => s.team_id === selectedMatchData?.team_b_id);
              
              if (teamAScore && teamBScore) {
                setFootballScores({
                  teamA: { 
                    team_id: teamAScore.team_id, 
                    goals: teamAScore.goals, 
                    assists: teamAScore.assists 
                  },
                  teamB: { 
                    team_id: teamBScore.team_id, 
                    goals: teamBScore.goals, 
                    assists: teamBScore.assists 
                  }
                });
              }
            }
            
            // Update individual stats
            if (individualScores.length > 0) {
              const teamAStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_a_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  goals: score.goals,
                  assists: score.assists,
                  shots_on_target: score.shots_on_target || 0, saves: score.saves || 0
                }));
              
              const teamBStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_b_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  goals: score.goals,
                  assists: score.assists,
                  shots_on_target: score.shots_on_target || 0, saves: score.saves || 0
                }));
              
              setFootballIndividualStats({
                teamA: teamAStats,
                teamB: teamBStats
              });
              
              // Set selected players based on who has stats
              setSelectedPlayers({
                teamA: teamAStats.map((stat: { player_id: number; goals: number; assists: number }) => stat.player_id),
                teamB: teamBStats.map((stat: { player_id: number; goals: number; assists: number }) => stat.player_id)
              });
            }
          }
        }
      }
      
      // Fetch existing volleyball scores if it's a volleyball match
      if (selectedMatchData?.sport_type === 'volleyball') {
        const scoresResponse = await fetch(`/api/volleyball-scores?match_id=${matchId}`);
        if (!scoresResponse.ok) throw new Error('Could not load the saved statistics. Please retry before editing.');
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          if (version !== loadVersion.current) return;
          console.log('🏐 Existing volleyball scores data:', scoresData);
          
          if (!scoresData.scores?.some((score: { team_id: number }) => score.team_id === match.team_a_id) || !scoresData.scores?.some((score: { team_id: number }) => score.team_id === match.team_b_id)) throw new Error('The saved set scores are incomplete. Reload them before editing this result.');
          if (scoresData && scoresData.scores && scoresData.scores.length > 0) {
            const teamAScore = scoresData.scores.find((score: any) => score.team_id === selectedMatchData?.team_a_id);
            const teamBScore = scoresData.scores.find((score: any) => score.team_id === selectedMatchData?.team_b_id);
            
            if (teamAScore) {
              // Handle sets JSONB format
              let sets: Array<{ setNumber: number; points: number }> = [];
              if (teamAScore.sets && Array.isArray(teamAScore.sets)) {
                sets = teamAScore.sets;
              }
              
              setVolleyballScores(prev => ({
                ...prev,
                teamA: {
                  team_id: teamAScore.team_id,
                  sets: sets.length > 0 ? sets : [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }]
                }
              }));
            }
            
            if (teamBScore) {
              // Handle sets JSONB format
              let sets: Array<{ setNumber: number; points: number }> = [];
              if (teamBScore.sets && Array.isArray(teamBScore.sets)) {
                sets = teamBScore.sets;
              }
              
              setVolleyballScores(prev => ({
                ...prev,
                teamB: {
                  team_id: teamBScore.team_id,
                  sets: sets.length > 0 ? sets : [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }]
                }
              }));
            }
          }
        }
      }
      
      // Set winning team if match has a winner
      if (selectedMatchData?.winner_id) {
        setWinningTeam(selectedMatchData.winner_id.toString());
      }
      
      // Load penalty scores if they exist
      const matchData = selectedMatchData as Match & { penalty_score?: { team_a: number; team_b: number } | null };
      if (matchData?.penalty_score && typeof matchData.penalty_score === 'object') {
        const penalty = matchData.penalty_score as { team_a: number; team_b: number };
        setPenaltyScores({
          team_a: penalty.team_a || 0,
          team_b: penalty.team_b || 0
        });
      } else {
        setPenaltyScores(null);
      }
      
    } catch (error) {
      if (version !== loadVersion.current) return;
      setExistingError(error instanceof Error ? error.message : 'Saved statistics could not be loaded.');
      console.error('Error loading existing match data:', error);
    } finally { if (version === loadVersion.current) setLoadingExisting(false); }
  };

  // ✅ Check if teams are EY grade
  const isEYMatch = isTeamStatsOnlyGrade(selectedMatchData?.teamA?.grade) || isTeamStatsOnlyGrade(selectedMatchData?.teamB?.grade);

  const handlePlayerSelection = async () => {
    try {
      setIsCreatingPlayers(true);
      
      // ✅ If EY match, create players first from typed names
      if (isEYMatch && selectedMatchData) {
        const eyPlayersToCreate: Array<{ teamId: string; firstName: string; lastName: string }> = [];
        
        // Collect EY players from both teams
        Object.entries(eyPlayerNames).forEach(([teamIdStr, names]) => {
          const teamId = parseInt(teamIdStr);
          names.forEach(name => {
            if (name.firstName.trim() && name.lastName.trim()) {
              eyPlayersToCreate.push({
                teamId: teamId.toString(),
                firstName: name.firstName.trim(),
                lastName: name.lastName.trim()
              });
            }
          });
        });

        if (eyPlayersToCreate.length > 0) {
          // Create players via API
          const createResponse = await fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              players: eyPlayersToCreate.map(p => ({
                teamId: p.teamId,
                firstName: p.firstName,
                lastName: p.lastName
              }))
            })
          });

          if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.error || 'Failed to create players');
          }

          const { players: createdPlayers } = await createResponse.json();
          
          // Add created players to selected players
          const newPlayerIds = createdPlayers.map((p: any) => p.id);
          setSelectedPlayers(prev => {
            const updated = { ...prev };
            createdPlayers.forEach((p: any) => {
              const teamKey = p.team_id === selectedMatchData.team_a_id ? 'teamA' : 'teamB';
              if (!updated[teamKey].includes(p.id)) {
                updated[teamKey] = [...updated[teamKey], p.id];
              }
            });
            return updated;
          });

          // Refresh players list
          await fetchPlayers(selectedMatchData.team_a_id, selectedMatchData.team_b_id);
          
          // Wait a bit for the query to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Filter individual stats to only show selected players
      const filteredStats = {
        teamA: individualStats.teamA.filter(stat => selectedPlayers.teamA.includes(stat.player_id)),
        teamB: individualStats.teamB.filter(stat => selectedPlayers.teamB.includes(stat.player_id))
      };
      
      // Also initialize stats for newly selected players that don't have stats yet
      const allSelectedTeamA = selectedPlayers.teamA;
      const allSelectedTeamB = selectedPlayers.teamB;
      
      const teamAPlayersToAdd = allSelectedTeamA.filter(id => !(selectedMatchData?.sport_type === 'football' ? footballIndividualStats.teamA : filteredStats.teamA).some(stat => stat.player_id === id));
      const teamBPlayersToAdd = allSelectedTeamB.filter(id => !(selectedMatchData?.sport_type === 'football' ? footballIndividualStats.teamB : filteredStats.teamB).some(stat => stat.player_id === id));
      
      if (selectedMatchData?.sport_type === 'basketball') {
        setIndividualStats({
          teamA: [
            ...filteredStats.teamA,
            ...teamAPlayersToAdd.map(id => ({
              player_id: id,
              points: 0,
              rebounds: 0,
              assists: 0,
            }))
          ],
          teamB: [
            ...filteredStats.teamB,
            ...teamBPlayersToAdd.map(id => ({
              player_id: id,
              points: 0,
              rebounds: 0,
              assists: 0,
            }))
          ]
        });
      } else if (selectedMatchData?.sport_type === 'football') {
        setFootballIndividualStats({
          teamA: [
            ...footballIndividualStats.teamA.filter(stat => allSelectedTeamA.includes(stat.player_id)),
            ...teamAPlayersToAdd.map(id => ({
              player_id: id,
              goals: 0,
              assists: 0,
              shots_on_target: 0,
              saves: 0
            }))
          ],
          teamB: [
            ...footballIndividualStats.teamB.filter(stat => allSelectedTeamB.includes(stat.player_id)),
            ...teamBPlayersToAdd.map(id => ({
              player_id: id,
              goals: 0,
              assists: 0,
              shots_on_target: 0,
              saves: 0
            }))
          ]
        });
      }
      
      // Clear EY names after successful creation
      setEyPlayerNames({});
      setShowPlayerSelector(false);
    } catch (error) {
      console.error('Error creating player score entries:', error);
      alert(error instanceof Error ? error.message : 'Failed to create players');
      // Don't close modal on error so user can fix
    } finally {
      setIsCreatingPlayers(false);
    }
  };

  const togglePlayerSelection = (teamId: number, playerId: number) => {
    setSelectedPlayers(prev => {
      const teamKey = teamId === selectedMatchData?.team_a_id ? 'teamA' : 'teamB';
      const currentSelected = prev[teamKey];
      
      if (currentSelected.includes(playerId)) {
        return {
          ...prev,
          [teamKey]: currentSelected.filter(id => id !== playerId)
        };
      } else {
        return {
          ...prev,
          [teamKey]: [...currentSelected, playerId]
        };
      }
    });
  };

  const validateBasketballStatistics = () => {
    const teamAIndividualPoints = individualStats.teamA.reduce((sum, stat) => sum + stat.points, 0);
    const teamBIndividualPoints = individualStats.teamB.reduce((sum, stat) => sum + stat.points, 0);
    const teamAIndividualRebounds = individualStats.teamA.reduce((sum, stat) => sum + stat.rebounds, 0);
    const teamBIndividualRebounds = individualStats.teamB.reduce((sum, stat) => sum + stat.rebounds, 0);
    const teamAIndividualAssists = individualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0);
    const teamBIndividualAssists = individualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0);
    
    const teamAPointsMatch = basketballScores.teamA.points === teamAIndividualPoints;
    const teamBPointsMatch = basketballScores.teamB.points === teamBIndividualPoints;
    const teamAReboundsMatch = basketballScores.teamA.rebounds === teamAIndividualRebounds;
    const teamBReboundsMatch = basketballScores.teamB.rebounds === teamBIndividualRebounds;
    const teamAAssistsMatch = basketballScores.teamA.assists === teamAIndividualAssists;
    const teamBAssistsMatch = basketballScores.teamB.assists === teamBIndividualAssists;
    
    setValidationErrors(prev => ({
      ...prev,
      teamAPoints: !teamAPointsMatch,
      teamBPoints: !teamBPointsMatch,
      teamARebounds: !teamAReboundsMatch,
      teamBRebounds: !teamBReboundsMatch,
      teamAAssists: !teamAAssistsMatch,
      teamBAssists: !teamBAssistsMatch
    }));
    
    return teamAPointsMatch && teamBPointsMatch && teamAReboundsMatch && teamBReboundsMatch && teamAAssistsMatch && teamBAssistsMatch;
  };

  const validateFootballStatistics = () => {
    const teamAIndividualGoals = footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.goals, 0);
    const teamBIndividualGoals = footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.goals, 0);
    const teamAIndividualAssists = footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0);
    const teamBIndividualAssists = footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0);
    
    const teamAGoalsMatch = footballScores.teamA.goals === teamAIndividualGoals;
    const teamBGoalsMatch = footballScores.teamB.goals === teamBIndividualGoals;
    const teamAAssistsMatch = footballScores.teamA.assists === teamAIndividualAssists;
    const teamBAssistsMatch = footballScores.teamB.assists === teamBIndividualAssists;
    
    setValidationErrors(prev => ({
      ...prev,
      teamAGoals: !teamAGoalsMatch,
      teamBGoals: !teamBGoalsMatch,
      teamAAssistsFootball: !teamAAssistsMatch,
      teamBAssistsFootball: !teamBAssistsMatch
    }));
    
    return teamAGoalsMatch && teamBGoalsMatch && teamAAssistsMatch && teamBAssistsMatch;
  };

  const validateVolleyballStatistics = () => {
    // Check each set - winner must have at least 25 points and win by 2
    for (const teamASet of volleyballScores.teamA.sets) {
      const teamBSet = volleyballScores.teamB.sets.find(s => s.setNumber === teamASet.setNumber);
      if (!teamBSet) continue;

      if (teamASet.points > 0 || teamBSet.points > 0) {
        // If scores are entered, check if valid
        const winner = teamASet.points > teamBSet.points ? teamASet.points : teamBSet.points;
        const loser = teamASet.points > teamBSet.points ? teamBSet.points : teamASet.points;
        const pointDiff = Math.abs(teamASet.points - teamBSet.points);

        // Winner must have at least 25 points and win by at least 2 points
        if (winner < 25 || pointDiff < 2) {
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!selectedMatchData) {
      setMessage({ type: "error", text: "Please select a match" });
      return;
    }

    if (selectedMatchData.sport_type === 'basketball' && basketballScores.teamA.points === basketballScores.teamB.points) {
      setMessage({ type: 'error', text: 'Basketball cannot finish tied. Record the deciding overtime points.' });
      return;
    }
    if (selectedMatchData.sport_type === 'football' && footballScores.teamA.goals === footballScores.teamB.goals &&
      (!penaltyScores || penaltyScores.team_a === penaltyScores.team_b)) {
      setMessage({ type: 'error', text: 'Enter a decisive penalty shootout score for a tied football match.' });
      setShowPenaltyDialog(true);
      return;
    }
    
    // Check if we need a winning team selection
    // Any tied football score is decided by the shootout, including 1-1, 2-2, etc.
    const isTiedWithPenalties = selectedMatchData.sport_type === 'football' &&
      footballScores.teamA.goals === footballScores.teamB.goals &&
      penaltyScores && 
      (penaltyScores.team_a > 0 || penaltyScores.team_b > 0);
    
    if (!winningTeam && !isTiedWithPenalties) {
      setMessage({ type: "error", text: "Please select a winning team" });
      return;
    }

    if (selectedMatchData.sport_type === 'basketball') {
      if (basketballScores.teamA.points === 0 && basketballScores.teamB.points === 0) {
        setMessage({ type: "error", text: "Please enter scores for both teams" });
        return;
      }
      
      // Validate that team statistics match individual player statistics
      if (!validateBasketballStatistics()) {
        setMessage({ 
          type: "error", 
          text: "Team totals must match the sum of individual player statistics for points, rebounds, and assists. Please check your entries." 
        });
        return;
      }
    }

    if (selectedMatchData.sport_type === 'football') {
      // Allow 0-0 scores if penalties are entered
      const hasPenalties = penaltyScores && (penaltyScores.team_a > 0 || penaltyScores.team_b > 0);
      
      if (footballScores.teamA.goals === 0 && footballScores.teamB.goals === 0 && !hasPenalties) {
        setMessage({ type: "error", text: "Please enter goals for both teams, or enter penalty scores if the match ended 0-0" });
        return;
      }
      
      // If scores are 0-0 and penalties are entered, validate penalties
      if (footballScores.teamA.goals === 0 && footballScores.teamB.goals === 0 && hasPenalties) {
        if (!penaltyScores || (penaltyScores.team_a === 0 && penaltyScores.team_b === 0)) {
          setMessage({ type: "error", text: "Please enter penalty scores for both teams" });
          return;
        }
        // Determine winner based on penalties
        if (penaltyScores.team_a === penaltyScores.team_b) {
          setMessage({ type: "error", text: "Penalty scores cannot be tied. Please enter different penalty scores." });
          return;
        }
      }
      
      // Validate that team statistics match individual player statistics (only if there are goals)
      if (footballScores.teamA.goals > 0 || footballScores.teamB.goals > 0) {
        if (!validateFootballStatistics()) {
          setMessage({ 
            type: "error", 
            text: "Team totals must match the sum of individual player statistics for goals and assists. Please check your entries." 
          });
          return;
        }
      }
    }

    if (selectedMatchData.sport_type === 'volleyball') {
      // Check if at least one set has scores
      const hasScores = volleyballScores.teamA.sets.some(s => s.points > 0) || 
                        volleyballScores.teamB.sets.some(s => s.points > 0);
      
      if (!hasScores) {
        setMessage({ type: "error", text: "Please enter scores for at least one set" });
        return;
      }
      
      // Validate that sets are won correctly (25 points, win by 2)
      if (!validateVolleyballStatistics()) {
        setMessage({ 
          type: "error", 
          text: "Each set must be won with at least 25 points and by a margin of at least 2 points. Please check your scores." 
        });
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Calculate team scores based on sport type
      let teamAScore = 0;
      let teamBScore = 0;
      
      if (selectedMatchData.sport_type === 'basketball') {
        teamAScore = basketballScores.teamA.points;
        teamBScore = basketballScores.teamB.points;
      } else if (selectedMatchData.sport_type === 'football') {
        teamAScore = footballScores.teamA.goals;
        teamBScore = footballScores.teamB.goals;
      } else if (selectedMatchData.sport_type === 'volleyball') {
        // For volleyball, count sets won (team with higher score in each set)
        let teamASetsWon = 0;
        let teamBSetsWon = 0;
        
        for (const teamASet of volleyballScores.teamA.sets) {
          const teamBSet = volleyballScores.teamB.sets.find(s => s.setNumber === teamASet.setNumber);
          if (teamBSet) {
            if (teamASet.points > teamBSet.points) teamASetsWon++;
            else if (teamBSet.points > teamASet.points) teamBSetsWon++;
          }
        }
        
        teamAScore = teamASetsWon;
        teamBScore = teamBSetsWon;
      }

      // Prepare penalty score data if scores are tied and penalty scores exist
      let penaltyScoreData = null;
      let finalWinnerId = winningTeam ? parseInt(winningTeam) : null;
      
      if (selectedMatchData.sport_type === 'football' && 
          teamAScore === teamBScore && 
          penaltyScores && 
          (penaltyScores.team_a > 0 || penaltyScores.team_b > 0)) {
        penaltyScoreData = {
          team_a: penaltyScores.team_a,
          team_b: penaltyScores.team_b
        };
        
        // Determine winner based on penalties when scores are tied
        if (penaltyScores.team_a > penaltyScores.team_b) {
          finalWinnerId = selectedMatchData.team_a_id;
        } else if (penaltyScores.team_b > penaltyScores.team_a) {
          finalWinnerId = selectedMatchData.team_b_id;
        }
      }
      
      // Ensure we have a winner
      if (!finalWinnerId) {
        setMessage({ type: "error", text: "Unable to determine winner. Please check your entries." });
        setIsSubmitting(false);
        return;
      }

      // Update match with winner, status, team scores, and penalty scores
      const matchUpdateBody: any = {
        match_id: selectedMatchData.id,
        winner_id: finalWinnerId,
        status: 'played',
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        penalty_score: penaltyScoreData
      };
      
      if (penaltyScoreData) {
        matchUpdateBody.penalty_score = penaltyScoreData;
      }

      // Keep this match out of completed standings until every stat write succeeds.
      const beginSaveResponse = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: selectedMatchData.id, status: 'live' })
      });

      if (!beginSaveResponse.ok) {
        const data = await beginSaveResponse.json();
        throw new Error(data.error || 'Failed to begin saving the result');
      }

      // If basketball, record scores
      if (selectedMatchData.sport_type === 'basketball') {
        // Combine team scores with individual player stats
        const allScores = [
          ...individualStats.teamA.map(stat => ({
            match_id: selectedMatchData.id,
            team_id: selectedMatchData.team_a_id,
            points: stat.points,
            rebounds: stat.rebounds,
            assists: stat.assists,
            player_id: stat.player_id
          })),
          ...individualStats.teamB.map(stat => ({
            match_id: selectedMatchData.id,
            team_id: selectedMatchData.team_b_id,
            points: stat.points,
            rebounds: stat.rebounds,
            assists: stat.assists,
            player_id: stat.player_id
          }))
        ];

        const scoresResponse = await fetch('/api/basketball-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: selectedMatchData.id,
            scores: allScores
          })
        });

        if (!scoresResponse.ok) {
          throw new Error('Failed to record basketball scores');
        }
      }

      // If football, record scores
      if (selectedMatchData.sport_type === 'football') {
        // Only record individual player stats if there are goals (not 0-0)
        // For 0-0 matches with penalties, we don't need individual stats
        if (teamAScore > 0 || teamBScore > 0) {
          // Combine team scores with individual player stats
          const allScores = [
            ...footballIndividualStats.teamA.map(stat => ({
              match_id: selectedMatchData.id,
              team_id: selectedMatchData.team_a_id,
              goals: stat.goals,
              assists: stat.assists,
              shots_on_target: stat.shots_on_target || 0,
              saves: stat.saves || 0,
              player_id: stat.player_id
            })),
            ...footballIndividualStats.teamB.map(stat => ({
              match_id: selectedMatchData.id,
              team_id: selectedMatchData.team_b_id,
              goals: stat.goals,
              assists: stat.assists,
              shots_on_target: stat.shots_on_target || 0,
              saves: stat.saves || 0,
              player_id: stat.player_id
            }))
          ];

          const scoresResponse = await fetch('/api/football-scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: selectedMatchData.id,
              scores: allScores
            })
          });

          if (!scoresResponse.ok) {
            throw new Error('Failed to record football scores');
          }
        }
        // For 0-0 matches with penalties, we don't need to record individual scores
      }

      // If volleyball, record set scores
      if (selectedMatchData.sport_type === 'volleyball') {
        // Store volleyball set scores with JSONB format
        const volleyballScoresData = [
          {
            match_id: selectedMatchData.id,
            team_id: selectedMatchData.team_a_id,
            sets: volleyballScores.teamA.sets
          },
          {
            match_id: selectedMatchData.id,
            team_id: selectedMatchData.team_b_id,
            sets: volleyballScores.teamB.sets
          }
        ];

        const scoresResponse = await fetch('/api/volleyball-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: selectedMatchData.id,
            scores: volleyballScoresData
          })
        });

        if (!scoresResponse.ok) {
          throw new Error('Failed to record volleyball scores');
        }
      }

      const matchUpdateResponse = await fetch('/api/matches', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(matchUpdateBody)
      });
      if (!matchUpdateResponse.ok) {
        const data = await matchUpdateResponse.json();
        throw new Error(data.error || 'Failed to finish recording the result');
      }

      setMessage({ 
        type: "success", 
        text: selectedMatchData.status === 'played' 
          ? "Match result updated successfully!" 
          : "Match result recorded successfully!" 
      });

      // Reset form
      setSelectedMatch("");
      setSelectedMatchData(null);
      setWinningTeam("");
      setBasketballScores({
        teamA: { team_id: 0, points: 0, rebounds: 0, assists: 0 },
        teamB: { team_id: 0, points: 0, rebounds: 0, assists: 0 }
      });
      
      setFootballScores({
        teamA: { team_id: 0, goals: 0, assists: 0 },
        teamB: { team_id: 0, goals: 0, assists: 0 }
      });
      
      setVolleyballScores({
        teamA: { team_id: 0, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] },
        teamB: { team_id: 0, sets: [{ setNumber: 1, points: 0 }, { setNumber: 2, points: 0 }, { setNumber: 3, points: 0 }] }
      });
      
      setFootballIndividualStats({
        teamA: [],
        teamB: []
      });
      
      setIndividualStats({
        teamA: [],
        teamB: []
      });
      
      setPenaltyScores(null);

      await cache.invalidateQueries({ queryKey: ['admin-matches'] });
      await cache.invalidateQueries({ queryKey: ['design-lab-matches'] });
      await cache.invalidateQueries({ queryKey: ['design-lab-bracket'] });
      await cache.invalidateQueries({ queryKey: ['design-lab-leaders'] });

    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to record match result" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSportIcon = (sportType: string) => {
    switch (sportType) {
      case 'basketball': return '🏀';
      case 'football': return '⚽';
      case 'volleyball': return '🏐';
      default: return '🏆';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'not_yet_scheduled': { label: 'Not Scheduled', variant: 'secondary' as const },
      'scheduled': { label: 'Scheduled', variant: 'default' as const },
      'played': { label: 'Played', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['not_yet_scheduled'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // get the grade badge color
  const getGradeBadgeColor = (grade: string) => gradeBadgeClasses(grade);

  return (
    <div className="space-y-6 op-record-page">
      <OperationsHeading title="Record results" description="Choose the fixture, add the team totals and player stats, then save the result." />
      <div className="op-record-steps" aria-label="Result recording steps"><span aria-current={!selectedMatchData ? "step" : undefined}><i>1</i>Choose a match</span><span aria-current={selectedMatchData ? "step" : undefined}><i>2</i>Scores & players</span><span><i>3</i>Review & save</span></div>
      <div className="op-record-intro"><p>{selectedMatchData ? 'You’re recording this fixture. Check the scores and winner before saving.' : 'Find a fixture below, or choose one from the Match center to open it directly.'}</p><Link href={dashboard.href('/dashboard/schedule')}>Find a fixture <ArrowUpRight size={15} /></Link></div>
      {matchQuery.isError && <div className="op-error" role="alert">Fixtures couldn’t load. <button onClick={() => matchQuery.refetch()}>Try again</button></div>}
      {matchQuery.isPending && dashboard.championship && <p className="op-caption" role="status">Loading this championship’s fixtures…</p>}
      {/* Selection Section */}
    <div className="op-record-select">
            {/* Match Selection */}
            {selectedChampionship && (
              <div className="space-y-2">
                <Label htmlFor="match-select" className="text-sm font-medium">
                  Match
                </Label>
                <div className="flex gap-2">
                  <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                    <SelectTrigger id="match-select" className="flex-1">
                      <SelectValue placeholder="Select a match" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.length == 0 && !isFetchingMatches ?
                      <SelectItem value="loading" disabled>
                          No matches available
                        </SelectItem>
                      : isFetchingMatches ?
                      <SelectItem value="loading" disabled>
                        <Loader2 className="size-4 animate-spin" />
                      </SelectItem>
                      :
                      matches.map((match) => (
                        <SelectItem key={match.id} value={match.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{match.teamA?.name || 'Unknown Team'} vs {match.teamB?.name || 'Unknown Team'}</span>
                            <Badge variant="outline" className="text-xs">
                              {getSportIcon(match.sport_type)} {match.sport_type}
                            </Badge>
                            {getStatusBadge(match.status)}
                            {match.status === 'played' && (
                              <Badge variant="secondary" className="text-xs">Editable</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedMatch && selectedMatchData?.sport_type !== 'volleyball' && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        console.log('🎯 Record Page - Live Score button clicked for match:', selectedMatch);
                        console.log('📊 Record Page - Selected match data:', {
                          id: selectedMatch,
                          sport_type: selectedMatchData?.sport_type,
                          teamA: selectedMatchData?.teamA?.name,
                          teamB: selectedMatchData?.teamB?.name
                        });
                        
                        // Update match status to live
                        try {
                          console.log('🚀 Record Page - Sending PATCH request to update match status to live...');
                          const requestBody = {
                            match_id: selectedMatch,
                            status: 'live',
                          };
                          console.log('📤 Record Page - Request body:', requestBody);
                          
                          const response = await fetch('/api/matches', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody),
                          });
                          
                          console.log('📥 Record Page - Response status:', response.status);
                          console.log('📥 Record Page - Response ok:', response.ok);
                          
                          if (response.ok) {
                            const responseData = await response.json();
                            console.log('✅ Record Page - Success response:', responseData);
                            
                            // Route to the correct livescore page based on sport type
                            const liveScorePath = selectedMatchData?.sport_type === 'football' 
                              ? `/live-score/football/${selectedMatch}`
                              : `/live-score/${selectedMatch}`;
                            
                            console.log('🔗 Record Page - Opening live score page:', liveScorePath);
                            window.open(liveScorePath, '_blank');
                          } else {
                            const errorData = await response.json();
                            console.error('❌ Record Page - API Error:', errorData);
                            alert('Failed to start live scoring');
                          }
                        } catch (error) {
                          console.error('💥 Record Page - Error starting live score:', error);
                          alert('Failed to start live scoring');
                        }
                      }}
                      className="flex items-center gap-2 px-4"
                    >
                      <Play className="w-4 h-4" />
                      Live Score
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
      {selectedMatchData && <div className="op-record-banner"><div><p>{selectedMatchData.sport_type} · {selectedMatchData.teamA?.gender === 'male' ? 'Boys' : 'Girls'} · {selectedMatchData.status === 'played' ? 'Editing a recorded result' : 'Recording a result'}</p><strong>{selectedMatchData.teamA?.name.replaceAll('_', ' ')} vs {selectedMatchData.teamB?.name.replaceAll('_', ' ')}</strong></div><Link href={dashboard.href('/dashboard/schedule')}>Back to fixtures</Link></div>}
      {loadingExisting && <p className="op-caption" role="status">Restoring the saved scores and participants…</p>}
      {existingError && selectedMatchData && <div className="op-error" role="alert">{existingError} <button className="underline" onClick={() => loadExistingMatchData(selectedMatchData.id, selectedMatchData, loadVersion.current)}>Retry loading saved result</button></div>}
      {/* Match Details and Recording Form */}
      {selectedMatchData && selectedMatchData.teamA && selectedMatchData.teamB && (
        <fieldset className="space-y-6" disabled={loadingExisting || !!existingError}>
          <legend className="sr-only">Match result details</legend>
                {/* Winner Selection */}
                <section className="rounded-lg border  to-white p-4">
                
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Winning Team *
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={winningTeam === selectedMatchData.teamA.id.toString() ? "default" : "outline"}
                        onClick={() => setWinningTeam(selectedMatchData.teamA.id.toString())}
                        className={`h-auto p-4 flex flex-col items-center gap-2 ${
                          winningTeam === selectedMatchData.teamA.id.toString() 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'hover:bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="text-lg font-semibold">
                          {selectedMatchData.teamA?.name || 'Unknown Team'}
                        </div>
                        <div className="text-sm opacity-80">
                          {selectedMatchData.teamA?.grade || 'Unknown'}
                        </div>
                        {winningTeam === selectedMatchData.teamA.id.toString() && (
                          <div className="text-xs font-medium">✓ Selected</div>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant={winningTeam === selectedMatchData.teamB.id.toString() ? "default" : "outline"}
                        onClick={() => setWinningTeam(selectedMatchData.teamB.id.toString())}
                        className={`h-auto p-4 flex flex-col items-center gap-2 ${
                          winningTeam === selectedMatchData.teamB.id.toString() 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'hover:bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="text-lg font-semibold">
                          {selectedMatchData.teamB?.name || 'Unknown Team'}
                        </div>
                        <div className="text-sm opacity-80">
                          {selectedMatchData.teamB?.grade || 'Unknown'}
                        </div>
                        {winningTeam === selectedMatchData.teamB.id.toString() && (
                          <div className="text-xs font-medium">✓ Selected</div>
                        )}
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Basketball Statistics */}
                {selectedMatchData.sport_type === 'basketball' && (
                  <section className="rounded-lg border bg-gradient-to-b from-gray-50/60 to-white p-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Basketball Statistics</h3>
                        <p className="text-xs text-gray-700/80">Record team and individual player statistics</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="team-filter" className="text-sm font-medium">
                          Show Stats For:
                        </Label>
                        <Select value={selectedTeamForStats} onValueChange={(value: 'teamA' | 'teamB' | 'both') => setSelectedTeamForStats(value)}>
                          <SelectTrigger id="team-filter" className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Both Teams</SelectItem>
                            <SelectItem value="teamA">{selectedMatchData.teamA.name} ({selectedMatchData.teamA.grade})</SelectItem>
                            <SelectItem value="teamB">{selectedMatchData.teamB.name} ({selectedMatchData.teamB.grade})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                
                {/* Team A Stats */}
                {(selectedTeamForStats === 'teamA' || selectedTeamForStats === 'both') && (
                  <section className="rounded-md border bg-gray-50/40 p-4 space-y-4">
                    <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      {selectedMatchData.teamA.name}
                      <Badge variant="outline" className={getGradeBadgeColor(selectedMatchData.teamA.grade)}>{selectedMatchData.teamA.grade}</Badge>
                    </div>
                      <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="team-a-points">Team Points</Label>
                        <Input
                          id="team-a-points"
                          type="number"
                          value={basketballScores.teamA.points}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamA: { ...prev.teamA, points: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamAPoints) {
                              setValidationErrors(prev => ({ ...prev, teamAPoints: false }));
                            }
                          }}
                          className={validationErrors.teamAPoints ? "border-red-500" : ""}
                        />
                        {validationErrors.teamAPoints && (
                          <p className="text-red-500 text-xs mt-1">
                            Team points ({basketballScores.teamA.points}) don&apos;t match individual points ({individualStats.teamA.reduce((sum, stat) => sum + stat.points, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-a-rebounds">Team Rebounds</Label>
                        <Input
                          id="team-a-rebounds"
                          type="number"
                          value={basketballScores.teamA.rebounds}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamA: { ...prev.teamA, rebounds: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamARebounds) {
                              setValidationErrors(prev => ({ ...prev, teamARebounds: false }));
                            }
                          }}
                          className={validationErrors.teamARebounds ? "border-red-500" : ""}
                        />
                        {validationErrors.teamARebounds && (
                          <p className="text-red-500 text-xs mt-1">
                            Team rebounds ({basketballScores.teamA.rebounds}) don&apos;t match individual rebounds ({individualStats.teamA.reduce((sum, stat) => sum + stat.rebounds, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-a-assists">Team Assists</Label>
                        <Input
                          id="team-a-assists"
                          type="number"
                          value={basketballScores.teamA.assists}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamA: { ...prev.teamA, assists: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamAAssists) {
                              setValidationErrors(prev => ({ ...prev, teamAAssists: false }));
                            }
                          }}
                          className={validationErrors.teamAAssists ? "border-red-500" : ""}
                        />
                        {validationErrors.teamAAssists && (
                          <p className="text-red-500 text-xs mt-1">
                            Team assists ({basketballScores.teamA.assists}) don&apos;t match individual assists ({individualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0)})
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Statistics Summary */}
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Points:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamA.points}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamA.reduce((sum, stat) => sum + stat.points, 0)}</span>
                            </span>
                            {validationErrors.teamAPoints && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Rebounds:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamA.rebounds}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamA.reduce((sum, stat) => sum + stat.rebounds, 0)}</span>
                            </span>
                            {validationErrors.teamARebounds && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Assists:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamA.assists}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0)}</span>
                            </span>
                            {validationErrors.teamAAssists && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Individual Player Stats for Team A */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h6 className="font-medium text-gray-700">Individual Player Statistics</h6>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPlayerSelector(true)}
                          className="text-xs"
                        >
                          Choose Who Played
                        </Button>
                      </div>
                      
                      {isLoadingPlayers ? (
                        <div className="text-center py-4 text-gray-500">
                          <Loader2 className="size-4 animate-spin" />
                          Loading players...
                        </div>
                      ) : players.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No players found for this team. Please add players to the team first.
                        </div>
                      ) : (
                        (individualStats.teamA.length === 0 ? <p className="op-caption">Choose the participants to show their statistic fields.</p> : individualStats.teamA.map((playerStat, index) => {
                          const player = players.find(p => p.id === playerStat.player_id);
                          return (
                            <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {player?.first_name} {player?.last_name}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Points</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.points}
                                                                      onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamA: prev.teamA.map((stat, i) => 
                                        i === index ? { ...stat, points: newValue } : stat
                                      )
                                    }));
                                    // Clear validation error when individual points change
                                    if (validationErrors.teamAPoints) {
                                      setValidationErrors(prev => ({ ...prev, teamAPoints: false }));
                                    }
                                  }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rebounds</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.rebounds}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, rebounds: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Assists</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.assists}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, assists: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>


                              </div>
                            </div>
                          );
                        }))
                      )}
                    </div>
                  </section>
                )}

                {/* Team B Stats */}
                {(selectedTeamForStats === 'teamB' || selectedTeamForStats === 'both') && (
                  <section className="rounded-md border bg-grade-1-50/40 p-4 space-y-4">
                    <div className="text-base font-semibold text-green-900 flex items-center gap-2">
                      {selectedMatchData.teamB.name}
                      <Badge variant="outline" className={getGradeBadgeColor(selectedMatchData.teamB.grade)}>{selectedMatchData.teamB.grade}</Badge>
                    </div>
                      <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="team-b-points">Team Points</Label>
                        <Input
                          id="team-b-points"
                          type="number"
                          value={basketballScores.teamB.points}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamB: { ...prev.teamB, points: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamBPoints) {
                              setValidationErrors(prev => ({ ...prev, teamBPoints: false }));
                            }
                          }}
                          className={validationErrors.teamBPoints ? "border-red-500" : ""}
                        />
                        {validationErrors.teamBPoints && (
                          <p className="text-red-500 text-xs mt-1">
                            Team points ({basketballScores.teamB.points}) don&apos;t match individual points ({individualStats.teamB.reduce((sum, stat) => sum + stat.points, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-b-rebounds">Team Rebounds</Label>
                        <Input
                          id="team-b-rebounds"
                          type="number"
                          value={basketballScores.teamB.rebounds}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamB: { ...prev.teamB, rebounds: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamBRebounds) {
                              setValidationErrors(prev => ({ ...prev, teamBRebounds: false }));
                            }
                          }}
                          className={validationErrors.teamBRebounds ? "border-red-500" : ""}
                        />
                        {validationErrors.teamBRebounds && (
                          <p className="text-red-500 text-xs mt-1">
                            Team rebounds ({basketballScores.teamB.rebounds}) don&apos;t match individual rebounds ({individualStats.teamB.reduce((sum, stat) => sum + stat.rebounds, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-b-assists">Team Assists</Label>
                        <Input
                          id="team-b-assists"
                          type="number"
                          value={basketballScores.teamB.assists}
                          onChange={(e) => {
                            setBasketballScores(prev => ({
                              ...prev,
                              teamB: { ...prev.teamB, assists: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamBAssists) {
                              setValidationErrors(prev => ({ ...prev, teamBAssists: false }));
                            }
                          }}
                          className={validationErrors.teamBAssists ? "border-red-500" : ""}
                        />
                        {validationErrors.teamBAssists && (
                          <p className="text-red-500 text-xs mt-1">
                            Team assists ({basketballScores.teamB.assists}) don&apos;t match individual assists ({individualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0)})
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Statistics Summary */}
                    <div className="bg-green-100 p-3 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Points:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamB.points}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamB.reduce((sum, stat) => sum + stat.points, 0)}</span>
                            </span>
                            {validationErrors.teamBPoints && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Rebounds:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamB.rebounds}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamB.reduce((sum, stat) => sum + stat.rebounds, 0)}</span>
                            </span>
                            {validationErrors.teamBRebounds && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Assists:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{basketballScores.teamB.assists}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{individualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0)}</span>
                            </span>
                            {validationErrors.teamBAssists && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Individual Player Stats for Team B */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h6 className="font-medium text-gray-700">Individual Player Statistics</h6>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPlayerSelector(true)}
                          className="text-xs"
                        >
                          Choose Who Played
                        </Button>
                      </div>
                      
                      {individualStats.teamB.length === 0 && <p className="op-caption">Choose the participants to show their statistic fields.</p>}
                      {individualStats.teamB.map((playerStat, index) => {
                        const player = players.find(p => p.id === playerStat.player_id);
                        return (
                          <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {player?.first_name} {player?.last_name}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Points</Label>
                                <Input
                                  type="number"
                                  value={playerStat.points}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, points: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Rebounds</Label>
                                <Input
                                  type="number"
                                  value={playerStat.rebounds}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, rebounds: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Assists</Label>
                                <Input
                                  type="number"
                                  value={playerStat.assists}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, assists: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>


                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                  </section>
                )}

                {/* Football Statistics */}
                {selectedMatchData.sport_type === 'football' && (
                  <section className="rounded-lg border bg-gradient-to-b from-rose-50/60 to-white p-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-rose-900">Football Statistics</h3>
                        <p className="text-xs text-rose-700/80">Record team and individual player statistics</p>
                      </div>
                      {/* Team Filter for Statistics and Penalty Button */}
                      <div className="flex items-center gap-3">
                        <Label htmlFor="team-filter-football" className="text-sm font-medium">
                          Show Stats For:
                        </Label>
                        <Select value={selectedTeamForStats} onValueChange={(value: 'teamA' | 'teamB' | 'both') => setSelectedTeamForStats(value)}>
                          <SelectTrigger id="team-filter-football" className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Both Teams</SelectItem>
                            <SelectItem value="teamA">{selectedMatchData.teamA.name} ({selectedMatchData.teamA.grade})</SelectItem>
                            <SelectItem value="teamB">{selectedMatchData.teamB.name} ({selectedMatchData.teamB.grade})</SelectItem>
                          </SelectContent>
                        </Select>
                        <Dialog open={showPenaltyDialog} onOpenChange={setShowPenaltyDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" type="button">
                              ⚽ Penalty
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Enter Penalty Shootout Scores</DialogTitle>
                              <DialogDescription>
                                Enter the penalty shootout scores for both teams if the match ended in a tie.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                              <div>
                                <Label htmlFor="dialog-penalty-team-a">
                                  {selectedMatchData.teamA.name} Penalties
                                </Label>
                                <Input
                                  id="dialog-penalty-team-a"
                                  type="number"
                                  min="0"
                                  value={penaltyScores?.team_a || 0}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setPenaltyScores(prev => ({
                                      team_a: value,
                                      team_b: prev?.team_b || 0
                                    }));
                                  }}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label htmlFor="dialog-penalty-team-b">
                                  {selectedMatchData.teamB.name} Penalties
                                </Label>
                                <Input
                                  id="dialog-penalty-team-b"
                                  type="number"
                                  min="0"
                                  value={penaltyScores?.team_b || 0}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setPenaltyScores(prev => ({
                                      team_a: prev?.team_a || 0,
                                      team_b: value
                                    }));
                                  }}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setPenaltyScores(null);
                                  setShowPenaltyDialog(false);
                                }}
                              >
                                Clear
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowPenaltyDialog(false);
                                }}
                              >
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                
                {/* Team A Stats */}
                {(selectedTeamForStats === 'teamA' || selectedTeamForStats === 'both') && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">
                      {selectedMatchData.teamA.name} 
                      <span className="ml-2 text-sm font-normal text-gray-600 bg-blue-100 px-2 py-1 rounded">
                        {selectedMatchData.teamA.grade}
                      </span>
                    </h5>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="team-a-goals">Team Goals</Label>
                        <Input
                          id="team-a-goals"
                          type="number"
                          value={footballScores.teamA.goals}
                          onChange={(e) => {
                            setFootballScores(prev => ({
                              ...prev,
                              teamA: { ...prev.teamA, goals: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamAGoals) {
                              setValidationErrors(prev => ({ ...prev, teamAGoals: false }));
                            }
                          }}
                          className={validationErrors.teamAGoals ? "border-red-500" : ""}
                        />
                        {validationErrors.teamAGoals && (
                          <p className="text-red-500 text-xs mt-1">
                            Team goals ({footballScores.teamA.goals}) don&apos;t match individual goals ({footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.goals, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-a-assists-football">Team Assists</Label>
                        <Input
                          id="team-a-assists-football"
                          type="number"
                          value={footballScores.teamA.assists}
                          onChange={(e) => {
                            setFootballScores(prev => ({
                              ...prev,
                              teamA: { ...prev.teamA, assists: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamAAssistsFootball) {
                              setValidationErrors(prev => ({ ...prev, teamAAssistsFootball: false }));
                            }
                          }}
                          className={validationErrors.teamAAssistsFootball ? "border-red-500" : ""}
                        />
                        {validationErrors.teamAAssistsFootball && (
                          <p className="text-red-500 text-xs mt-1">
                            Team assists ({footballScores.teamA.assists}) don&apos;t match individual assists ({footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0)})
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Statistics Summary */}
                    <div className="bg-blue-100 p-3 rounded-lg mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Goals:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{footballScores.teamA.goals}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.goals, 0)}</span>
                            </span>
                            {validationErrors.teamAGoals && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Assists:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{footballScores.teamA.assists}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{footballIndividualStats.teamA.reduce((sum, stat) => sum + stat.assists, 0)}</span>
                            </span>
                            {validationErrors.teamAAssistsFootball && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Penalty Scores Section - Show when scores are tied */}
                    {footballScores.teamA.goals === footballScores.teamB.goals && footballScores.teamA.goals > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg mb-4">
                        <h6 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                          <span>⚽</span>
                          Penalty Shootout (Scores are tied)
                        </h6>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="penalty-team-a">
                              {selectedMatchData.teamA.name} Penalties
                            </Label>
                            <Input
                              id="penalty-team-a"
                              type="number"
                              min="0"
                              value={penaltyScores?.team_a || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setPenaltyScores(prev => ({
                                  team_a: value,
                                  team_b: prev?.team_b || 0
                                }));
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="penalty-team-b">
                              {selectedMatchData.teamB.name} Penalties
                            </Label>
                            <Input
                              id="penalty-team-b"
                              type="number"
                              min="0"
                              value={penaltyScores?.team_b || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setPenaltyScores(prev => ({
                                  team_a: prev?.team_a || 0,
                                  team_b: value
                                }));
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          Enter penalty shootout scores if the match ended in a tie
                        </p>
                      </div>
                    )}
                    
                    {/* Individual Player Stats for Team A */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h6 className="font-medium text-gray-700">Individual Player Statistics</h6>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPlayerSelector(true)}
                          className="text-xs"
                        >
                          Choose Who Played
                        </Button>
                      </div>
                      
                      {isLoadingPlayers ? (
                        <div className="text-center py-4 text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          Loading players...
                        </div>
                      ) : players.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No players found for this team. Please add players to the team first.
                        </div>
                      ) : (
                        (footballIndividualStats.teamA.length === 0 ? <p className="op-caption">Choose the participants to show their statistic fields.</p> : footballIndividualStats.teamA.map((playerStat, index) => {
                          const player = players.find(p => p.id === playerStat.player_id);
                          return (
                            <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {player?.first_name} {player?.last_name}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-xs">Goals</Label>
                                  <Input
                                    type="number"
                                    value={playerStat.goals}
                                    onChange={(e: any) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setFootballIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, goals: newValue } : stat
                                        )
                                      }));
                                      // Clear validation error when individual goals change
                                      if (validationErrors.teamAGoals) {
                                        setValidationErrors(prev => ({ ...prev, teamAGoals: false }));
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Assists</Label>
                                  <Input
                                    type="number"
                                    value={playerStat.assists}
                                    onChange={(e: any) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setFootballIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, assists: newValue } : stat
                                        )
                                      }));
                                      // Clear validation error when individual assists change
                                      if (validationErrors.teamAAssistsFootball) {
                                        setValidationErrors(prev => ({ ...prev, teamAAssistsFootball: false }));
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Shots on Target</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.shots_on_target}
                                    onChange={(e: any) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setFootballIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, shots_on_target: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Saves</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.saves}
                                    onChange={(e: any) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setFootballIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, saves: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }))
                      )}
                    </div>
                  </div>
                )}

                {/* Team B Stats */}
                {(selectedTeamForStats === 'teamB' || selectedTeamForStats === 'both') && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">
                      {selectedMatchData.teamB.name} 
                      <span className="ml-2 text-sm font-normal text-gray-600 bg-green-100 px-2 py-1 rounded">
                        {selectedMatchData.teamB.grade}
                      </span>
                    </h5>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor="team-b-goals">Team Goals</Label>
                        <Input
                          id="team-b-goals"
                          type="number"
                          value={footballScores.teamB.goals}
                          onChange={(e) => {
                            setFootballScores(prev => ({
                              ...prev,
                              teamB: { ...prev.teamB, goals: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamBGoals) {
                              setValidationErrors(prev => ({ ...prev, teamBGoals: false }));
                            }
                          }}
                          className={validationErrors.teamBGoals ? "border-red-500" : ""}
                        />
                        {validationErrors.teamBGoals && (
                          <p className="text-red-500 text-xs mt-1">
                            Team goals ({footballScores.teamB.goals}) don&apos;t match individual goals ({footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.goals, 0)})
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="team-b-assists-football">Team Assists</Label>
                        <Input
                          id="team-b-assists-football"
                          type="number"
                          
                          value={footballScores.teamB.assists}
                          onChange={(e) => {
                            setFootballScores(prev => ({
                              ...prev,
                              teamB: { ...prev.teamB, assists: parseInt(e.target.value) || 0 }
                            }));
                            // Clear validation error when user starts typing
                            if (validationErrors.teamBAssistsFootball) {
                              setValidationErrors(prev => ({ ...prev, teamBAssistsFootball: false }));
                            }
                          }}
                          className={validationErrors.teamBAssistsFootball ? "border-red-500" : ""}
                        />
                        {validationErrors.teamBAssistsFootball && (
                          <p className="text-red-500 text-xs mt-1">
                            Team assists ({footballScores.teamB.assists}) don&apos;t match individual assists ({footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0)})
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Statistics Summary */}
                    <div className="bg-green-100 p-3 rounded-lg mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Goals:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              Team: <span className="font-semibold">{footballScores.teamB.goals}</span>
                            </span>
                            <span className="text-gray-600">
                              Individual: <span className="font-semibold">{footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.goals, 0)}</span>
                            </span>
                            {validationErrors.teamBGoals && (
                              <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                            )}
                          </div>
                        </div>
                                                 <div className="flex items-center justify-between text-sm">
                           <span className="font-medium text-gray-700">Assists:</span>
                           <div className="flex items-center gap-4">
                             <span className="text-gray-600">
                               Team: <span className="font-semibold">{footballScores.teamB.assists}</span>
                             </span>
                             <span className="text-gray-600">
                               Individual: <span className="font-semibold">{footballIndividualStats.teamB.reduce((sum, stat) => sum + stat.assists, 0)}</span>
                             </span>
                             {validationErrors.teamBAssistsFootball && (
                               <span className="text-red-600 font-medium">⚠️ Mismatch</span>
                             )}
                           </div>
                         </div>
                      </div>
                    </div>
                    
                    {/* Individual Player Stats for Team B */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h6 className="font-medium text-gray-700">Individual Player Statistics</h6>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPlayerSelector(true)}
                          className="text-xs"
                        >
                          Choose Who Played
                        </Button>
                      </div>
                      
                      {footballIndividualStats.teamB.length === 0 && <p className="op-caption">Choose the participants to show their statistic fields.</p>}
                      {footballIndividualStats.teamB.map((playerStat, index) => {
                        const player = players.find(p => p.id === playerStat.player_id);
                        return (
                          <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {player?.first_name} {player?.last_name}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs">Goals</Label>
                                <Input
                                  type="number"
                                  
                                  value={playerStat.goals}
                                  onChange={(e: any) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setFootballIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, goals: newValue } : stat
                                      )
                                    }));
                                    // Clear validation error when individual goals change
                                    if (validationErrors.teamBGoals) {
                                      setValidationErrors(prev => ({ ...prev, teamBGoals: false }));
                                    }
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Assists</Label>
                                <Input
                                  type="number"
                                  
                                  value={playerStat.assists}
                                  onChange={(e: any) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setFootballIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, assists: newValue } : stat
                                      )
                                    }));
                                    // Clear validation error when individual assists change
                                    if (validationErrors.teamBAssistsFootball) {
                                      setValidationErrors(prev => ({ ...prev, teamBAssistsFootball: false }));
                                    }
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Shots on Target</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={playerStat.shots_on_target}
                                  onChange={(e: any) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setFootballIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, shots_on_target: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Saves</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={playerStat.saves}
                                  onChange={(e: any) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setFootballIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, saves: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                  </section>
                )}

                {/* Volleyball Statistics */}
                {selectedMatchData.sport_type === 'volleyball' && (
                  <section className="rounded-lg border bg-gradient-to-b from-green-50/60 to-white p-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-green-900">Volleyball Statistics</h3>
                        <p className="text-xs text-green-700/80">Record scores for each set (25 points to win a set)</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextSetNumber = Math.max(...volleyballScores.teamA.sets.map(s => s.setNumber), ...volleyballScores.teamB.sets.map(s => s.setNumber)) + 1;
                          setVolleyballScores(prev => ({
                            teamA: {
                              ...prev.teamA,
                              sets: [...prev.teamA.sets, { setNumber: nextSetNumber, points: 0 }]
                            },
                            teamB: {
                              ...prev.teamB,
                              sets: [...prev.teamB.sets, { setNumber: nextSetNumber, points: 0 }]
                            }
                          }));
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Set
                      </Button>
                    </div>

                    {/* Team A Sets */}
                    <div className="rounded-md border bg-gray-50/40 p-4 space-y-4">
                      <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        {selectedMatchData.teamA.name}
                        <Badge variant="outline" className={getGradeBadgeColor(selectedMatchData.teamA.grade)}>{selectedMatchData.teamA.grade}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {volleyballScores.teamA.sets.map((set, index) => (
                          <div key={set.setNumber} className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label htmlFor={`team-a-set-${set.setNumber}`}>Set {set.setNumber}</Label>
                              <Input
                                id={`team-a-set-${set.setNumber}`}
                                type="number"
                                min="0"
                                max="25"
                                value={set.points}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setVolleyballScores(prev => ({
                                    ...prev,
                                    teamA: {
                                      ...prev.teamA,
                                      sets: prev.teamA.sets.map(s => 
                                        s.setNumber === set.setNumber ? { ...s, points: value } : s
                                      )
                                    }
                                  }));
                                }}
                                className="text-center text-lg font-semibold"
                              />
                            </div>
                            {volleyballScores.teamA.sets.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setVolleyballScores(prev => ({
                                    teamA: {
                                      ...prev.teamA,
                                      sets: prev.teamA.sets.filter(s => s.setNumber !== set.setNumber)
                                    },
                                    teamB: {
                                      ...prev.teamB,
                                      sets: prev.teamB.sets.filter(s => s.setNumber !== set.setNumber)
                                    }
                                  }));
                                }}
                                className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team B Sets */}
                    <div className="rounded-md border bg-gray-50/40 p-4 space-y-4">
                      <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        {selectedMatchData.teamB.name}
                        <Badge variant="outline" className={getGradeBadgeColor(selectedMatchData.teamB.grade)}>{selectedMatchData.teamB.grade}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {volleyballScores.teamB.sets.map((set) => (
                          <div key={set.setNumber} className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label htmlFor={`team-b-set-${set.setNumber}`}>Set {set.setNumber}</Label>
                              <Input
                                id={`team-b-set-${set.setNumber}`}
                                type="number"
                                min="0"
                                max="25"
                                value={set.points}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setVolleyballScores(prev => ({
                                    ...prev,
                                    teamB: {
                                      ...prev.teamB,
                                      sets: prev.teamB.sets.map(s => 
                                        s.setNumber === set.setNumber ? { ...s, points: value } : s
                                      )
                                    }
                                  }));
                                }}
                                className="text-center text-lg font-semibold"
                              />
                            </div>
                            {volleyballScores.teamB.sets.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setVolleyballScores(prev => ({
                                    teamA: {
                                      ...prev.teamA,
                                      sets: prev.teamA.sets.filter(s => s.setNumber !== set.setNumber)
                                    },
                                    teamB: {
                                      ...prev.teamB,
                                      sets: prev.teamB.sets.filter(s => s.setNumber !== set.setNumber)
                                    }
                                  }));
                                }}
                                className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Set Winners Summary */}
                    <div className="bg-green-100 p-3 rounded-lg">
                      <div className="space-y-2">
                        {volleyballScores.teamA.sets.map((set) => {
                          const teamBSet = volleyballScores.teamB.sets.find(s => s.setNumber === set.setNumber);
                          if (!teamBSet) return null;
                          
                          const teamAWon = set.points > teamBSet.points;
                          const teamBWon = teamBSet.points > set.points;
                          const isValid = set.points > 0 && teamBSet.points > 0 && 
                                        (set.points >= 25 || teamBSet.points >= 25) &&
                                        Math.abs(set.points - teamBSet.points) >= 2;
                          
                          return (
                            <div key={set.setNumber} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">Set {set.setNumber} Winner:</span>
                              <span className="text-gray-600">
                                {teamAWon ? selectedMatchData.teamA.name : 
                                 teamBWon ? selectedMatchData.teamB.name : 
                                 'Not determined'}
                                {isValid ? ' ✓' : 
                                 set.points > 0 && teamBSet.points > 0 ? ' (Need 25+ with 2 point lead)' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !winningTeam || loadingExisting || !!existingError}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {selectedMatchData?.status === 'played' ? 'Updating Results...' : 'Recording Results...'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {selectedMatchData?.status === 'played' ? 'Update Match Results' : 'Record Match Results'}
                      </div>
                    )}
                  </Button>
                </div>
        </fieldset>
      )}

      {/* Message Display */}
      {message && (
        <Alert className={message.type === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* No Matches Message */}
      {selectedChampionship && matches.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No matches available</p>
              <p className="text-sm">Fixtures need both opponents before a result can be recorded. Check the draw or choose another championship.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Selection Modal */}
      {selectedMatchData && (isEYMatch || players.length > 0) && (
        <Dialog open={showPlayerSelector} onOpenChange={open => { setShowPlayerSelector(open); if (!open) setEyPlayerNames({}); }}>
          <DialogContent className="max-w-4xl p-0 max-h-[85dvh] overflow-y-auto" showCloseButton={false}>
            <DialogTitle className="sr-only">Choose the players who participated</DialogTitle>
            <DialogDescription className="sr-only">Select each participating player, then confirm the selection.</DialogDescription>
          <Card className="w-full border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isEYMatch ? 'Enter Player Names (EY)' : 'Select Players Who Played'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close player selector"
                  onClick={() => {
                    setShowPlayerSelector(false);
                    setEyPlayerNames({});
                  }}
                >
                  ✕
                </Button>
              </div>
              <CardDescription>
                {isEYMatch 
                  ? 'Type in the names of players who participated in this match'
                  : 'Choose which players participated in this match'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEYMatch ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team A EY - Existing Players + New Name Inputs */}
                  {isTeamStatsOnlyGrade(selectedMatchData.teamA?.grade) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        {selectedMatchData.teamA?.name || `Team ${selectedMatchData.team_a_id}`}
                      </h4>
                      
                      {/* Existing Players */}
                      {players.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">Existing Players:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {players
                              .filter(p => p && p.team_id === selectedMatchData.team_a_id)
                              .map(player => (
                                <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-blue-50">
                                  <input
                                    type="checkbox"
                                    checked={selectedPlayers.teamA.includes(player.id)}
                                    onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                    className="rounded border-gray-300 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium flex-1 min-w-0">
                                    {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Add New Players */}
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Add New Players:</p>
                        <div className="space-y-3">
                          {(eyPlayerNames[selectedMatchData.team_a_id] || []).map((player, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="First Name"
                                value={player.firstName}
                                onChange={(e) => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_a_id] || [])];
                                  newNames[index] = { ...newNames[index], firstName: e.target.value };
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_a_id]: newNames });
                                }}
                                className="flex-1"
                              />
                              <Input
                                type="text"
                                placeholder="Last Name"
                                value={player.lastName}
                                onChange={(e) => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_a_id] || [])];
                                  newNames[index] = { ...newNames[index], lastName: e.target.value };
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_a_id]: newNames });
                                }}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_a_id] || [])];
                                  newNames.splice(index, 1);
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_a_id]: newNames });
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentNames = eyPlayerNames[selectedMatchData.team_a_id] || [];
                              setEyPlayerNames({
                                ...eyPlayerNames,
                                [selectedMatchData.team_a_id]: [...currentNames, { firstName: '', lastName: '' }]
                              });
                            }}
                            className="w-full"
                          >
                            + Add New Player
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team B EY - Existing Players + New Name Inputs */}
                  {isTeamStatsOnlyGrade(selectedMatchData.teamB?.grade) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        {selectedMatchData.teamB?.name || `Team ${selectedMatchData.team_b_id}`}
                      </h4>
                      
                      {/* Existing Players */}
                      {players.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">Existing Players:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {players
                              .filter(p => p && p.team_id === selectedMatchData.team_b_id)
                              .map(player => (
                                <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-green-50">
                                  <input
                                    type="checkbox"
                                    checked={selectedPlayers.teamB.includes(player.id)}
                                    onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                    className="rounded border-gray-300 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium flex-1 min-w-0">
                                    {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Add New Players */}
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Add New Players:</p>
                        <div className="space-y-3">
                          {(eyPlayerNames[selectedMatchData.team_b_id] || []).map((player, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="First Name"
                                value={player.firstName}
                                onChange={(e) => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_b_id] || [])];
                                  newNames[index] = { ...newNames[index], firstName: e.target.value };
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_b_id]: newNames });
                                }}
                                className="flex-1"
                              />
                              <Input
                                type="text"
                                placeholder="Last Name"
                                value={player.lastName}
                                onChange={(e) => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_b_id] || [])];
                                  newNames[index] = { ...newNames[index], lastName: e.target.value };
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_b_id]: newNames });
                                }}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newNames = [...(eyPlayerNames[selectedMatchData.team_b_id] || [])];
                                  newNames.splice(index, 1);
                                  setEyPlayerNames({ ...eyPlayerNames, [selectedMatchData.team_b_id]: newNames });
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentNames = eyPlayerNames[selectedMatchData.team_b_id] || [];
                              setEyPlayerNames({
                                ...eyPlayerNames,
                                [selectedMatchData.team_b_id]: [...currentNames, { firstName: '', lastName: '' }]
                              });
                            }}
                            className="w-full"
                          >
                            + Add New Player
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show existing players for non-EY teams */}
                  {!isTeamStatsOnlyGrade(selectedMatchData.teamA?.grade) && players.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        {selectedMatchData.teamA?.name || `Team ${selectedMatchData.team_a_id}`}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {players
                          .filter(p => p && p.team_id === selectedMatchData.team_a_id)
                          .map(player => (
                            <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-blue-50">
                              <input
                                type="checkbox"
                                checked={selectedPlayers.teamA.includes(player.id)}
                                onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm font-medium flex-1 min-w-0">
                                {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {!isTeamStatsOnlyGrade(selectedMatchData.teamB?.grade) && players.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        {selectedMatchData.teamB?.name || `Team ${selectedMatchData.team_b_id}`}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {players
                          .filter(p => p && p.team_id === selectedMatchData.team_b_id)
                          .map(player => (
                            <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-green-50">
                              <input
                                type="checkbox"
                                checked={selectedPlayers.teamB.includes(player.id)}
                                onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm font-medium flex-1 min-w-0">
                                {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Normal Mode: Show existing player selection
                players.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team A Players */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        {selectedMatchData.teamA?.name || `Team ${selectedMatchData.team_a_id}`}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {players
                          .filter(p => p && p.team_id === selectedMatchData.team_a_id)
                          .map(player => (
                            <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-blue-50">
                              <input
                                type="checkbox"
                                checked={selectedPlayers.teamA.includes(player.id)}
                                onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm font-medium flex-1 min-w-0">
                                {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Team B Players */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        {selectedMatchData.teamB?.name || `Team ${selectedMatchData.team_b_id}`}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {players
                          .filter(p => p && p.team_id === selectedMatchData.team_b_id)
                          .map(player => (
                            <div key={player.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-green-50">
                              <input
                                type="checkbox"
                                checked={selectedPlayers.teamB.includes(player.id)}
                                onChange={() => togglePlayerSelection(player.team_id, player.id)}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm font-medium flex-1 min-w-0">
                                {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPlayerSelector(false);
                    setEyPlayerNames({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlayerSelection}
                  disabled={
                    isCreatingPlayers ||
                    (isEYMatch
                      ? (eyPlayerNames[selectedMatchData.team_a_id] || []).filter(p => p.firstName.trim() && p.lastName.trim()).length === 0 &&
                        (eyPlayerNames[selectedMatchData.team_b_id] || []).filter(p => p.firstName.trim() && p.lastName.trim()).length === 0 &&
                        selectedPlayers.teamA.length === 0 && selectedPlayers.teamB.length === 0
                      : selectedPlayers.teamA.length === 0 && selectedPlayers.teamB.length === 0)
                  }
                >
                  {isCreatingPlayers ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Entries...
                    </div>
                  ) : isEYMatch ? (
                    `Confirm (${[
                      ...(eyPlayerNames[selectedMatchData.team_a_id] || []),
                      ...(eyPlayerNames[selectedMatchData.team_b_id] || [])
                    ].filter(p => p.firstName.trim() && p.lastName.trim()).length + selectedPlayers.teamA.length + selectedPlayers.teamB.length} players)`
                  ) : (
                    `Confirm Selection (${selectedPlayers.teamA.length + selectedPlayers.teamB.length} players)`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

