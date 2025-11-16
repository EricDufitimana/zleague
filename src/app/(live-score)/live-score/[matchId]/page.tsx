'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Users, Clock, Target, CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import { createMultipleBasketballScores } from '@/actions/livescore/basketball-update';
import { useRealtimeBasketballScores } from '@/hooks/useRealtimeBasketballScores';
import { useUpdateBasketballScore } from '@/hooks/useUpdateBasketballScore';

interface Team {
  id: number;
  name: string;
  grade: string;
  gender: string;
}

interface Match {
  id: number;
  team_a_id: number;
  team_b_id: number;
  sport_type: string;
  gender: string;
  status: string;
  match_time?: string;
  teamA?: Team;
  teamB?: Team;
  championship?: {
    id: number;
    name: string;
  };
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  team_id: number;
}

interface PlayerStats {
  player_id: number;
  points: number;
  rebounds: number;
  assists: number;
  three_points_made?: number;
  three_points_attempted?: number;
}

export default function LiveScorePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [isEndingMatch, setIsEndingMatch] = useState(false);
  const [showEndMatchDialog, setShowEndMatchDialog] = useState(false);
  const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
  
  // History tracking for undo
  const [updateHistory, setUpdateHistory] = useState<Array<{
    id: string;
    playerId: string;
    teamId: string;
    statType: 'points' | 'rebounds' | 'assists';
    value: number;
    timestamp: number;
    playerName?: string;
  }>>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  
  const [selectedPlayers, setSelectedPlayers] = useState<{
    teamA: number[];
    teamB: number[];
  }>({
    teamA: [],
    teamB: []
  });

  // ✅ Fetch match data with React Query
  const { data: match, isLoading: isLoadingMatch } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const response = await fetch(`/api/matches?match_id=${matchId}`);
      if (!response.ok) throw new Error('Failed to fetch match');
      const data = await response.json();
      return data.match as Match;
    },
    enabled: !!matchId,
  });

  // ✅ Fetch players with React Query
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['players', match?.team_a_id, match?.team_b_id],
    queryFn: async () => {
      if (!match?.team_a_id || !match?.team_b_id) return [];
      
      const response = await fetch(`/api/players?team_a_id=${match.team_a_id}&team_b_id=${match.team_b_id}`);
      if (!response.ok) {
        console.error('Failed to fetch players');
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!match?.team_a_id && !!match?.team_b_id,
  });

  // ✅ Use realtime hook - this now returns React Query data
  const { scores, matchScores, isLoading: isLoadingScores } = useRealtimeBasketballScores(matchId);
  
  // ✅ Use React Query mutation hook for score updates
  const updateScoreMutation = useUpdateBasketballScore(matchId);

  // ✅ Derive playerStats from scores (no local state needed)
  const playerStats: PlayerStats[] = scores
    .filter((score: any) => score.player_id)
    .map((score: any) => ({
      player_id: score.player_id,
      points: score.points || 0,
      rebounds: score.rebounds || 0,
      assists: score.assists || 0,
      three_points_made: score.three_points_made || 0,
      three_points_attempted: score.three_points_attempted || 0
    }));

  // ✅ Update selected players when scores change (only once on mount)
  useEffect(() => {
    if (scores.length > 0 && match && selectedPlayers.teamA.length === 0 && selectedPlayers.teamB.length === 0) {
      const teamAPlayers = scores
        .filter((score: any) => score.team_id === match.team_a_id && score.player_id)
        .map((score: any) => score.player_id);
      
      const teamBPlayers = scores
        .filter((score: any) => score.team_id === match.team_b_id && score.player_id)
        .map((score: any) => score.player_id);
      
      if (teamAPlayers.length > 0 || teamBPlayers.length > 0) {
        setSelectedPlayers({
          teamA: teamAPlayers,
          teamB: teamBPlayers
        });
      }
    }
  }, [scores, match]); // Removed selectedPlayers from deps to prevent loops

  // ✅ Calculate team scores from playerStats
  const teamAScore = playerStats
    .filter(stat => players.find(p => p.id === stat.player_id)?.team_id === match?.team_a_id)
    .reduce((total, stat) => total + stat.points, 0);

  const teamBScore = playerStats
    .filter(stat => players.find(p => p.id === stat.player_id)?.team_id === match?.team_b_id)
    .reduce((total, stat) => total + stat.points, 0);


  const updatePlayerStats = async (
    playerId: string, 
    teamId: string, 
    statType: 'points' | 'rebounds' | 'assists', 
    value: number
  ) => {
    // Prepare increment values
    const incrementStats = {
      points: statType === 'points' ? value : 0,
      rebounds: statType === 'rebounds' ? value : 0,
      assists: statType === 'assists' ? value : 0,
      three_points_made: 0,
      three_points_attempted: 0
    };

    // Generate unique ID for this update
    const updateId = `${Date.now()}-${playerId}-${statType}`;
    
    // Find player name for better history display
    const player = players.find(p => p.id === parseInt(playerId));
    const playerName = player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`;

    // Add to history BEFORE making changes
    setUpdateHistory(prev => [...prev, {
      id: updateId,
      playerId,
      teamId,
      statType,
      value,
      timestamp: Date.now(),
      playerName
    }]);

    // Use React Query mutation - it handles queuing, optimistic updates, and rollback automatically
    updateScoreMutation.mutate({
      matchId,
      teamId,
      playerId,
      points: incrementStats.points,
      rebounds: incrementStats.rebounds,
      assists: incrementStats.assists,
      threePointsMade: incrementStats.three_points_made,
      threePointsAttempted: incrementStats.three_points_attempted
    }, {
      onError: (error) => {
        console.error('❌ Error updating stats:', error);
        // Remove from history if API fails
        setUpdateHistory(prev => prev.filter(item => item.id !== updateId));
      }
    });
  };

  const undoLastUpdate = async () => {
    if (updateHistory.length === 0) {
      alert('Nothing to undo!');
      return;
    }

    if (isUndoing || updateScoreMutation.isPending) {
      console.log('⏳ Already undoing or update in progress...');
      return;
    }

    setIsUndoing(true);

    try {
      // Get the last update from history
      const lastUpdate = updateHistory[updateHistory.length - 1];
      console.log('🔙 Undoing update:', lastUpdate);

      // Prepare NEGATIVE increment values (to subtract)
      const incrementStats = {
        points: lastUpdate.statType === 'points' ? -lastUpdate.value : 0,
        rebounds: lastUpdate.statType === 'rebounds' ? -lastUpdate.value : 0,
        assists: lastUpdate.statType === 'assists' ? -lastUpdate.value : 0,
        three_points_made: 0,
        three_points_attempted: 0
      };

      // Use React Query mutation for undo - it handles queuing and optimistic updates
      updateScoreMutation.mutate({
        matchId,
        teamId: lastUpdate.teamId,
        playerId: lastUpdate.playerId,
        points: incrementStats.points,
        rebounds: incrementStats.rebounds,
        assists: incrementStats.assists,
        threePointsMade: incrementStats.three_points_made,
        threePointsAttempted: incrementStats.three_points_attempted
      }, {
        onSuccess: () => {
          // Remove from history on success
          setUpdateHistory(prev => prev.slice(0, -1));
          console.log('✅ Undo successful');
          setIsUndoing(false);
        },
        onError: (error) => {
          console.error('❌ Error undoing update:', error);
          setIsUndoing(false);
        }
      });

    } catch (error) {
      console.error('❌ Error in undo:', error);
      setIsUndoing(false);
    }
  };

  const getTeamPlayers = (teamId: number) => {
    return players.filter(player => player.team_id === teamId);
  };

  const handleEndMatch = async () => {
    try {
      setIsEndingMatch(true);
      
      // Determine winner based on scores
      const winnerId = teamAScore > teamBScore ? match?.team_a_id : 
                      teamBScore > teamAScore ? match?.team_b_id : null;
      
      // Update match status to 'played' and set winner
      const response = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: parseInt(matchId),
          status: 'played',
          winner_id: winnerId,
          team_a_score: teamAScore,
          team_b_score: teamBScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end match');
      }

      // Close dialog and redirect to main page
      setShowEndMatchDialog(false);
      router.push('/dashboard/record');
    } catch (error) {
      console.error('Error ending match:', error);
      setIsEndingMatch(false);
    }
  };

  const getPlayerStats = (playerId: number) => {
    return playerStats.find(stat => stat.player_id === playerId) || {
      player_id: playerId,
      points: 0,
      rebounds: 0,
      assists: 0,
      three_points_made: 0,
      three_points_attempted: 0
    };
  };

  const handlePlayerSelection = async () => {
    try {
      setIsCreatingPlayers(true);
      
      // Prepare all selected players for bulk creation
      const allSelectedPlayers = [...selectedPlayers.teamA, ...selectedPlayers.teamB];
      const playersToCreate = allSelectedPlayers.map(playerId => {
        const player = players.find(p => p.id === playerId);
        return {
          teamId: player?.team_id.toString() || '',
          playerId: playerId.toString()
        };
      }).filter(p => p.teamId); // Filter out any invalid entries
      
      if (playersToCreate.length > 0) {
        // Create all basketball score entries at once
        await createMultipleBasketballScores(matchId, playersToCreate);
      }
      
      setShowPlayerSelector(false);
    } catch (error) {
      console.error('Error creating player score entries:', error);
      // Still close the modal even if there's an error
      setShowPlayerSelector(false);
    } finally {
      setIsCreatingPlayers(false);
    }
  };

  const togglePlayerSelection = (teamId: number, playerId: number) => {
    setSelectedPlayers(prev => {
      const teamKey = teamId === match?.team_a_id ? 'teamA' : 'teamB';
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

  const getFilteredTeamPlayers = (teamId: number) => {
    const teamPlayers = getTeamPlayers(teamId);
    const teamKey = teamId === match?.team_a_id ? 'teamA' : 'teamB';
    const selectedTeamPlayers = selectedPlayers[teamKey];
    
    // If no players are selected, show all players
    if (selectedTeamPlayers.length === 0) {
      return teamPlayers;
    }
    
    // Show only selected players
    return teamPlayers.filter(player => selectedTeamPlayers.includes(player.id));
  };

  const isLoading = isLoadingMatch || isLoadingPlayers || isLoadingScores;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Match Not Found</h1>
          <p className="text-gray-600 mb-6">The match you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard/schedule')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schedule
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard/schedule')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Schedule
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Live Score Update</h1>
                <p className="text-sm text-gray-600">{match.championship?.name || 'Championship'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{match.sport_type}</Badge>
              <Badge variant="secondary" className="capitalize">{match.gender}</Badge>
              
              {/* Undo Button */}
              <Button
                onClick={undoLastUpdate}
                disabled={isUndoing || updateScoreMutation.isPending || updateHistory.length === 0}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                {isUndoing || updateScoreMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Undo Last ({updateHistory.length})
                  </div>
                )}
              </Button>
              
              <Button
                onClick={() => setShowEndMatchDialog(true)}
                disabled={isEndingMatch}
                variant="destructive"
                size="sm"
                className="ml-4"
              >
                {isEndingMatch ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ending Match...
                  </div>
                ) : (
                  'End Match'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scoreboard */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-900 mb-2">{teamAScore}</div>
                <div className="text-xl font-semibold text-gray-700 uppercase">
                  {match.teamA?.name || `Team ${match.team_a_id}`}
                </div>
              </div>
              
              <div className="mx-8 text-center">
                <div className="text-2xl font-bold text-gray-500 mb-2">VS</div>
              
              </div>
              
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-900 mb-2">{teamBScore}</div>
                <div className="text-xl font-semibold text-gray-700 uppercase">
                  {match.teamB?.name || `Team ${match.team_b_id}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Section */}
        {!isLoadingPlayers && players.length > 0 && selectedPlayers.teamA.length + selectedPlayers.teamB.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Points & Stats</CardTitle>
              <CardDescription>Click buttons to add points, rebounds, or assists for each player</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team A Action Buttons */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {match.teamA?.name || `Team ${match.team_a_id}`}
                  </h3>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {getFilteredTeamPlayers(match.team_a_id).map((player) => (
                        <div key={player.id} className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">{player.first_name} {player.last_name}</div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 2)}
                              className="h-8 w-12 text-xs"
                            >
                              +2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 3)}
                              className="h-8 w-12 text-xs"
                            >
                              +3
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'rebounds', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              R+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'assists', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              A+1
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team B Action Buttons */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    {match.teamB?.name || `Team ${match.team_b_id}`}
                  </h3>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {getFilteredTeamPlayers(match.team_b_id).map((player) => (
                        <div key={player.id} className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">{player.first_name} {player.last_name}</div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 2)}
                              className="h-8 w-12 text-xs"
                            >
                              +2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 3)}
                              className="h-8 w-12 text-xs"
                            >
                              +3
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'rebounds', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              R+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'assists', 1)}
                              className="h-8 w-12 text-xs"
                            >
                              A+1
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Player Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Player Statistics</h3>
                <p className="text-sm text-gray-600">
                  {selectedPlayers.teamA.length + selectedPlayers.teamB.length > 0 
                    ? `${selectedPlayers.teamA.length + selectedPlayers.teamB.length} players selected`
                    : 'No players selected yet'
                  }
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPlayerSelector(true)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Choose Who Played
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPlayers.teamA.length + selectedPlayers.teamB.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Selected</h3>
                <p className="text-gray-600 mb-6">Choose which players are participating in this match to start tracking statistics.</p>
          
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team A Players */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  {match.teamA?.name || `Team ${match.team_a_id}`}
                </h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 border-b">
                    <div className="font-semibold text-gray-700">PLAYER</div>
                    <div className="font-semibold text-gray-700 text-center">PTS</div>
                    <div className="font-semibold text-gray-700 text-center">REB</div>
                    <div className="font-semibold text-gray-700 text-center">AST</div>
                  </div>
                  {isLoadingPlayers ? (
                    <div className="text-center py-4 text-gray-500">
                      <Loader2 className="size-4 animate-spin mx-auto mb-2" />
                      Loading players...
                    </div>
                  ) : players.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No players found for this team. Please add players to the team first.
                    </div>
                  ) : (
                    getFilteredTeamPlayers(match.team_a_id).map((player, index) => {
                      const stats = getPlayerStats(player.id);
                      return (
                        <div key={player.id} className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                            <span className="font-medium text-gray-900">{player.first_name} {player.last_name}</span>
                          </div>
                          <div className="text-center font-semibold text-gray-900">{stats.points}</div>
                          <div className="text-center font-semibold text-gray-900">{stats.rebounds}</div>
                          <div className="text-center font-semibold text-gray-900">{stats.assists}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Team B Players */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  {match.teamB?.name || `Team ${match.team_b_id}`}
                </h3>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-green-50 border-b">
                    <div className="font-semibold text-gray-700">PLAYER</div>
                    <div className="font-semibold text-gray-700 text-center">PTS</div>
                    <div className="font-semibold text-gray-700 text-center">REB</div>
                    <div className="font-semibold text-gray-700 text-center">AST</div>
                  </div>
                  {isLoadingPlayers ? (
                    <div className="text-center py-4 text-gray-500">
                      <Loader2 className="size-4 animate-spin mx-auto mb-2" />
                      Loading players...
                    </div>
                  ) : players.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No players found for this team. Please add players to the team first.
                    </div>
                  ) : (
                    getFilteredTeamPlayers(match.team_b_id).map((player, index) => {
                      const stats = getPlayerStats(player.id);
                      return (
                        <div key={player.id} className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                            <span className="font-medium text-gray-900">{player.first_name} {player.last_name}</span>
                          </div>
                          <div className="text-center font-semibold text-gray-900">{stats.points}</div>
                          <div className="text-center font-semibold text-gray-900">{stats.rebounds}</div>
                          <div className="text-center font-semibold text-gray-900">{stats.assists}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Player Selection Modal */}
        {showPlayerSelector && match && players.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team A Players */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      {match.teamA?.name || `Team ${match.team_a_id}`}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {players
                        .filter(p => p && p.team_id === match.team_a_id)
                        .map(player => (
                          <label key={player.id} className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border hover:bg-blue-50">
                            <input
                              type="checkbox"
                              checked={selectedPlayers.teamA.includes(player.id)}
                              onChange={() => togglePlayerSelection(player.team_id, player.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm font-medium">
                              {player?.first_name || 'Unknown'} {player?.last_name || 'Player'}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Team B Players */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      {match.teamB?.name || `Team ${match.team_b_id}`}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {players
                        .filter(p => p && p.team_id === match.team_b_id)
                        .map(player => (
                          <label key={player.id} className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border hover:bg-green-50">
                            <input
                              type="checkbox"
                              checked={selectedPlayers.teamB.includes(player.id)}
                              onChange={() => togglePlayerSelection(player.team_id, player.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm font-medium">
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
                  disabled={selectedPlayers.teamA.length === 0 && selectedPlayers.teamB.length === 0 || isCreatingPlayers}
                >
                  {isCreatingPlayers ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Entries...
                    </div>
                  ) : (
                    `Confirm Selection (${selectedPlayers.teamA.length + selectedPlayers.teamB.length} players)`
                  )}
                </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* End Match Confirmation Dialog */}
      {showEndMatchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">End Match</CardTitle>
              <CardDescription>
                Are you sure you want to end this match? 
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEndMatchDialog(false)}
                  disabled={isEndingMatch}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEndMatch}
                  disabled={isEndingMatch}
                >
                  {isEndingMatch ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ending...
                    </div>
                  ) : (
                    'End Match'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}