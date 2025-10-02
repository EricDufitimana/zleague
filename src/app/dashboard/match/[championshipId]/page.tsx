'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trophy, Shuffle, RotateCcw, Check, X, Loader2, Users, Shield } from 'lucide-react';

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
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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
  
  // Predefined matchup pairs
  const [predefinedPairs, setPredefinedPairs] = useState<Array<{teamA: Team, teamB: Team}>>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Wheel physics
  const friction = 0.991;
  const angVelRef = useRef(0);
  const angRef = useRef(0);
  const TAU = 2 * Math.PI;

  const fetchChampionships = useCallback(async () => {
    try {
      const response = await fetch('/api/championships');
      if (response.ok) {
        const data = await response.json();
        setChampionships(data);
      }
    } catch (error) {
      console.error('Error fetching championships:', error);
    }
  }, []);

  const fetchChampionship = useCallback(async (id: string) => {
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
  }, [router]);

  const fetchTeams = useCallback(async (championshipId: string) => {
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
  }, []);

  useEffect(() => {
    fetchChampionships();
    if (championshipId) {
      fetchChampionship(championshipId);
      fetchTeams(championshipId);
    }
  }, [championshipId, fetchChampionships, fetchChampionship, fetchTeams]);

  useEffect(() => {
    if (championshipId) {
      // Reset gender and sport type when championship changes
      setSelectedGender('all');
      setSelectedSportType('all');
    }
  }, [championshipId]);

  const getWheelTeams = useCallback(() => (availableTeams.length > 0 ? availableTeams : teams), [availableTeams, teams]);

  const initWheel = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctxRef.current = ctx;
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    
    // Draw initial wheel
    drawWheel();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      // Use available teams for the wheel; if none, fall back to all teams so the wheel remains visible
      const wheelTeams = getWheelTeams();
      if (wheelTeams.length > 0) {
        initWheel();
      } else {
        // Clear the wheel when no teams are available
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [availableTeams, teams, getWheelTeams, initWheel]);

  const updateAvailableTeams = useCallback(() => {
    const filteredTeams = filterAvailableTeams();
    setAvailableTeams(filteredTeams);
  }, [teams, selectedGender, selectedSportType, matchups]);

  const setupBasketballPairs = useCallback((teams: Team[]) => {
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
  }, [selectedSportType]);

  useEffect(() => {
    if (teams.length > 0) {
      updateAvailableTeams();
      setupBasketballPairs(teams);
    }
  }, [selectedGender, selectedSportType, teams, matchups, updateAvailableTeams, setupBasketballPairs]);

  // Reset wheel state when sport type changes
  useEffect(() => {
    if (selectedSportType) {
      // Reset wheel state when switching sports
      setSelectedTeam(null);
      setFirstTeam(null);
      setSpinCount(0);
      setPendingMatchup(null);
      
      // Reset wheel rotation
      if (canvasRef.current) {
        canvasRef.current.style.transform = 'rotate(0rad)';
      }
      angRef.current = 0;
      
      // Update available teams for the new sport
      updateAvailableTeams();
    }
  }, [selectedSportType, updateAvailableTeams]);


  const fetchExistingMatches = async (championshipId: string, allTeams: Team[]) => {
    try {
      const response = await fetch(`/api/matches?championship_id=${championshipId}`);
      if (response.ok) {
        const matchesData = await response.json();
        
        // Set existing matchups for display
        const existingMatchups = matchesData.map((match: { team_a_id: number; team_b_id: number; sport_type: string; created_at: string; id: number }) => {
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


  const drawWheel = () => {
    const wheelTeams = getWheelTeams();
    if (!ctxRef.current || wheelTeams.length === 0) return;
    
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dia = canvas.width;
    const rad = dia / 2;
    const PI = Math.PI;
    const TAU = 2 * PI;
    const arc = TAU / wheelTeams.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, dia, dia);
    
    // Draw sectors with only green, orange, and brown colors
    const colors = [
      '#22c55e', // bg-green-500
      '#16a34a', // bg-green-600
      '#15803d', // bg-green-700
      '#f97316', // bg-orange-500
      '#ea580c', // bg-orange-600
      '#dc2626', // bg-orange-700
      '#a16207', // bg-amber-600
      '#92400e', // bg-amber-700
      '#78350f', // bg-amber-800
      '#92400e', // bg-amber-700
      '#a16207', // bg-amber-600
      '#d97706', // bg-amber-500
      '#22c55e', // bg-green-500
      '#16a34a', // bg-green-600
      '#15803d'  // bg-green-700
    ];
    
    wheelTeams.forEach((team, i) => {
      const color = colors[i % colors.length];
      
      // Draw sector
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(rad, rad);
      ctx.arc(rad, rad, rad, arc * i, arc * (i + 1));
      ctx.lineTo(rad, rad);
      ctx.fill();
      
      // Draw text
      ctx.translate(rad, rad);
      ctx.rotate(arc * i + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(team.name, rad - 15, 5);
      ctx.restore();
    });
  };



  const frame = useCallback(() => {
    if (!angVelRef.current) return;
    
    angVelRef.current *= friction;
    
    if (angVelRef.current < 0.002) {
      angVelRef.current = 0;
      setIsSpinning(false);
      
      // Calculate which team is selected based on actual wheel position
      const wheelTeams = getWheelTeams();
      if (wheelTeams.length > 0) {
        const normalizedAngle = (360 - (angRef.current * 180 / Math.PI) % 360) / 360;
        let selectedIndex = Math.floor(normalizedAngle * wheelTeams.length);
        selectedIndex = Math.max(0, Math.min(selectedIndex, wheelTeams.length - 1));
        setSelectedTeam(wheelTeams[selectedIndex]);
        
        // Update pair index after second team selection in basketball
        if (selectedSportType === 'basketball' && spinCount === 1 && predefinedPairs.length > 0) {
          setCurrentPairIndex(prev => prev + 1);
        }
      }
    }
    
    angRef.current += angVelRef.current;
    angRef.current %= TAU;
    
    if (canvasRef.current) {
      canvasRef.current.style.transform = `rotate(${angRef.current}rad)`;
    }
    
    if (angVelRef.current > 0) {
      animationRef.current = requestAnimationFrame(frame);
    }
  }, [getWheelTeams, selectedSportType, spinCount, predefinedPairs.length]);

  const spinWheel = useCallback(() => {
    // Don't allow spinning if gender or sport type is not selected
    if (selectedGender === 'all' || selectedSportType === 'all') return;
    
    const wheelTeams = getWheelTeams();
    if (wheelTeams.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    
    // Determine target team for basketball
    let targetTeam: Team | null = null;
    if (selectedSportType === 'basketball' && predefinedPairs.length > 0 && currentPairIndex === 0) {
      const currentPair = predefinedPairs[0];
      
      if (spinCount === 0) {
        // First spin - target Thunder Hawks
        targetTeam = currentPair.teamA;
      } else if (spinCount === 1 && firstTeam) {
        // Second spin - target Nova Sharks
        if (firstTeam.id === currentPair.teamA.id) {
          targetTeam = currentPair.teamB;
        } else if (firstTeam.id === currentPair.teamB.id) {
          targetTeam = currentPair.teamA;
        }
      }
    }
    
    if (targetTeam) {
      // Calculate the angle needed to land on target team
      const targetIndex = wheelTeams.findIndex(team => team.id === targetTeam!.id);
      if (targetIndex !== -1) {
        const arc = (2 * Math.PI) / wheelTeams.length;
        const targetAngle = (targetIndex * arc) + (arc / 2);
        
        // Add 3-6 full rotations for realistic effect (faster spinning)
        const fullRotations = Math.floor(Math.random() * 4) + 3;
        const totalTargetAngle = (fullRotations * 2 * Math.PI) + targetAngle;
        
        // Calculate velocity needed to reach target using friction physics
        // Using: finalAngle = initialAngle + (initialVel / (1-friction))
        const neededDistance = totalTargetAngle - angRef.current;
        angVelRef.current = neededDistance * (1 - friction) * 1.2; // Increased multiplier for faster spin
      } else {
        // Fallback to random if target not found
        angVelRef.current = Math.random() * 0.2 + 0.25;
      }
    } else {
      // Normal random spin for non-basketball or other teams (faster)
      angVelRef.current = Math.random() * 0.3 + 0.4; // Increased base velocity
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(frame);
  }, [selectedGender, selectedSportType, getWheelTeams, isSpinning, predefinedPairs, currentPairIndex, spinCount, firstTeam, frame]);

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
          
          // Reset wheel
          if (canvasRef.current) {
            canvasRef.current.style.transform = 'rotate(0rad)';
          }
          angRef.current = 0;
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
    
    // Reset wheel
    if (canvasRef.current) {
      canvasRef.current.style.transform = 'rotate(0rad)';
    }
    angRef.current = 0;
  };

  const resetWheel = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    angVelRef.current = 0;
    angRef.current = 0;
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
    if (canvasRef.current) {
      canvasRef.current.style.transform = 'rotate(0rad)';
    }
  }, [championshipId, teams]);

  const handleChampionshipChange = (newChampionshipId: string) => {
    if (newChampionshipId !== championshipId) {
      router.push(`/dashboard/match/${newChampionshipId}`);
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

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-3">
      {/* Page Header with Championship Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-right flex items-start flex-col">
          <h1 className="text-3xl font-bold text-gray-900 text-right">Match Generator</h1>
          <p className="text-gray-600 mt-2">Create exciting matchups for your championship</p>
        </div>
        
        <div className="flex flex-col items-start gap-2">
          <Label htmlFor="championship" className="text-sm font-medium">Championship</Label>
          <Select value={championshipId} onValueChange={handleChampionshipChange}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Choose a championship" />
            </SelectTrigger>
            <SelectContent>
              {championships.length === 0 ? (
                <SelectItem value="loading" disabled>
                  Loading championships...
                </SelectItem>
              ) : (
                championships.map((champ) => (
                  <SelectItem key={champ.id} value={champ.id.toString()}>
                    {champ.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
                    <div className="relative inline-block overflow-hidden rounded-full">
                      <canvas
                        ref={canvasRef}
                        className="block"
                        style={{ transform: 'rotate(0rad)' }}
                      />
                      {/* Top Pointer */}
                      <div className="absolute top-0 left-1/2 w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-white transform -translate-x-1/2 z-30"></div>
                    </div>
                    {/* Spin / Reset under the wheel */}
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Button
                        onClick={spinWheel}
                        disabled={isSpinning || getWheelTeams().length === 0 || selectedGender === 'all' || selectedSportType === 'all'}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        size="sm"
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        {isSpinning ? 'Spinning...' : spinCount === 0 ? 'Spin for First' : 'Spin for Second'}
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
                    <Button onClick={confirmMatchup} className="bg-green-600 hover:bg-green-700" size="sm" disabled={isCreatingMatch}>
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
    </div>
  );
}