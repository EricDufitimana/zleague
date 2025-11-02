"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Trophy, Loader2, Target, Settings, CalendarDays, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

interface Championship {
  id: number;
  name: string;
  status: string;
}

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
  championship?: Championship;
}

export default function RecordPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [selectedChampionship, setSelectedChampionship] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedSportType, setSelectedSportType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMatchForSchedule, setSelectedMatchForSchedule] = useState<Match | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeView, setActiveView] = useState<'unscheduled' | 'scheduled'>('unscheduled');

  // Fetch all data once
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset dependent filters when championship changes
  useEffect(() => {
    setSelectedGender("all");
    setSelectedSportType("all");
  }, [selectedChampionship]);

  const fetchInitialData = async () => {
    try {
      const [championshipsRes, matchesRes] = await Promise.all([
        fetch('/api/championships'),
        fetch('/api/matches')
      ]);

      if (championshipsRes.ok) {
        const championshipsData = await championshipsRes.json();
        setChampionships(championshipsData);
      }

      if (matchesRes.ok) {
        const responseData = await matchesRes.json();
        const matchesData = responseData.matches || [];
        console.log('📡 Loaded matches data:', {
          totalMatches: matchesData.length,
          sampleMatch: matchesData[0],
          allMatches: matchesData
        });
        setAllMatches(matchesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  // Memoized computed values to avoid re-computation on every render
  const { unscheduledMatches, scheduledMatches, playedMatches, filteredMatches } = useMemo(() => {
    console.log('🔍 Filtering matches:', {
      totalMatches: allMatches.length,
      selectedChampionship,
      selectedGender,
      selectedSportType
    });

    // Filter out matches that don't have teams assigned (tournament bracket placeholders)
    const matchesWithTeams = allMatches.filter(match => 
      match.team_a_id !== null && match.team_b_id !== null
    );

    const unscheduled = matchesWithTeams.filter(match => match.status === 'not_yet_scheduled');
    const scheduled = matchesWithTeams.filter(match => match.status === 'scheduled' && match.match_time);
    const played = matchesWithTeams.filter(match => match.status === 'played');

    console.log('📊 Match counts:', {
      totalMatches: allMatches.length,
      matchesWithTeams: matchesWithTeams.length,
      unscheduled: unscheduled.length,
      scheduled: scheduled.length,
      played: played.length
    });

    // Apply filters to unscheduled matches
    let filtered = unscheduled;

    if (selectedChampionship !== "all") {
      const beforeChampionshipFilter = filtered.length;
      filtered = filtered.filter(match => match.championship?.id === parseInt(selectedChampionship));
      console.log(`🏆 Championship filter (${selectedChampionship}): ${beforeChampionshipFilter} → ${filtered.length}`);
    }

    if (selectedGender !== "all") {
      const beforeGenderFilter = filtered.length;
      filtered = filtered.filter(match => match.gender === selectedGender);
      console.log(`👥 Gender filter (${selectedGender}): ${beforeGenderFilter} → ${filtered.length}`);
    }

    if (selectedSportType !== "all") {
      const beforeSportFilter = filtered.length;
      filtered = filtered.filter(match => match.sport_type === selectedSportType);
      console.log(`⚽ Sport filter (${selectedSportType}): ${beforeSportFilter} → ${filtered.length}`);
    }

    console.log('✅ Final filtered matches:', filtered.length);

    return {
      unscheduledMatches: unscheduled,
      scheduledMatches: scheduled,
      playedMatches: played,
      filteredMatches: filtered
    };
  }, [allMatches, selectedChampionship, selectedGender, selectedSportType]);

  // Group scheduled matches by date for Calendar view
  const scheduledByDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const match of scheduledMatches) {
      if (!match.match_time) continue;
      const dateKey = new Date(match.match_time).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    }
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map((key) => ({ date: key, matches: groups[key] }));
  }, [scheduledMatches]);

  // Helper function to format match display name
  const getMatchDisplayName = (match: Match) => {
    const teamAName = `${match.teamA?.name || `Team ${match.team_a_id}`} (${match.teamA?.grade || 'Unknown'})`;
    const teamBName = `${match.teamB?.name || `Team ${match.team_b_id}`} (${match.teamB?.grade || 'Unknown'})`;
    return { teamAName, teamBName };
  };

  // Helper function to format date
  const formatMatchTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleQuickSchedule = (match: Match) => {
    // Smart defaults: today and next quarter-hour
    const now = new Date();
    const next = new Date(now.getTime());
    const minutes = next.getMinutes();
    const add = 15 - (minutes % 15 || 15);
    next.setMinutes(minutes + add);
    next.setSeconds(0);
    next.setMilliseconds(0);

    const isoDate = new Date().toISOString().split('T')[0];
    const timeStr = next.toTimeString().slice(0,5);

    setSelectedDate(isoDate);
    setSelectedTime(timeStr);
    setSelectedMatchForSchedule(match);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMatchForSchedule || !selectedDate || !selectedTime) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: selectedMatchForSchedule.id,
          match_time: `${selectedDate}T${selectedTime}`,
          status: 'scheduled',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update match schedule');
      }

      toast.success('Match scheduled successfully!');
      closeModal();
      fetchInitialData(); // Refresh all data
      
    } catch (error) {
      console.error('Error updating match schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update match schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDate("");
    setSelectedTime("");
    setShowScheduleModal(false);
    setSelectedMatchForSchedule(null);
  };

  const clearFilters = () => {
    setSelectedChampionship("all");
    setSelectedGender("all");
    setSelectedSportType("all");
  };

  const hasActiveFilters = selectedChampionship !== "all" || selectedGender !== "all" || selectedSportType !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 lg:px-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">Professional, interconnected view to plan your matches</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={activeView === 'unscheduled' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('unscheduled')}>
            <Target className="size-4 mr-2" /> Not scheduled
          </Button>
          <Button variant={activeView === 'scheduled' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('scheduled')}>
            <CalendarDays className="size-4 mr-2" /> Scheduled
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sticky Filters + Stats */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 self-start">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="@container/card">
                <CardHeader className="space-y-1 overflow-hidden">
                  <CardDescription className="truncate">Played</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black break-words">
                    {playedMatches.length}
                  </CardTitle>
       
                </CardHeader>
              </Card>
              <Card className="@container/card">
                <CardHeader className="space-y-1 overflow-hidden">
                  <CardDescription className="truncate">Not Scheduled</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black break-words">
                    {unscheduledMatches.length}
                  </CardTitle>
                  <CardAction>
               
                  </CardAction>
                </CardHeader>
              </Card>
              <Card className="@container/card">
                <CardHeader className="space-y-1 overflow-hidden">
                  <CardDescription className="truncate">Scheduled</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black break-words">
                    {scheduledMatches.length}
                  </CardTitle>
                  <CardAction>
                    
                  </CardAction>
                </CardHeader>
              </Card>
            </div>

            {/* Filters */}
            <Card className="@container/card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-5" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Narrow down by championship, gender, and sport
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="championship-filter" className="text-sm font-medium">
                      Championship
                    </Label>
                    <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Championships" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Championships</SelectItem>
                        {championships.map((championship) => (
                          <SelectItem key={championship.id} value={championship.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{championship.name}</span>
                              <Badge variant={championship.status === 'ongoing' ? 'default' : 'secondary'} className="text-xs">
                                {championship.status}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender-filter" className="text-sm font-medium">
                      Gender
                    </Label>
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Genders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sport-filter" className="text-sm font-medium">
                      Sport
                    </Label>
                    <Select value={selectedSportType} onValueChange={setSelectedSportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sports" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sports</SelectItem>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="volleyball">Volleyball</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-8 space-y-4">
            {activeView === 'unscheduled' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5" /> Not scheduled
                  </CardTitle>
                  <CardDescription>Click a match to quickly set date and time</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredMatches.length > 0 ? (
                    <div className="space-y-3">
                      {filteredMatches.map((match) => {
                        const { teamAName, teamBName } = getMatchDisplayName(match);
                        return (
                          <button
                            key={match.id}
                            className="w-full text-left p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                            onClick={() => handleQuickSchedule(match)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs capitalize">{match.sport_type}</Badge>
                                  <Badge variant="secondary" className="text-[10px] capitalize">{match.gender}</Badge>
                                </div>
                                <div className="mt-1 font-medium truncate">
                                  {teamAName} vs {teamBName}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {match.championship?.name || 'Unknown championship'}
                                </div>
                              </div>
                              <div>
                                <Badge variant="outline" className="text-[10px]">Schedule</Badge>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-6 text-center">No matches match current filters</div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-5" /> Scheduled
                  </CardTitle>
                  <CardDescription>Grouped agenda of upcoming matches</CardDescription>
                </CardHeader>
                <CardContent>
                  {scheduledByDate.length > 0 ? (
                    <div className="space-y-6">
                      {scheduledByDate.map(({ date, matches }) => (
                        <div key={date} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-muted" />
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="h-px flex-1 bg-muted" />
                          </div>
                          <div className="space-y-2">
                            {matches
                              .sort((a, b) => new Date(a.match_time || 0).getTime() - new Date(b.match_time || 0).getTime())
                              .map((match) => {
                                const { teamAName, teamBName } = getMatchDisplayName(match);
                                return (
                                  <div key={match.id} className="p-3 bg-muted/30 rounded-lg border">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs capitalize">{match.sport_type}</Badge>
                                          <Badge variant="secondary" className="text-[10px] capitalize">{match.gender}</Badge>
                                        </div>
                                        <div className="mt-1 font-medium truncate">
                                          {teamAName} vs {teamBName}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {match.championship?.name || 'Unknown championship'}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-right text-xs font-semibold text-black">
                                          {match.match_time && new Date(match.match_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {match.sport_type !== 'volleyball' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                              console.log('🎯 Live Score button clicked for match:', match.id);
                                              console.log('📊 Current match data:', {
                                                id: match.id,
                                                status: match.status,
                                                sport_type: match.sport_type,
                                                teamA: match.teamA?.name,
                                                teamB: match.teamB?.name
                                              });
                                              
                                              // Update match status to live
                                              try {
                                                console.log('🚀 Sending PATCH request to update match status to live...');
                                                const requestBody = {
                                                  match_id: match.id,
                                                  status: 'live',
                                                };
                                                console.log('📤 Request body:', requestBody);
                                                
                                                const response = await fetch('/api/matches', {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify(requestBody),
                                                });
                                                
                                                console.log('📥 Response status:', response.status);
                                                console.log('📥 Response ok:', response.ok);
                                                
                                                if (response.ok) {
                                                  const responseData = await response.json();
                                                  console.log('✅ Success response:', responseData);
                                                  
                                                  // Route to the correct livescore page based on sport type
                                                  const liveScorePath = match.sport_type === 'football' 
                                                    ? `/live-score/football/${match.id}`
                                                    : `/live-score/${match.id}`;
                                                  
                                                  console.log('🔗 Opening live score page:', liveScorePath);
                                                  window.open(liveScorePath, '_blank');
                                                  
                                                  // Refresh the data to show updated status
                                                  console.log('🔄 Refreshing dashboard data...');
                                                  fetchInitialData();
                                                } else {
                                                  const errorData = await response.json();
                                                  console.error('❌ API Error:', errorData);
                                                  toast.error('Failed to start live scoring');
                                                }
                                              } catch (error) {
                                                console.error('💥 Error starting live score:', error);
                                                toast.error('Failed to start live scoring');
                                              }
                                            }}
                                            className="h-8 px-3 text-xs"
                                          >
                                            <Play className="w-3 h-3 mr-1" />
                                            Live Score
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Calendar className="size-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Scheduled Matches</h3>
                      <p className="text-muted-foreground text-center mb-6 max-w-sm">
                        Schedule some matches to see them here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Quick Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Match</DialogTitle>
            <DialogDescription>
              {selectedMatchForSchedule && (() => {
                const { teamAName, teamBName } = getMatchDisplayName(selectedMatchForSchedule);
                return `Set the date and time for ${teamAName} vs ${teamBName}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-date" className="text-sm font-medium">
                Date
              </Label>
              <Input
                id="modal-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getCurrentDate()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-time" className="text-sm font-medium">
                Time
              </Label>
              <Input
                id="modal-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedDate || !selectedTime}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Scheduling...
                  </div>
                ) : (
                  "Schedule Match"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}