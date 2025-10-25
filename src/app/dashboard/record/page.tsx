"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Calendar, Users, Target, CheckCircle, AlertCircle, Clock, BarChart3, Loader2, Play } from "lucide-react";

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
  teamA: Team;
  teamB: Team;
  championship: Championship;
}

interface MatchWithScores extends Match {
  team_a_score?: number;
  team_b_score?: number;
}

interface BasketballScore {
  team_id: number;
  points: number;
  rebounds: number;
  assists: number;
  three_points_made?: number;
  three_points_attempted?: number;
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
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedChampionship, setSelectedChampionship] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesWithScores, setMatchesWithScores] = useState<MatchWithScores[]>([]);
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
  
  const [individualStats, setIndividualStats] = useState<{
    teamA: Array<{ player_id: number; points: number; rebounds: number; assists: number; three_points_made: number; three_points_attempted: number }>;
    teamB: Array<{ player_id: number; points: number; rebounds: number; assists: number; three_points_made: number; three_points_attempted: number }>;
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
  const [selectedPlayers, setSelectedPlayers] = useState<{
    teamA: number[];
    teamB: number[];
  }>({
    teamA: [],
    teamB: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  const [isFetchingChampionships, setIsFetchingChampionships] = useState(false);
  // Fetch championships on component mount
  useEffect(() => {
    // Only fetch on client side
    if (typeof window !== 'undefined') {
      setIsFetchingChampionships(true);
      fetchChampionships();
      setIsFetchingChampionships(false);
    }
  }, []);

  // Fetch matches when championship changes
  useEffect(() => {
    const fetchMatchesForChampionship = async () => {
      console.log('🔄 Championship selection changed:', selectedChampionship);
    
    if (selectedChampionship) {
      console.log('🚀 Triggering match fetch for championship:', selectedChampionship);
      setIsFetchingMatches(true);
      await fetchMatches(selectedChampionship);
      setIsFetchingMatches(false);
    } else {
      console.log('🧹 Clearing matches data (no championship selected)');
      setMatches([]);
      setSelectedMatch("");
      setSelectedMatchData(null);
    }
    };
    
    fetchMatchesForChampionship();
  }, [selectedChampionship]);

  // Update selected match data when match selection changes
  useEffect(() => {
    if (selectedMatch && matches.length > 0) {
      const match = matches.find(m => m.id.toString() === selectedMatch);
      if (match) {
        setSelectedMatchData(match);
        
        // Reset form data
        setBasketballScores({
          teamA: { team_id: match.team_a_id, points: 0, rebounds: 0, assists: 0 },
          teamB: { team_id: match.team_b_id, points: 0, rebounds: 0, assists: 0 }
        });
        setWinningTeam("");
        setIndividualStats({ teamA: [], teamB: [] });
        setFootballIndividualStats({ teamA: [], teamB: [] });
        setSelectedPlayers({ teamA: [], teamB: [] });
        
        // Fetch players for both teams
        fetchPlayers(match.team_a_id, match.team_b_id);
        
        // If match is already played, load existing data
        if (match.status === 'played') {
          loadExistingMatchData(match.id);
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

  const fetchChampionships = async () => {
    try {
      console.log('🏆 Fetching championships...');
      
      const response = await fetch('/api/championships');
      console.log('📡 Championships API Response status:', response.status);
      console.log('📡 Championships API Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🏆 Championships data received:', data);
        console.log('🏆 Total championships:', data?.length || 0);
        
        if (data && Array.isArray(data)) {
          data.forEach((championship: Championship, index: number) => {
            console.log(`🏆 Championship ${index + 1}:`, {
              id: championship.id,
              name: championship.name,
              status: championship.status
            });
          });
        }
        
        setChampionships(data);
      } else {
        console.error('❌ Championships API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Championships error response body:', errorText);
      }
    } catch (error) {
      console.error('💥 Error fetching championships:', error);
      console.error('💥 Championships error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  };

  const fetchMatches = async (championshipId: string) => {
    try {
      console.log('🔍 Fetching matches for championship ID:', championshipId);
      
      const response = await fetch(`/api/matches?championship_id=${championshipId}`);
      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response ok:', response.ok);
      
      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.matches || [];
        console.log('📊 Raw matches data received:', responseData);
        console.log('📊 Total matches received:', data?.length || 0);
        
        // Log each match status for debugging
        if (data && Array.isArray(data)) {
          data.forEach((match: Match, index: number) => {
            console.log(`🏀 Match ${index + 1}:`, {
              id: match.id,
              teamA: match.teamA?.name,
              teamB: match.teamB?.name,
              status: match.status,
              sport_type: match.sport_type,
              championship_id: match.championship_id
            });
          });
        }
        
        // Filter out matches with null team IDs
        const validMatches = data.filter((match: Match) => 
          match.team_a_id !== null && match.team_b_id !== null
        );
        
        console.log('✅ All matches loaded:', data);
        console.log('✅ Total matches:', data.length);
        console.log('✅ Valid matches (with teams):', validMatches.length);
        console.log('🚫 Filtered out matches with null team IDs:', data.length - validMatches.length);
        
        setMatches(validMatches);
        // Fetch scores for all matches
        await fetchAllMatchScores(validMatches);
      } else {
        console.error('❌ API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
      }
    } catch (error) {
      console.error('💥 Error fetching matches:', error);
      console.error('💥 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  };

  const fetchAllMatchScores = async (matchesData: Match[]) => {
    try {
      const matchesWithScoresData: MatchWithScores[] = await Promise.all(
        matchesData.map(async (match) => {
          if (match.status !== 'played') {
            return { ...match, team_a_score: undefined, team_b_score: undefined };
          }

          try {
            let team_a_score = 0;
            let team_b_score = 0;

            if (match.sport_type === 'basketball') {
              const response = await fetch(`/api/basketball-scores?match_id=${match.id}`);
              if (response.ok) {
                const responseData = await response.json();
                const scores = responseData.scores || [];
                // Filter team scores (not player scores) and sum points
                const teamScores = scores.filter((s: any) => !s.player_id);
                const teamAScore = teamScores.find((s: any) => s.team_id === match.team_a_id);
                const teamBScore = teamScores.find((s: any) => s.team_id === match.team_b_id);
                team_a_score = teamAScore?.points || 0;
                team_b_score = teamBScore?.points || 0;
              }
            } else if (match.sport_type === 'football') {
              const response = await fetch(`/api/football-scores?match_id=${match.id}`);
              if (response.ok) {
                const responseData = await response.json();
                const scores = responseData.scores || [];
                // Filter team scores (not player scores) and sum goals
                const teamScores = scores.filter((s: any) => !s.player_id);
                const teamAScore = teamScores.find((s: any) => s.team_id === match.team_a_id);
                const teamBScore = teamScores.find((s: any) => s.team_id === match.team_b_id);
                team_a_score = teamAScore?.goals || 0;
                team_b_score = teamBScore?.goals || 0;
              }
            }

            return { ...match, team_a_score, team_b_score };
          } catch (error) {
            console.error(`Error fetching scores for match ${match.id}:`, error);
            return { ...match, team_a_score: undefined, team_b_score: undefined };
          }
        })
      );

      setMatchesWithScores(matchesWithScoresData);
    } catch (error) {
      console.error('Error fetching all match scores:', error);
    }
  };

  const fetchPlayers = async (teamAId: number, teamBId: number) => {
    setIsLoadingPlayers(true);
    try {
      console.log('🎯 Fetching players for teams:', { teamAId, teamBId });
      const response = await fetch(`/api/players?team_a_id=${teamAId}&team_b_id=${teamBId}`);
      console.log('📡 Players API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Players data received:', data);
        console.log('👥 Total players:', data?.length || 0);
        
        // Ensure data is an array
        const playersArray = Array.isArray(data) ? data : [];
        setPlayers(playersArray);
        
        // Initialize individual stats for each player
        const teamAPlayers = playersArray.filter((p: Player) => p.team_id === teamAId);
        const teamBPlayers = playersArray.filter((p: Player) => p.team_id === teamBId);
        
        console.log('👥 Team A players:', teamAPlayers.length);
        console.log('👥 Team B players:', teamBPlayers.length);
        
        setIndividualStats({
          teamA: teamAPlayers.map((p: Player) => ({ player_id: p.id, points: 0, rebounds: 0, assists: 0, three_points_made: 0, three_points_attempted: 0 })),
          teamB: teamBPlayers.map((p: Player) => ({ player_id: p.id, points: 0, rebounds: 0, assists: 0, three_points_made: 0, three_points_attempted: 0 }))
        });
        
        // Initialize football individual stats for each player
        setFootballIndividualStats({
          teamA: teamAPlayers.map((p: Player) => ({ player_id: p.id, goals: 0, assists: 0, shots_on_target: 0, saves: 0 })),
          teamB: teamBPlayers.map((p: Player) => ({ player_id: p.id, goals: 0, assists: 0, shots_on_target: 0, saves: 0 }))
        });
        
        // Initialize selected players as empty
        setSelectedPlayers({
          teamA: [],
          teamB: []
        });
      } else {
        console.error('❌ Players API request failed with status:', response.status);
        const errorText = await response.text();
        console.error('❌ Players error response body:', errorText);
        setPlayers([]);
      }
    } catch (error) {
      console.error('💥 Error fetching players:', error);
      console.error('💥 Players error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      setPlayers([]);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadExistingMatchData = async (matchId: number) => {
    try {
      console.log('🔄 Loading existing match data for match ID:', matchId);
      
      // Fetch existing basketball scores if it's a basketball match
      if (selectedMatchData?.sport_type === 'basketball') {
        const scoresResponse = await fetch(`/api/basketball-scores?match_id=${matchId}`);
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          console.log('📊 Existing basketball scores data:', scoresData);
          
          if (scoresData && scoresData.length > 0) {
            // Separate team and individual scores
            const teamScores = scoresData.filter((score: any) => !score.player_id);
            const individualScores = scoresData.filter((score: any) => score.player_id);
            
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
                  assists: score.assists
                }));
              
              const teamBStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_b_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  points: score.points,
                  rebounds: score.rebounds,
                  assists: score.assists
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
        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          console.log('⚽ Existing football scores data:', scoresData);
          
          if (scoresData && scoresData.length > 0) {
            // Separate team and individual scores
            const teamScores = scoresData.filter((score: any) => !score.player_id);
            const individualScores = scoresData.filter((score: any) => score.player_id);
            
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
                  assists: score.assists
                }));
              
              const teamBStats = individualScores
                .filter((score: any) => score.team_id === selectedMatchData?.team_b_id)
                .map((score: any) => ({
                  player_id: score.player_id,
                  goals: score.goals,
                  assists: score.assists
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
      
      // Set winning team if match has a winner
      if (selectedMatchData?.winner_id) {
        setWinningTeam(selectedMatchData.winner_id.toString());
      }
      
    } catch (error) {
      console.error('Error loading existing match data:', error);
    }
  };

  const handlePlayerSelection = () => {
    // Filter individual stats to only show selected players
    const filteredStats = {
      teamA: individualStats.teamA.filter(stat => selectedPlayers.teamA.includes(stat.player_id)),
      teamB: individualStats.teamB.filter(stat => selectedPlayers.teamB.includes(stat.player_id))
    };
    
    setIndividualStats(filteredStats);
    setShowPlayerSelector(false);
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

  const handleSubmit = async () => {
    if (!selectedMatchData || !winningTeam) {
      setMessage({ type: "error", text: "Please select a match and winning team" });
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
      if (footballScores.teamA.goals === 0 && footballScores.teamB.goals === 0) {
        setMessage({ type: "error", text: "Please enter goals for both teams" });
        return;
      }
      
      // Validate that team statistics match individual player statistics
      if (!validateFootballStatistics()) {
        setMessage({ 
          type: "error", 
          text: "Team totals must match the sum of individual player statistics for goals and assists. Please check your entries." 
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
      }

      // Update match with winner, status, and team scores
      const matchUpdateResponse = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: selectedMatchData.id,
          winner_id: parseInt(winningTeam),
          status: 'played',
          team_a_score: teamAScore,
          team_b_score: teamBScore
        })
      });

      if (!matchUpdateResponse.ok) {
        throw new Error('Failed to update match');
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
            three_points_made: stat.three_points_made || 0,
            three_points_attempted: stat.three_points_attempted || 0,
            player_id: stat.player_id
          })),
          ...individualStats.teamB.map(stat => ({
            match_id: selectedMatchData.id,
            team_id: selectedMatchData.team_b_id,
            points: stat.points,
            rebounds: stat.rebounds,
            assists: stat.assists,
            three_points_made: stat.three_points_made || 0,
            three_points_attempted: stat.three_points_attempted || 0,
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
      
      setFootballIndividualStats({
        teamA: [],
        teamB: []
      });
      
      setIndividualStats({
        teamA: [],
        teamB: []
      });

      // Refresh matches and scores table
      if (selectedChampionship) {
        await fetchMatches(selectedChampionship);
      }

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
  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'ey': return 'bg-grade-1/50 text-grade-1/900 border-grade-1/300';
      case 's5': return 'bg-grade-2/50 text-grade-2/900 border-grade-2/300';
      case 's6': return 'bg-grade-3/50 text-grade-3/900 border-grade-3/300';
      case 's4': return 'bg-grade-4/50 text-grade-4/900 border-grade-4/300';
      default: return 'bg-gray-50/50 text-gray-900 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Header */}
      <div className="">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/60 rounded-lg border">
            <Trophy className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Record Match Results</h1>
            <p className="text-muted-foreground text-sm">Pick a match, set a winner, add the stats</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-b from-amber-50 to-white border-amber-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Championships</CardTitle>
            <Trophy className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{championships.length}</div>
            <p className="text-xs text-muted-foreground">Available championships</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-blue-50 to-white border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{matches.length}</div>
            <p className="text-xs text-muted-foreground">In selected championship</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-lime-50 to-white border-lime-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Played Matches</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {matches.filter(m => m.status === 'played').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed matches</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-b from-sky-50 to-white border-sky-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Matches</CardTitle>
            <Clock className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {matches.filter(m => m.status === 'scheduled').length}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled, not yet played</p>
          </CardContent>
        </Card>
      </div>

      {/* Selection Section */}
    <div className="flex gap-4">
            <div className="space-y-2">
              <Label htmlFor="championship-select" className="text-sm font-medium">
                Championship
              </Label>
              <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                <SelectTrigger id="championship-select">
                  <SelectValue placeholder="Select a championship" />
                </SelectTrigger>
                <SelectContent>
                  {championships.length == 0 && !isFetchingChampionships ?
                  <SelectItem value="loading" disabled>
                    <Loader2 className="size-4 animate-spin" />
                  </SelectItem>
                  :
                  isFetchingChampionships ?
                  <SelectItem value="loading" disabled>
                    <Loader2 className="size-4 animate-spin" />
                  </SelectItem>
                  :
                  championships.map((championship) => (
                    <SelectItem key={championship.id} value={championship.id.toString()}>
                      {championship.name} - {championship.status}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Match Selection */}
            {selectedChampionship && (
              <div className="space-y-2">
                <Label htmlFor="match-select" className="text-sm font-medium">
                  Match
                </Label>
                <div className="flex gap-2">
                  <Select value={selectedMatch} onValueChange={setSelectedMatch} className="flex-1">
                    <SelectTrigger id="match-select">
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
                  
                  {selectedMatch && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/live-score/${selectedMatch}`, '_blank')}
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
      {/* Match Details and Recording Form */}
      {selectedMatchData && selectedMatchData.teamA && selectedMatchData.teamB && (
        <div className="space-y-6">
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
                        individualStats.teamA.map((playerStat, index) => {
                          const player = players.find(p => p.id === playerStat.player_id);
                          return (
                            <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">
                                  {player?.first_name} {player?.last_name}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
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
                                <div>
                                  <Label className="text-xs">3PT Made</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.three_points_made}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, three_points_made: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">3PT Att</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={playerStat.three_points_attempted}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 0;
                                      setIndividualStats(prev => ({
                                        ...prev,
                                        teamA: prev.teamA.map((stat, i) => 
                                          i === index ? { ...stat, three_points_attempted: newValue } : stat
                                        )
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
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
                      
                      {individualStats.teamB.map((playerStat, index) => {
                        const player = players.find(p => p.id === playerStat.player_id);
                        return (
                          <div key={playerStat.player_id} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">
                                {player?.first_name} {player?.last_name}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
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
                              <div>
                                <Label className="text-xs">3PT Made</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={playerStat.three_points_made}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, three_points_made: newValue } : stat
                                      )
                                    }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">3PT Att</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={playerStat.three_points_attempted}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 0;
                                    setIndividualStats(prev => ({
                                      ...prev,
                                      teamB: prev.teamB.map((stat, i) => 
                                        i === index ? { ...stat, three_points_attempted: newValue } : stat
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
                      {/* Team Filter for Statistics */}
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
                        footballIndividualStats.teamA.map((playerStat, index) => {
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
                        })
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

                {/* Submit Button */}
                <div className="pt-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !winningTeam}
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
        </div>
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
              <p className="text-sm">All matches in this championship have been completed or are not yet scheduled.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Selection Modal */}
      {showPlayerSelector && selectedMatchData && players.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Players Who Played</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlayerSelector(false)}
                >
                  ✕
                </Button>
              </div>
              <CardDescription>Choose which players participated in this match</CardDescription>
            </CardHeader>
            <CardContent>
            
              <div className="space-y-6">
                {/* Team A Players */}
                <div>
                  <h4 className="font-medium mb-3">
                    {selectedMatchData.teamA.name} ({selectedMatchData.teamA.grade})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {players
                      .filter(p => p && p.team_id === selectedMatchData.team_a_id)
                      .map(player => (
                        <label key={player.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.teamA.includes(player.id)}
                            onChange={() => togglePlayerSelection(player.team_id, player.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>

                {/* Team B Players */}
                <div>
                  <h4 className="font-medium mb-3">
                    {selectedMatchData.teamB.name} ({selectedMatchData.teamB.grade})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {players
                      .filter(p => p && p.team_id === selectedMatchData.team_b_id)
                      .map(player => (
                        <label key={player.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.teamB.includes(player.id)}
                            onChange={() => togglePlayerSelection(player.team_id, player.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPlayerSelector(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlayerSelection}
                  disabled={selectedPlayers.teamA.length === 0 && selectedPlayers.teamB.length === 0}
                >
                  Confirm Selection ({selectedPlayers.teamA.length + selectedPlayers.teamB.length} players)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matches Table with Scores */}
      {selectedChampionship && matchesWithScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              All Matches with Scores
            </CardTitle>
            <CardDescription>Complete list of matches in this championship with their scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Match</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sport</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Team A Score</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Team B Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Winner</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matchesWithScores.map((match) => (
                    <tr key={match.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{match.teamA?.name || 'Unknown'}</span>
                            <Badge variant="outline" className="text-xs">{match.teamA?.grade || 'N/A'}</Badge>
                          </div>
                          <div className="text-xs text-gray-500">vs</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{match.teamB?.name || 'Unknown'}</span>
                            <Badge variant="outline" className="text-xs">{match.teamB?.grade || 'N/A'}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{getSportIcon(match.sport_type)}</span>
                          <span className="text-sm capitalize">{match.sport_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${match.winner_id === match.team_a_id ? 'text-green-600' : 'text-gray-900'}`}>
                          {match.team_a_score !== undefined ? match.team_a_score : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${match.winner_id === match.team_b_id ? 'text-green-600' : 'text-gray-900'}`}>
                          {match.team_b_score !== undefined ? match.team_b_score : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {match.winner_id ? (
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {match.winner_id === match.team_a_id ? match.teamA?.name : match.teamB?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(match.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
