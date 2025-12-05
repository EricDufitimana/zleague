'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trophy, Users, Clock, Target, CheckCircle, Loader2, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { createMultipleBasketballScores } from '@/actions/livescore/basketball-update';
import { useRealtimeBasketballScores } from '@/hooks/useRealtimeBasketballScores';
import { useMutationQueue } from '@/hooks/useMutationQueue';

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

// ✅ localStorage key for persisting jersey numbers
const JERSEY_STORAGE_KEY = 'basketball-jersey-numbers';

// ✅ Helper functions for localStorage persistence
function saveJerseyNumbersToStorage(matchId: string, jerseyNumbers: { [playerId: number]: string }) {
  try {
    const allJerseys = JSON.parse(localStorage.getItem(JERSEY_STORAGE_KEY) || '{}');
    allJerseys[matchId] = jerseyNumbers;
    localStorage.setItem(JERSEY_STORAGE_KEY, JSON.stringify(allJerseys));
  } catch (error) {
    console.error('❌ Failed to save jersey numbers to localStorage:', error);
  }
}

function loadJerseyNumbersFromStorage(matchId: string): { [playerId: number]: string } {
  try {
    const allJerseys = JSON.parse(localStorage.getItem(JERSEY_STORAGE_KEY) || '{}');
    const jerseys = allJerseys[matchId] || {};
    // Convert string keys back to numbers
    const result: { [playerId: number]: string } = {};
    Object.keys(jerseys).forEach(key => {
      result[parseInt(key)] = jerseys[key];
    });
    return result;
  } catch (error) {
    console.error('❌ Failed to load jersey numbers from localStorage:', error);
    return {};
  }
}

export default function LiveScorePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const matchId = params.matchId as string;
  
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [isEndingMatch, setIsEndingMatch] = useState(false);
  const [showEndMatchDialog, setShowEndMatchDialog] = useState(false);
  const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // ✅ Track mutation queue status
  
  // ✅ Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // History tracking for undo
  const [updateHistory, setUpdateHistory] = useState<Array<{
    id: string;
    playerId: string;
    teamId: string;
    statType: 'points' | 'rebounds' | 'assists' | 'three_points_attempted' | 'three_points_made';
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

  // Store jersey numbers for players: { playerId: jerseyNumber }
  const [jerseyNumbers, setJerseyNumbers] = useState<{ [playerId: number]: string }>({});
  
  // Track duplicate jersey numbers: { playerId: true } if duplicate
  const [duplicateJerseys, setDuplicateJerseys] = useState<{ [playerId: number]: boolean }>({});
  
  // Quick search by jersey number
  const [jerseySearch, setJerseySearch] = useState<{ teamA: string; teamB: string }>({ teamA: '', teamB: '' });

  // ✅ EY player names state: { teamId: Array<{firstName: string, lastName: string}> }
  const [eyPlayerNames, setEyPlayerNames] = useState<{
    [teamId: number]: Array<{ firstName: string; lastName: string }>;
  }>({});

  // ✅ Load jersey numbers from localStorage on mount
  useEffect(() => {
    if (!matchId) return;
    
    const savedJerseys = loadJerseyNumbersFromStorage(matchId);
    if (Object.keys(savedJerseys).length > 0) {
      console.log('💾 [JERSEY] Loaded jersey numbers from localStorage:', savedJerseys);
      setJerseyNumbers(savedJerseys);
    }
  }, [matchId]);

  // ✅ Save jersey numbers to localStorage whenever they change
  useEffect(() => {
    if (!matchId || Object.keys(jerseyNumbers).length === 0) return;
    
    saveJerseyNumbersToStorage(matchId, jerseyNumbers);
  }, [jerseyNumbers, matchId]);

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
  const { queueUpdate, queueLength, isProcessing } = useMutationQueue(matchId);

  // ✅ Check if teams are EY grade
  const isEYMatch = match?.teamA?.grade?.toLowerCase() === 'ey' || match?.teamB?.grade?.toLowerCase() === 'ey';

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
      statType: 'points' | 'rebounds' | 'assists' | 'three_points_attempted' | 'three_points_made', 
      value: number
    ) => {
      const incrementStats = {
        points: statType === 'points' ? value : 0,
        rebounds: statType === 'rebounds' ? value : 0,
        assists: statType === 'assists' ? value : 0,
        three_points_made: statType === 'three_points_made' ? value : 0,
        three_points_attempted: statType === 'three_points_attempted' ? value : 0
      };
    
      const updateId = `${Date.now()}-${playerId}-${statType}`;
      const player = players.find(p => p.id === parseInt(playerId));
      const playerName = player ? `${player.first_name} ${player.last_name}` : `Player ${playerId}`;
    
      // Add to history for undo
      setUpdateHistory(prev => [...prev, {
        id: updateId,
        playerId,
        teamId,
        statType,
        value,
        timestamp: Date.now(),
        playerName
      }]);
    
      try {
        // ✅ Queue the update - UI updates instantly, execution is sequential
        await queueUpdate({
          teamId,
          playerId,
          points: incrementStats.points,
          rebounds: incrementStats.rebounds,
          assists: incrementStats.assists,
          threePointsMade: incrementStats.three_points_made,
          threePointsAttempted: incrementStats.three_points_attempted
        });
        
        console.log('✅ Update completed successfully');
      } catch (error) {
        console.error('❌ Error updating stats:', error);
        // Remove from history on error
        setUpdateHistory(prev => prev.filter(item => item.id !== updateId));
      }
    };
    
    const undoLastUpdate = async () => {
      if (updateHistory.length === 0 || isUndoing) return;
    
      setIsUndoing(true);
      const lastUpdate = updateHistory[updateHistory.length - 1];
    
      const incrementStats = {
        points: lastUpdate.statType === 'points' ? -lastUpdate.value : 0,
        rebounds: lastUpdate.statType === 'rebounds' ? -lastUpdate.value : 0,
        assists: lastUpdate.statType === 'assists' ? -lastUpdate.value : 0,
        three_points_made: lastUpdate.statType === 'three_points_made' ? -lastUpdate.value : 0,
        three_points_attempted: lastUpdate.statType === 'three_points_attempted' ? -lastUpdate.value : 0
      };
    
      try {
        await queueUpdate({
          teamId: lastUpdate.teamId,
          playerId: lastUpdate.playerId,
          points: incrementStats.points,
          rebounds: incrementStats.rebounds,
          assists: incrementStats.assists,
          threePointsMade: incrementStats.three_points_made,
          threePointsAttempted: incrementStats.three_points_attempted
        });
    
        setUpdateHistory(prev => prev.slice(0, -1));
        setIsUndoing(false);
      } catch (error) {
        console.error('❌ Error undoing update:', error);
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
      
      let finalPlayersToCreate: Array<{ teamId: string; playerId: string }> = [];
      let newEyPlayersCreated = 0;
      
      // ✅ If EY match, create players first from typed names
      if (isEYMatch) {
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
          newEyPlayersCreated = eyPlayersToCreate.length;
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
          
          // Add created players to final list
          finalPlayersToCreate = createdPlayers.map((p: any) => ({
            teamId: p.team_id.toString(),
            playerId: p.id.toString()
          }));

          // Refresh players list and wait for it to complete
          await queryClient.invalidateQueries({ queryKey: ['players', match?.team_a_id, match?.team_b_id] });
          // Wait a bit for the query to refetch
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // ✅ Add existing selected players (non-EY or if EY players were already in the list)
      const allSelectedPlayers = [...selectedPlayers.teamA, ...selectedPlayers.teamB];
      const existingPlayersToCreate = allSelectedPlayers
        .filter(playerId => {
          // Don't include if we just created this player
          return !finalPlayersToCreate.some(p => p.playerId === playerId.toString());
        })
        .map(playerId => {
          const player = players.find(p => p.id === playerId);
          return {
            teamId: player?.team_id.toString() || '',
            playerId: playerId.toString()
          };
        })
        .filter(p => p.teamId);
      
      finalPlayersToCreate = [...finalPlayersToCreate, ...existingPlayersToCreate];
      
      if (finalPlayersToCreate.length > 0) {
        // Create all basketball score entries at once
        await createMultipleBasketballScores(matchId, finalPlayersToCreate);
      }
      
      // Clear EY names after successful creation (but keep modal open if EY match so user can add jersey numbers)
      setEyPlayerNames({});
      
      // Only close modal if no new EY players were created (user can add jersey numbers to existing ones)
      if (!isEYMatch || newEyPlayersCreated === 0) {
        setShowPlayerSelector(false);
      }
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
      const teamKey = teamId === match?.team_a_id ? 'teamA' : 'teamB';
      const currentSelected = prev[teamKey];
      
      if (currentSelected.includes(playerId)) {
        // Remove player, their jersey number, and duplicate flag
        setJerseyNumbers(prevJerseys => {
          const newJerseys = { ...prevJerseys };
          const removedJersey = newJerseys[playerId]?.trim().toUpperCase();
          delete newJerseys[playerId];
          
          // Re-check duplicates for remaining players if we removed a jersey
          if (removedJersey) {
            const remainingPlayers = currentSelected.filter(id => id !== playerId);
            remainingPlayers.forEach(otherPlayerId => {
              const otherJersey = newJerseys[otherPlayerId]?.trim().toUpperCase();
              if (otherJersey === removedJersey) {
                // Check if this player still has a duplicate
                const stillDuplicate = remainingPlayers.some(checkPlayerId => {
                  if (checkPlayerId === otherPlayerId) return false;
                  return newJerseys[checkPlayerId]?.trim().toUpperCase() === otherJersey;
                });
                
                setDuplicateJerseys(prev => ({
                  ...prev,
                  [otherPlayerId]: stillDuplicate
                }));
              }
            });
          }
          
          return newJerseys;
        });
        
        setDuplicateJerseys(prev => {
          const newDups = { ...prev };
          delete newDups[playerId];
          return newDups;
        });
        
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

  const updateJerseyNumber = (playerId: number, jerseyNumber: string, teamId: number) => {
    // Find the team key
    const teamKey = teamId === match?.team_a_id ? 'teamA' : 'teamB';
    const selectedTeamPlayers = selectedPlayers[teamKey];
    
    // Calculate what the updated jerseys will be
    const updatedJerseys = {
      ...jerseyNumbers,
      [playerId]: jerseyNumber
    };
    
    // Check for duplicates within the same team after update
    const newDuplicateJerseys: { [playerId: number]: boolean } = {};
    
    selectedTeamPlayers.forEach(currentPlayerId => {
      const currentJersey = updatedJerseys[currentPlayerId]?.trim().toUpperCase();
      if (!currentJersey) {
        // No jersey number, no duplicate
        return;
      }
      
      // Check if any other player on the same team has this jersey number
      const hasDuplicate = selectedTeamPlayers.some(otherPlayerId => {
        if (otherPlayerId === currentPlayerId) return false; // Don't check against self
        const otherJersey = updatedJerseys[otherPlayerId]?.trim().toUpperCase();
        return otherJersey && otherJersey === currentJersey;
      });
      
      if (hasDuplicate) {
        newDuplicateJerseys[currentPlayerId] = true;
      }
    });
    
    // Update jersey numbers (this will trigger the useEffect to save to localStorage)
    setJerseyNumbers(updatedJerseys);
    
    // Update duplicate tracking
    setDuplicateJerseys(prev => {
      const updated = { ...prev };
      // Update duplicates for all players on this team
      selectedTeamPlayers.forEach(id => {
        if (newDuplicateJerseys[id]) {
          updated[id] = true;
        } else {
          delete updated[id];
        }
      });
      return updated;
    });
  };

  const getFilteredTeamPlayers = (teamId: number) => {
    const teamPlayers = getTeamPlayers(teamId);
    const teamKey = teamId === match?.team_a_id ? 'teamA' : 'teamB';
    const selectedTeamPlayers = selectedPlayers[teamKey];
    const searchTerm = jerseySearch[teamKey].trim().toLowerCase();
    
    // If no players are selected, show all players
    let filtered = selectedTeamPlayers.length === 0 
      ? teamPlayers 
      : teamPlayers.filter(player => selectedTeamPlayers.includes(player.id));
    
    // Filter by jersey number or name if search term exists
    if (searchTerm) {
      filtered = filtered.filter(player => {
        const jerseyNum = jerseyNumbers[player.id]?.toLowerCase() || '';
        const playerName = `${player.first_name} ${player.last_name}`.toLowerCase();
        return jerseyNum.includes(searchTerm) || playerName.includes(searchTerm);
      });
    }
    
    return filtered;
  };

  // ✅ Recalculate duplicates when jersey numbers or selected players change
  useEffect(() => {
    if (!match) return;
    
    const newDuplicateJerseys: { [playerId: number]: boolean } = {};
    
    selectedPlayers.teamA.forEach(playerId => {
      const jersey = jerseyNumbers[playerId]?.trim().toUpperCase();
      if (jersey) {
        const hasDuplicate = selectedPlayers.teamA.some(otherId => {
          if (otherId === playerId) return false;
          return jerseyNumbers[otherId]?.trim().toUpperCase() === jersey;
        });
        if (hasDuplicate) {
          newDuplicateJerseys[playerId] = true;
        }
      }
    });
    
    selectedPlayers.teamB.forEach(playerId => {
      const jersey = jerseyNumbers[playerId]?.trim().toUpperCase();
      if (jersey) {
        const hasDuplicate = selectedPlayers.teamB.some(otherId => {
          if (otherId === playerId) return false;
          return jerseyNumbers[otherId]?.trim().toUpperCase() === jersey;
        });
        if (hasDuplicate) {
          newDuplicateJerseys[playerId] = true;
        }
      }
    });
    
    setDuplicateJerseys(newDuplicateJerseys);
  }, [jerseyNumbers, selectedPlayers, match]);

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
      <div className="bg-white shadow-sm border-b overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="flex flex-col md:hidden gap-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/dashboard/schedule')}
                  className="flex items-center gap-1.5 h-10 sm:h-12 flex-shrink-0 px-3 sm:px-4"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Back</span>
                </Button>
                <div className="h-5 w-px bg-gray-300" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-semibold text-gray-900 truncate">Live Score</h1>
                  <p className="text-xs text-gray-600 truncate">{match.championship?.name || 'Championship'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant="outline" className="capitalize text-xs px-1.5 py-0">{match.sport_type}</Badge>
                <Badge variant="secondary" className="capitalize text-xs px-1.5 py-0">{match.gender}</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                {!isOnline && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs px-1.5 py-0">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {queueLength > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs px-1.5 py-0">
                    ⏳ {queueLength}
                  </Badge>
                )}
                {isOnline && queueLength === 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs px-1.5 py-0">
                    <Wifi className="w-3 h-3 mr-1" />
                    Synced
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={undoLastUpdate}
                  disabled={isUndoing || updateHistory.length === 0}
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-12 px-3 sm:px-4 text-sm"
                >
                  {isUndoing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      {updateHistory.length}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowEndMatchDialog(true)}
                  disabled={isEndingMatch}
                  variant="destructive"
                  size="sm"
                  className="h-10 sm:h-12 px-4 sm:px-5 text-sm"
                >
                  {isEndingMatch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'End'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tablet & Desktop Layout */}
          <div className="hidden md:flex items-center justify-between h-16 gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard/schedule')}
                className="flex items-center gap-2 h-10 md:h-12 lg:h-10 flex-shrink-0"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span>Back to Schedule</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">Live Score Update</h1>
                <p className="text-sm text-gray-600 truncate">{match.championship?.name || 'Championship'}</p>
              </div>
            </div>

            {/* Center Section - Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="capitalize">{match.sport_type}</Badge>
              <Badge variant="secondary" className="capitalize">{match.gender}</Badge>
              {!isOnline && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
              {queueLength > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  ⏳ {queueLength} queued
                </Badge>
              )}
              {isOnline && queueLength === 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <Wifi className="w-3 h-3 mr-1" />
                  Synced
                </Badge>
              )}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={undoLastUpdate}
                disabled={isUndoing || updateHistory.length === 0}
                variant="outline"
                size="sm"
                className="h-10 md:h-12 lg:h-10"
              >
                {isUndoing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                    Undo ({updateHistory.length})
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowEndMatchDialog(true)}
                disabled={isEndingMatch}
                variant="destructive"
                size="sm"
                className="h-10 md:h-12 lg:h-10"
              >
                {isEndingMatch ? (
                  <>
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                    Ending Match...
                  </>
                ) : (
                  'End Match'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      {match.teamA?.name || `Team ${match.team_a_id}`}
                    </h3>
                    <Input
                      type="text"
                      placeholder="Search jersey/name"
                      value={jerseySearch.teamA}
                      onChange={(e) => setJerseySearch(prev => ({ ...prev, teamA: e.target.value }))}
                      className="w-32 sm:w-40 h-8 text-sm"
                    />
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {getFilteredTeamPlayers(match.team_a_id).map((player) => (
                        <div key={player.id} className="space-y-2">
                          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            {jerseyNumbers[player.id] && (
                              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                #{jerseyNumbers[player.id]}
                              </span>
                            )}
                            <span>{player.first_name} {player.last_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 2)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'points', 3)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'rebounds', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              R+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'assists', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              A+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'three_points_attempted', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3A
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_a_id.toString(), 'three_points_made', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3M
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team B Action Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      {match.teamB?.name || `Team ${match.team_b_id}`}
                    </h3>
                    <Input
                      type="text"
                      placeholder="Search jersey/name"
                      value={jerseySearch.teamB}
                      onChange={(e) => setJerseySearch(prev => ({ ...prev, teamB: e.target.value }))}
                      className="w-32 sm:w-40 h-8 text-sm"
                    />
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {getFilteredTeamPlayers(match.team_b_id).map((player) => (
                        <div key={player.id} className="space-y-2">
                          <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            {jerseyNumbers[player.id] && (
                              <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                #{jerseyNumbers[player.id]}
                              </span>
                            )}
                            <span>{player.first_name} {player.last_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 2)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +2
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'points', 3)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'rebounds', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              R+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'assists', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              A+1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'three_points_attempted', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3A
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePlayerStats(player.id.toString(), match.team_b_id.toString(), 'three_points_made', 1)}
                              className="h-12 sm:h-12  w-16  text-sm sm:text-base md:text-xs"
                            >
                              +3M
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
        {showPlayerSelector && match && (isEYMatch || players.length > 0) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {isEYMatch ? 'Enter Player Names (EY)' : 'Select Players Who Played'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
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
                  // EY Mode: Show existing players AND name input fields for new ones
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team A EY - Existing Players + New Name Inputs */}
                    {match.teamA?.grade?.toLowerCase() === 'ey' && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {match.teamA?.name || `Team ${match.team_a_id}`}
                        </h4>
                        
                        {/* Existing Players */}
                        {players.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Existing Players:</p>
                            <div className="grid grid-cols-1 gap-2">
                              {players
                                .filter(p => p && p.team_id === match.team_a_id)
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
                                    {selectedPlayers.teamA.includes(player.id) && (
                                      <div className="flex flex-col gap-1">
                                        <Input
                                          type="text"
                                          placeholder="#"
                                          value={jerseyNumbers[player.id] || ''}
                                          onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                          className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                          maxLength={3}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        {duplicateJerseys[player.id] && (
                                          <span className="text-xs text-red-500">Duplicate!</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Add New Players */}
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Add New Players:</p>
                          <div className="space-y-3">
                            {(eyPlayerNames[match.team_a_id] || []).map((player, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="First Name"
                                  value={player.firstName}
                                  onChange={(e) => {
                                    const newNames = [...(eyPlayerNames[match.team_a_id] || [])];
                                    newNames[index] = { ...newNames[index], firstName: e.target.value };
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_a_id]: newNames });
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  type="text"
                                  placeholder="Last Name"
                                  value={player.lastName}
                                  onChange={(e) => {
                                    const newNames = [...(eyPlayerNames[match.team_a_id] || [])];
                                    newNames[index] = { ...newNames[index], lastName: e.target.value };
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_a_id]: newNames });
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newNames = [...(eyPlayerNames[match.team_a_id] || [])];
                                    newNames.splice(index, 1);
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_a_id]: newNames });
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
                                const currentNames = eyPlayerNames[match.team_a_id] || [];
                                setEyPlayerNames({
                                  ...eyPlayerNames,
                                  [match.team_a_id]: [...currentNames, { firstName: '', lastName: '' }]
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
                    {match.teamB?.grade?.toLowerCase() === 'ey' && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          {match.teamB?.name || `Team ${match.team_b_id}`}
                        </h4>
                        
                        {/* Existing Players */}
                        {players.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Existing Players:</p>
                            <div className="grid grid-cols-1 gap-2">
                              {players
                                .filter(p => p && p.team_id === match.team_b_id)
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
                                    {selectedPlayers.teamB.includes(player.id) && (
                                      <div className="flex flex-col gap-1">
                                        <Input
                                          type="text"
                                          placeholder="#"
                                          value={jerseyNumbers[player.id] || ''}
                                          onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                          className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                          maxLength={3}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        {duplicateJerseys[player.id] && (
                                          <span className="text-xs text-red-500">Duplicate!</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Add New Players */}
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Add New Players:</p>
                          <div className="space-y-3">
                            {(eyPlayerNames[match.team_b_id] || []).map((player, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type="text"
                                  placeholder="First Name"
                                  value={player.firstName}
                                  onChange={(e) => {
                                    const newNames = [...(eyPlayerNames[match.team_b_id] || [])];
                                    newNames[index] = { ...newNames[index], firstName: e.target.value };
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_b_id]: newNames });
                                  }}
                                  className="flex-1"
                                />
                                <Input
                                  type="text"
                                  placeholder="Last Name"
                                  value={player.lastName}
                                  onChange={(e) => {
                                    const newNames = [...(eyPlayerNames[match.team_b_id] || [])];
                                    newNames[index] = { ...newNames[index], lastName: e.target.value };
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_b_id]: newNames });
                                  }}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newNames = [...(eyPlayerNames[match.team_b_id] || [])];
                                    newNames.splice(index, 1);
                                    setEyPlayerNames({ ...eyPlayerNames, [match.team_b_id]: newNames });
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
                                const currentNames = eyPlayerNames[match.team_b_id] || [];
                                setEyPlayerNames({
                                  ...eyPlayerNames,
                                  [match.team_b_id]: [...currentNames, { firstName: '', lastName: '' }]
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
                    {match.teamA?.grade?.toLowerCase() !== 'ey' && players.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {match.teamA?.name || `Team ${match.team_a_id}`}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {players
                            .filter(p => p && p.team_id === match.team_a_id)
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
                                {selectedPlayers.teamA.includes(player.id) && (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="text"
                                      placeholder="#"
                                      value={jerseyNumbers[player.id] || ''}
                                      onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                      className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                      maxLength={3}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {duplicateJerseys[player.id] && (
                                      <span className="text-xs text-red-500">Duplicate!</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {match.teamB?.grade?.toLowerCase() !== 'ey' && players.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          {match.teamB?.name || `Team ${match.team_b_id}`}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {players
                            .filter(p => p && p.team_id === match.team_b_id)
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
                                {selectedPlayers.teamB.includes(player.id) && (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="text"
                                      placeholder="#"
                                      value={jerseyNumbers[player.id] || ''}
                                      onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                      className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                      maxLength={3}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {duplicateJerseys[player.id] && (
                                      <span className="text-xs text-red-500">Duplicate!</span>
                                    )}
                                  </div>
                                )}
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
                          {match.teamA?.name || `Team ${match.team_a_id}`}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {players
                            .filter(p => p && p.team_id === match.team_a_id)
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
                                {selectedPlayers.teamA.includes(player.id) && (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="text"
                                      placeholder="#"
                                      value={jerseyNumbers[player.id] || ''}
                                      onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                      className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                      maxLength={3}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {duplicateJerseys[player.id] && (
                                      <span className="text-xs text-red-500">Duplicate!</span>
                                    )}
                                  </div>
                                )}
                              </div>
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
                                {selectedPlayers.teamB.includes(player.id) && (
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      type="text"
                                      placeholder="#"
                                      value={jerseyNumbers[player.id] || ''}
                                      onChange={(e) => updateJerseyNumber(player.id, e.target.value, player.team_id)}
                                      className={`w-16 h-8 text-sm text-center ${duplicateJerseys[player.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                                      maxLength={3}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {duplicateJerseys[player.id] && (
                                      <span className="text-xs text-red-500">Duplicate!</span>
                                    )}
                                  </div>
                                )}
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
                        ? (eyPlayerNames[match.team_a_id] || []).filter(p => p.firstName.trim() && p.lastName.trim()).length === 0 &&
                          (eyPlayerNames[match.team_b_id] || []).filter(p => p.firstName.trim() && p.lastName.trim()).length === 0
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
                        ...(eyPlayerNames[match.team_a_id] || []),
                        ...(eyPlayerNames[match.team_b_id] || [])
                      ].filter(p => p.firstName.trim() && p.lastName.trim()).length} players)`
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