'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Shuffle, Play, RotateCcw, Check, X, Loader2, ArrowLeft, Users, Shield, Trash2, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { ImprovedWheel, type WheelHandle } from '@/components/shared/ImprovedWheel';
import '@/styles/fireworks.css';

interface Championship {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
  grade: string;
  gender: string;
  created_at: string;
}

interface Matchup {
  id?: number;
  team1: Team;
  team2: Team;
  sport_type: string;
  created_at?: string;
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const championshipId = params.championshipId as string;
  
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedSportType, setSelectedSportType] = useState<string>('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [currentMatchup, setCurrentMatchup] = useState<Matchup | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [firstTeam, setFirstTeam] = useState<Team | null>(null);
  const [secondTeam, setSecondTeam] = useState<Team | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [spinCount, setSpinCount] = useState(0);
  const [pendingMatchup, setPendingMatchup] = useState<Matchup | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [currentPointerTeam, setCurrentPointerTeam] = useState<Team | null>(null);
  const [isEnlargedView, setIsEnlargedView] = useState(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  
  // Predefined matchup pairs
  const [predefinedPairs, setPredefinedPairs] = useState<Array<{teamA: Team, teamB: Team}>>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // The wheel owns its own canvas and animation; we drive it through this handle.
  const wheelRef = useRef<WheelHandle>(null);
  const dialogWheelRef = useRef<WheelHandle>(null);

  const spinAnyWheel = () => {
    const handle = dialogWheelRef.current ?? wheelRef.current;
    handle?.spin();
  };

  const resetWheelRotation = () => {
    wheelRef.current?.reset();
    dialogWheelRef.current?.reset();
  };

  // The presentation wheel fills whatever space the fullscreen layout leaves it.
  // A callback ref rather than useRef: the dialog's content is portalled, so the
  // node does not exist yet on the render that opens it, and an effect keyed on
  // `isEnlargedView` would find a null ref and never retry.
  const [enlargedWheelBox, setEnlargedWheelBox] = useState<HTMLDivElement | null>(null);
  const enlargedWheelBoxRef = useCallback((node: HTMLDivElement | null) => {
    setEnlargedWheelBox(node);
  }, []);
  const [enlargedWheelSize, setEnlargedWheelSize] = useState(520);

  useEffect(() => {
    if (!enlargedWheelBox) return;

    const measure = () => {
      const { width, height } = enlargedWheelBox.getBoundingClientRect();
      // A measurement can land before layout, so fall back to the viewport
      // rather than leaving the wheel stuck at its default size.
      const available = Math.min(
        width || window.innerWidth * 0.6,
        height || window.innerHeight * 0.6
      );
      // Square, with a little breathing room, and never smaller than usable.
      setEnlargedWheelSize(Math.max(240, Math.floor(available - 16)));
    };

    measure();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(enlargedWheelBox);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enlargedWheelBox]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (championshipId) {
          await Promise.all([
            fetchChampionship(championshipId),
            fetchTeams(championshipId)
          ]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [championshipId]);

  useEffect(() => {
    if (championshipId) {
      // Reset gender and sport type when championship changes
      setSelectedGender('all');
      setSelectedSportType('all');
    }
  }, [championshipId]);

  useEffect(() => {
    if (teams.length > 0) {
      updateAvailableTeams();
      setupBasketballPairs(teams);
    }
  }, [selectedGender, selectedSportType, teams, matchups]);

  // Reset wheel state when sport type changes
  useEffect(() => {
    if (selectedSportType) {
      // Reset wheel state when switching sports
      setSelectedTeam(null);
      setFirstTeam(null);
      setSpinCount(0);
      setPendingMatchup(null);
      
      resetWheelRotation();
      
      // Update available teams for the new sport
      updateAvailableTeams();
    }
  }, [selectedSportType]);


  const fetchChampionship = async (id: string) => {
    try {
      const response = await fetch(`/api/championships/${id}`);
      if (response.ok) {
        const data = await response.json();
        setChampionship(data);
      } else {
        // If championship not found, redirect back to match index
        router.push('/dashboard/match');
      }
    } catch (error) {
      console.error('Error fetching championship:', error);
      router.push('/dashboard/match');
    }
  };

  const fetchTeams = async (championshipId: string) => {
    try {
      const response = await fetch(`/api/teams?championship_id=${championshipId}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
        
        // Fetch existing matches to filter out used teams
        await fetchExistingMatches(championshipId, data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchExistingMatches = async (championshipId: string, allTeams: Team[]) => {
    try {
      const response = await fetch(`/api/matches?championship_id=${championshipId}`);
      if (response.ok) {
        const responseData = await response.json();
        const matchesData = responseData.matches || [];
        
        // Set existing matchups for display
        const existingMatchups = matchesData.map((match: any) => {
          const team1 = allTeams.find(t => t.id === match.team_a_id);
          const team2 = allTeams.find(t => t.id === match.team_b_id);
          return {
            team1: team1 || { id: match.team_a_id, name: 'Unknown Team', grade: 'Unknown', gender: 'Unknown' },
            team2: team2 || { id: match.team_b_id, name: 'Unknown Team', grade: 'Unknown', gender: 'Unknown' },
            sport_type: match.sport_type || 'Unknown',
            created_at: match.created_at,
            id: match.id
          };
        });
        setMatchups(existingMatchups);
        
        // Set current matchup to the first one if exists
        if (existingMatchups.length > 0) {
          setCurrentMatchup(existingMatchups[0]);
        }
        
        // Set initial available teams
        updateAvailableTeams();
      }
    } catch (error) {
      console.error('Error fetching existing matches:', error);
      // If we can't fetch matches, just set all teams as available
      setAvailableTeams(allTeams);
    }
  };

  const filterAvailableTeams = () => {
    if (!teams.length) return [];
    
    const filteredTeams = teams.filter(team => {
      // Filter by gender if selected (skip if "all" is selected)
      if (selectedGender && selectedGender !== 'all' && team.gender !== selectedGender) return false;
      return true;
    });
    
    // Filter out teams that are already used in matches for the CURRENT sport type
    const usedTeamIds = new Set();
    const currentSportMatchups = matchups.filter(matchup => {
      // If "all" is selected, include all matchups
      if (selectedSportType === 'all') return true;
      // Otherwise, only include matchups for the selected sport
      return matchup.sport_type === selectedSportType;
    });
    
    currentSportMatchups.forEach((matchup) => {
      usedTeamIds.add(matchup.team1.id);
      usedTeamIds.add(matchup.team2.id);
    });
    
    return filteredTeams.filter(team => !usedTeamIds.has(team.id));
  };

  const updateAvailableTeams = () => {
    const filteredTeams = filterAvailableTeams();
    setAvailableTeams(filteredTeams);
  };

  // Use available teams for the wheel (don't fall back to all teams to respect gender filter)
  const getWheelTeams = () => availableTeams;

  // Setup predefined pairs for basketball
  const setupBasketballPairs = (teams: Team[]) => {
    if (selectedSportType === 'basketball') {
      const thunderHawks = teams.find(team => team.name === 'Thunder Hawks');
      const novaSharks = teams.find(team => team.name === 'Nova Sharks');
      
      if (thunderHawks && novaSharks) {
        // Randomly decide when this pair should appear (1st, 2nd, 3rd, etc. - but not last)
        const availableTeamCount = teams.length;
        const maxPairs = Math.floor(availableTeamCount / 2);
        // Don't let it be the last pair - choose randomly from 0 to maxPairs-2
        const randomPairPosition = Math.floor(Math.random() * Math.max(1, maxPairs - 1));
        
        const pairs = [{ teamA: thunderHawks, teamB: novaSharks }];
        setPredefinedPairs(pairs);
        setCurrentPairIndex(-randomPairPosition); // Negative to track when to activate
      }
    } else {
      // Clear pairs for non-basketball sports
      setPredefinedPairs([]);
      setCurrentPairIndex(0);
    }
  };

  const spinWheel = () => {
    // Don't allow spinning if gender or sport type is not selected
    if (selectedGender === 'all' || selectedSportType === 'all') return;
    
    const wheelTeams = getWheelTeams();
    if (wheelTeams.length === 0 || isSpinning) return;
    
    // If only 2 teams remain, auto-assign them without spinning
    if (wheelTeams.length === 2) {
      const team1 = wheelTeams[0];
      const team2 = wheelTeams[1];
      
      setFirstTeam(team1);
      setSecondTeam(team2);
      // Use selected sport type or default to basketball
      const sport_type = (selectedSportType && selectedSportType !== 'all') ? selectedSportType : 'basketball';
      setPendingMatchup({ team1, team2, sport_type });
      setSpinCount(1); // Mark as completed
      
      // Clear available teams since we've used them all
      setAvailableTeams([]);
      
      // Trigger fireworks for the auto-assignment
      const pyroContainer = document.createElement("div");
      pyroContainer.className = "pyro";
      const beforeElement = document.createElement("div");
      beforeElement.className = "before";
      const afterElement = document.createElement("div");
      afterElement.className = "after";
      pyroContainer.appendChild(beforeElement);
      pyroContainer.appendChild(afterElement);
      document.body.appendChild(pyroContainer);
      setTimeout(() => {
        if (document.body.contains(pyroContainer)) {
          document.body.removeChild(pyroContainer);
        }
      }, 4000);
      
      return;
    }
    
    // onSpinStart flips isSpinning once the animation actually begins.
    spinAnyWheel();
  };

  const confirmMatchup = async () => {
    if (pendingMatchup && championshipId) {
      setIsCreatingMatch(true);
      try {
        const response = await fetch('/api/matches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            team_a_id: pendingMatchup.team1.id,
            team_b_id: pendingMatchup.team2.id,
            championship_id: parseInt(championshipId),
            sport_type: pendingMatchup.sport_type,
            gender: pendingMatchup.team1.gender, // API now expects male/female directly
            status: 'scheduled'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Match created:', data);
          
          // Add to local state
          setMatchups(prev => [...prev, pendingMatchup]);
          setCurrentMatchup(pendingMatchup);
          setPendingMatchup(null);
          setFirstTeam(null);
          setSecondTeam(null);
          setSpinCount(0);
          setSelectedTeam(null);
          
          // Increment pair index to activate Thunder Hawks vs Nova Sharks at the right time
          if (selectedSportType === 'basketball') {
            setCurrentPairIndex(prev => prev + 1);
          }
          
          // Refresh available teams and existing matches
          if (championshipId) {
            await fetchExistingMatches(championshipId, teams);
          }
          
          resetWheelRotation();
        } else {
          const errorData = await response.json();
          console.error('Error creating match:', errorData);
          alert('Failed to create match: ' + errorData.error);
        }
      } catch (error) {
        console.error('Error creating match:', error);
        alert('Failed to create match');
      } finally {
        setIsCreatingMatch(false);
      }
    }
  };

  const handleTeamSelection = (team: Team) => {
    if (spinCount === 0) {
      // First team selection
      setFirstTeam(team);
      setSecondTeam(null);
      setSpinCount(1);
      // Remove selected team from available teams
      setAvailableTeams(prev => prev.filter(t => t.id !== team.id));
      setSelectedTeam(null); // Clear current selection
    } else if (spinCount === 1) {
      // Second team selection - create pending matchup
      if (firstTeam && team) {
        setSecondTeam(team);
        // Use selected sport type or default to basketball
        const sport_type = (selectedSportType && selectedSportType !== 'all') ? selectedSportType : 'basketball';
        setPendingMatchup({ team1: firstTeam, team2: team, sport_type });
        setSelectedTeam(null); // Clear current selection
      }
    }
  };

  const rejectMatchup = () => {
    setPendingMatchup(null);
    setFirstTeam(null);
    setSecondTeam(null);
    setSpinCount(0);
    setSelectedTeam(null);
    
    // Increment pair index when rejecting in basketball too
    if (selectedSportType === 'basketball') {
      setCurrentPairIndex(prev => prev + 1);
    }
    
    resetWheelRotation();
  };

  const resetWheel = () => {
    resetWheelRotation();
    setMatchups([]);
    setCurrentMatchup(null);
    setSelectedTeam(null);
    setFirstTeam(null);
    setSpinCount(0);
    setPendingMatchup(null);
    // Fetch fresh data from database
    if (championshipId) {
      fetchExistingMatches(championshipId, teams);
    } else {
      setAvailableTeams(teams);
    }
  };


  const getAvailableTeamsCount = () => {
    return availableTeams.length;
  };

  // Get matchups for the current sport type and gender
  const getCurrentSportMatchups = () => {
    let filteredMatchups = matchups;
    
    // Filter by sport type
    if (selectedSportType !== 'all') {
      filteredMatchups = filteredMatchups.filter(matchup => matchup.sport_type === selectedSportType);
    }
    
    // Filter by gender
    if (selectedGender !== 'all') {
      filteredMatchups = filteredMatchups.filter(matchup => 
        matchup.team1.gender === selectedGender && matchup.team2.gender === selectedGender
      );
    }
    
    return filteredMatchups;
  };

  // Helper function to safely format team properties
  const formatTeamProperty = (value: string | undefined | null, fallback: string = 'Unknown') => {
    if (!value || typeof value !== 'string') return fallback;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '?';
    try {
      return name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    } catch {
      return '?';
    }
  };

  const deleteMatchup = async (matchupId: number) => {
    if (!matchupId) return;
    
    try {
      const response = await fetch(`/api/matches?match_id=${matchupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the matchup from the local state
        setMatchups(prevMatchups => prevMatchups.filter(matchup => matchup.id !== matchupId));
        console.log('Matchup deleted successfully');
      } else {
        console.error('Failed to delete matchup');
      }
    } catch (error) {
      console.error('Error deleting matchup:', error);
    }
  };

  const nextMatchup = () => {
    const currentSportMatchups = getCurrentSportMatchups();
    if (currentSportMatchups.length === 0) return;
    
    const currentIndex = currentMatchup ? currentSportMatchups.findIndex(m => 
      m.team1.id === currentMatchup.team1.id && m.team2.id === currentMatchup.team2.id
    ) : -1;
    
    const nextIndex = (currentIndex + 1) % currentSportMatchups.length;
    setCurrentMatchup(currentSportMatchups[nextIndex]);
  };

  const previousMatchup = () => {
    const currentSportMatchups = getCurrentSportMatchups();
    if (currentSportMatchups.length === 0) return;
    
    const currentIndex = currentMatchup ? currentSportMatchups.findIndex(m => 
      m.team1.id === currentMatchup.team1.id && m.team2.id === currentMatchup.team2.id
    ) : -1;
    
    const prevIndex = currentIndex <= 0 ? currentSportMatchups.length - 1 : currentIndex - 1;
    setCurrentMatchup(currentSportMatchups[prevIndex]);
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="container mx-auto p-3">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-redish" />
            <p className="text-lg font-medium text-gray-600">Loading championship data...</p>
            <p className="text-sm text-gray-500">Fetching teams and match information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3">
      {/* Page Header with Championship Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-right flex items-start flex-col">
          <h1 className="text-3xl font-bold text-gray-900 text-right">Match Generator</h1>
          <p className="text-gray-600 mt-2">Create exciting matchups for your championship</p>
        </div>
        
        <div className="flex flex-col items-start gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/match')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Matches
          </Button>
          {championship && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">Current Championship</p>
              <p className="text-lg font-semibold text-gray-900">{championship.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Championship Header */}
      {championship && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">{championship.name}</h2>
          </div>
          
                     <div className="flex justify-between items-baseline-last gap-6">
            {/* Team Stats Cards - Left Side */}
            <div className="grid grid-cols-2 gap-2">
              {/* Total Teams Card */}
              <Card className="bg-white border border-gray-200 shadow-md backdrop-blur-[20px] h-4 flex justify-center" >
                <CardContent className="p-0.5 px-4">
                  <div className="flex items-center gap-1 h-full">
                    <div className="p-0.5 bg-blue-100 rounded">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-sm font-medium text-gray-600">Total:</span>
                      <span className="text-sm font-bold text-gray-900">{teams.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Teams Card */}
              <Card className="bg-white border border-gray-200 shadow-md backdrop-blur-[20px] h-4 flex justify-center">
                <CardContent className="p-0.5 px-4 ">
                  <div className="flex items-center gap-1 h-full">
                    <div className="p-0.5 bg-green-100 rounded">
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-sm font-medium text-gray-600">Available:</span>
                      <span className="text-sm font-bold text-green-600">{getAvailableTeamsCount()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls - Right Side */}
            {teams.length > 0 && (
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label htmlFor="gender" className="text-xs font-medium text-gray-600">Gender</Label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="bg-white h-4 w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genders</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="sportType" className="text-xs font-medium text-gray-600">Sport</Label>
                  <Select value={selectedSportType} onValueChange={setSelectedSportType}>
                    <SelectTrigger className="bg-white h-4 w-32">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any sport</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="volleyball">Volleyball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Enlarge Button */}
                <div>
                  <Button 
                    onClick={() => setIsEnlargedView(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={selectedGender === 'all' || selectedSportType === 'all'}
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Enlarge View
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">

      {/* Two-Panel Layout: Left Wheel (60%), Right Controls (40%) */}
      {championship && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch min-h-[70vh]">
          {/* Left: Wheel - 60% */}
          <div className="lg:col-span-3 flex">
            <Card className="bg-white border border-gray-200 shadow-lg backdrop-blur-[20px] w-full flex">
              <CardContent className="flex w-full pt-4 items-center justify-center">
                {getWheelTeams().length >= 1 ? (
                  <div className="flex flex-col items-center">
                    {/* Live team display above the wheel */}
                    <div className="text-center mb-4">
                      {selectedTeam ? (
                        <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
                          <span className="text-lg font-bold text-green-700">
                            {selectedTeam.name}
                          </span>
                          <div className="text-xs text-green-600 mt-1">
                            {isSpinning ? 'Spinning...' : 'Selected!'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {selectedGender === 'all' || selectedSportType === 'all' 
                            ? 'Please select both gender and sport to enable the wheel'
                            : 'Click wheel to spin and select a team'
                          }
                        </span>
                      )}
                    </div>
                    
                    {/* Improved Wheel Component */}
                    <ImprovedWheel
                      ref={wheelRef}
                      teams={getWheelTeams()}
                      disabled={selectedGender === 'all' || selectedSportType === 'all'}
                      soundEnabled={soundEnabled}
                      onSpinStart={() => {
                        setIsSpinning(true);
                        setSelectedTeam(null);
                      }}
                      onSelectWinner={(winner) => {
                        // Just set the selected team - let user manually choose to set 1st or 2nd team
                        setSelectedTeam(winner);
                        
                        // Trigger fireworks
                        const pyroContainer = document.createElement("div");
                        pyroContainer.className = "pyro";
                        const beforeElement = document.createElement("div");
                        beforeElement.className = "before";
                        const afterElement = document.createElement("div");
                        afterElement.className = "after";
                        pyroContainer.appendChild(beforeElement);
                        pyroContainer.appendChild(afterElement);
                        document.body.appendChild(pyroContainer);
                        setTimeout(() => {
                          if (document.body.contains(pyroContainer)) {
                            document.body.removeChild(pyroContainer);
                          }
                        }, 4000);
                      }}
                      onSpinComplete={() => {
                        setIsSpinning(false);
                      }}
                    />
                    
                    {/* Spin / reset controls under the wheel */}
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Button
                        onClick={spinWheel}
                        size="sm"
                        disabled={
                          isSpinning ||
                          selectedGender === 'all' ||
                          selectedSportType === 'all' ||
                          getWheelTeams().length < 2
                        }
                      >
                        {isSpinning ? 'Spinning…' : 'Spin'}
                      </Button>
                      <Button onClick={resetWheel} variant="outline" size="sm">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg font-medium text-gray-600 mb-2">No Teams Available</p>
                    <p className="text-sm text-gray-500">
                      {teams.length > 0 
                        ? 'No teams match the current gender filter. Try adjusting your gender selection.'
                        : 'No teams have been loaded yet. Please select a championship first.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Team cards, buttons, table - 40% */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Top: Team Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white border border-gray-200 shadow-sm gap-0 py-0">
                <CardHeader className="pt-4 pb-1 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs tracking-wide text-gray-500 font-medium">1st Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 pb-4 px-3">
                  {firstTeam ? (
                    <div className="flex items-center gap-2">
                     
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate leading-tight">{firstTeam.name}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 leading-none">
                          <span className="text-[11px] text-gray-600">Grade: {firstTeam.grade ? firstTeam.grade.toUpperCase() : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-gray-200 py-3 text-center">
                      <div className="text-xs text-gray-500">No team selected yet</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-white border border-gray-200 shadow-sm gap-0 py-0">
                <CardHeader className="pt-4 pb-1 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs tracking-wide text-gray-500 font-medium">2nd Team</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 pb-4 px-3">
                  {secondTeam ? (
                    <div className="flex items-center gap-2">
                     
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate leading-tight">{secondTeam.name}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 leading-none">
                          <span className="text-[11px] text-gray-600">Grade: {secondTeam.grade ? secondTeam.grade.toUpperCase() : 'Unknown'}</span>

                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-gray-200 py-3 text-center">
                      <div className="text-xs text-gray-500">Awaiting selection</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Middle: Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {pendingMatchup && (
                  <>
                    <Button onClick={confirmMatchup} className="bg-emerald-600 hover:bg-emerald-700" size="sm" disabled={isCreatingMatch}>
                      {isCreatingMatch ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                    <Button onClick={rejectMatchup} variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" disabled={!selectedTeam || isSpinning || spinCount !== 0} onClick={() => selectedTeam && handleTeamSelection(selectedTeam)}>
                  Set 1st Team
                </Button>
                <Button size="sm" variant="outline" disabled={!selectedTeam || isSpinning || spinCount !== 1} onClick={() => selectedTeam && handleTeamSelection(selectedTeam)}>
                  Set 2nd Team
                </Button>
              </div>
            </div>

            {/* Bottom: Table (scrollable, fills remaining) */}
            <div className="flex-1">
              <Card className="bg-white border border-gray-200 shadow-sm h-full">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Matchups</CardTitle>
                  <CardDescription className="text-xs">
                    {getCurrentSportMatchups().length} matchups{selectedSportType !== 'all' ? ` · ${selectedSportType}` : ''}{selectedGender !== 'all' ? ` · ${selectedGender}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-56px)] overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Matchup</th>
                          <th scope="col" className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Sport</th>
                          <th scope="col" className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-4 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getCurrentSportMatchups().map((matchup, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{matchup.team1.name}</span>
                                <span className="text-[10px] text-gray-500">({matchup.team1.grade ? matchup.team1.grade.toUpperCase() : 'Unknown'})</span>
                                <span className="text-gray-400 text-[10px]">vs</span>
                                <span>{matchup.team2.name}</span>
                                <span className="text-[10px] text-gray-500">({matchup.team2.grade ? matchup.team2.grade.toUpperCase() : 'Unknown'})</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{matchup.sport_type.charAt(0).toUpperCase() + matchup.sport_type.slice(1)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">Confirmed</td>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{matchup.created_at ? new Date(matchup.created_at).toLocaleDateString() : 'Today'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-center">
                              {matchup.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMatchup(matchup.id!)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Right panel includes matchups table now; removed separate cards below */}
      </div>

      {/* Enlarged View Dialog for Presentation */}
      <Dialog open={isEnlargedView} onOpenChange={setIsEnlargedView}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none"
        >
          <DialogHeader className="shrink-0 border-b bg-white px-6 py-3">
            <DialogTitle className="flex flex-wrap items-center justify-center gap-4">
              <p className="text-xl font-bold text-center">Match Selection - Presentation View</p>
              <div className="flex justify-center gap-4">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Gender: {selectedGender === 'all' ? 'All' : selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)}
                </div> 
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Sport: {selectedSportType === 'all' ? 'All' : selectedSportType.charAt(0).toUpperCase() + selectedSportType.slice(1)}
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  title={soundEnabled ? "Turn off sound" : "Turn on sound"}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsEnlargedView(false)}
                  className="flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                  title="Exit presentation view"
                >
                  <X className="h-4 w-4" />
                  Exit
                </button>
              </div> 
            </DialogTitle>
        
          </DialogHeader>
          
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto p-6 lg:grid-cols-3">
            {/* Enlarged Wheel */}
            <div className="flex min-h-0 flex-col items-center justify-center lg:col-span-2">
              {getWheelTeams().length >= 1 ? (
                <div className="flex h-full min-h-0 w-full flex-col items-center">
                  {/* Instruction text above the wheel */}
                  
                  
                  {/* Enlarged Wheel Component */}
                  <div
                    ref={enlargedWheelBoxRef}
                    className="flex min-h-0 w-full flex-1 items-center justify-center"
                  >
                  <ImprovedWheel
                    ref={dialogWheelRef}
                    teams={getWheelTeams()}
                    size={enlargedWheelSize}
                    largeText={true}
                    soundEnabled={soundEnabled}
                    onSpinStart={() => {
                      setIsSpinning(true);
                      setSelectedTeam(null);
                    }}
                    onSelectWinner={(winner) => {
                      setSelectedTeam(winner);
                      setWinnerTeam(winner);
                      setShowWinnerDialog(true);
                      
                      // Trigger fireworks
                      const pyroContainer = document.createElement("div");
                      pyroContainer.className = "pyro";
                      const beforeElement = document.createElement("div");
                      beforeElement.className = "before";
                      const afterElement = document.createElement("div");
                      afterElement.className = "after";
                      pyroContainer.appendChild(beforeElement);
                      pyroContainer.appendChild(afterElement);
                      document.body.appendChild(pyroContainer);
                      setTimeout(() => {
                        if (document.body.contains(pyroContainer)) {
                          document.body.removeChild(pyroContainer);
                        }
                      }, 4000);
                    }}
                    onSpinComplete={() => {
                      setIsSpinning(false);
                    }}
                  />
                  
                  </div>

                  {/* Spin / reset controls under the wheel */}
                  <div className="mt-4 flex shrink-0 items-center justify-center gap-3">
                    <Button
                      onClick={spinWheel}
                      disabled={
                        isSpinning ||
                        selectedGender === 'all' ||
                        selectedSportType === 'all' ||
                        getWheelTeams().length < 2
                      }
                    >
                      {isSpinning ? 'Spinning…' : 'Spin'}
                    </Button>
                    <Button onClick={resetWheel} variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-2xl font-medium text-gray-600 mb-2">No Teams Available</p>
                  <p className="text-lg text-gray-500">
                    {teams.length > 0 
                      ? 'No teams match the current gender filter.'
                      : 'No teams have been loaded yet.'}
                  </p>
                </div>
              )}
            </div>

            {/* Enlarged Team Selection Cards */}
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
              {/* Team Cards */}
              <div className="space-y-2">
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="pb-1 px-3 pt-3">
                    <CardTitle className="text-sm font-medium text-gray-700">1st Team</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {firstTeam ? (
                      <div className="space-y-1">
                        <div className="text-lg font-semibold text-gray-900">{firstTeam.name}</div>
                        <div className="text-md text-gray-600">Grade: {firstTeam.grade ? firstTeam.grade.toUpperCase() : 'Unknown'}</div>
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-gray-300 py-3 text-center">
                        <div className="text-md text-gray-500">No team selected yet</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="pb-1 px-3 pt-3">
                    <CardTitle className="text-sm font-medium text-gray-700">2nd Team</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    {secondTeam ? (
                      <div className="space-y-1">
                        <div className="text-lg font-semibold text-gray-900">{secondTeam.name}</div>
                        <div className="text-md text-gray-600">Grade: {secondTeam.grade ? secondTeam.grade.toUpperCase() : 'Unknown'}</div>
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-gray-300 py-3 text-center">
                        <div className="text-md text-gray-500">Awaiting selection</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {pendingMatchup && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={confirmMatchup} className="bg-emerald-600 hover:bg-emerald-700 text-sm py-2" disabled={isCreatingMatch}>
                      {isCreatingMatch ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirm Match
                        </>
                      )}
                    </Button>
                    <Button onClick={rejectMatchup} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 text-sm py-2">
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={!selectedTeam || isSpinning || spinCount !== 0} 
                    onClick={() => selectedTeam && handleTeamSelection(selectedTeam)}
                    className="text-sm py-2"
                  >
                    Set as 1st Team
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={!selectedTeam || isSpinning || spinCount !== 1} 
                    onClick={() => selectedTeam && handleTeamSelection(selectedTeam)}
                    className="text-sm py-2"
                  >
                    Set as 2nd Team
                  </Button>
                </div>
                
                {/* Auto Assign Match Button - Only show when exactly 2 teams left */}
                {getWheelTeams().length === 2 && !firstTeam && !secondTeam && (
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 w-full"
                      onClick={() => {
                        const teams = getWheelTeams();
                        if (teams.length === 2) {
                          const team1 = teams[0];
                          const team2 = teams[1];
                          
                          setFirstTeam(team1);
                          setSecondTeam(team2);
                          // Use selected sport type or default to basketball
                          const sport_type = (selectedSportType && selectedSportType !== 'all') ? selectedSportType : 'basketball';
                          setPendingMatchup({ team1, team2, sport_type });
                          setSpinCount(1); // Mark as completed
                          
                          // Clear available teams since we've used them all
                          setAvailableTeams([]);
                          
                          // Trigger fireworks
                          const pyroContainer = document.createElement("div");
                          pyroContainer.className = "pyro";
                          const beforeElement = document.createElement("div");
                          beforeElement.className = "before";
                          const afterElement = document.createElement("div");
                          afterElement.className = "after";
                          pyroContainer.appendChild(beforeElement);
                          pyroContainer.appendChild(afterElement);
                          document.body.appendChild(pyroContainer);
                          setTimeout(() => {
                            if (document.body.contains(pyroContainer)) {
                              document.body.removeChild(pyroContainer);
                            }
                          }, 4000);
                        }
                      }}
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Auto Assign Final Match
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winner Dialog */}
      <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-green-700">
              🎉 Team Selected!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            {winnerTeam && (
              <div className="space-y-4">
                <div className="bg-green-100 border-2 border-green-400 rounded-xl px-6 py-4">
                  <div className="text-3xl font-bold text-green-700 mb-2">
                    {winnerTeam.name}
                  </div>
                  <div className="text-lg text-green-600">
                    Grade: {winnerTeam.grade ? winnerTeam.grade.toUpperCase() : 'Unknown'}
                  </div>
                </div>
                <p className="text-gray-600">
                  This team has been selected by the wheel!
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowWinnerDialog(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}