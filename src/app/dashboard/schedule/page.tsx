"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Trophy, Users, Loader2, Target, CheckCircle, Settings } from "lucide-react";
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
        const matchesData = await matchesRes.json();
        setAllMatches(matchesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  // Memoized computed values to avoid re-computation on every render
  const { unscheduledMatches, scheduledMatches, playedMatches, filteredMatches } = useMemo(() => {
    const unscheduled = allMatches.filter(match => match.status === 'not_yet_scheduled');
    const scheduled = allMatches.filter(match => match.status === 'scheduled' && match.match_time);
    const played = allMatches.filter(match => match.status === 'played');

    // Apply filters to unscheduled matches
    let filtered = unscheduled;

    if (selectedChampionship !== "all") {
      filtered = filtered.filter(match => match.championship?.id === parseInt(selectedChampionship));
    }

    if (selectedGender !== "all") {
      filtered = filtered.filter(match => 
        match.teamA?.gender === selectedGender && match.teamB?.gender === selectedGender
      );
    }

    if (selectedSportType !== "all") {
      filtered = filtered.filter(match => match.sport_type === selectedSportType);
    }

    return {
      unscheduledMatches: unscheduled,
      scheduledMatches: scheduled,
      playedMatches: played,
      filteredMatches: filtered
    };
  }, [allMatches, selectedChampionship, selectedGender, selectedSportType]);

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
          match_time: `${selectedDate}T${selectedTime}`
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
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">Quickly schedule matches with filters and one-click scheduling</p>
      </div>

      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Played Games</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black">
              {playedMatches.length}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Trophy className="size-3" />
                Completed
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Total games finished <Trophy className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Matches with recorded results
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Unscheduled Matches</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black">
              {unscheduledMatches.length}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Calendar className="size-3" />
                Pending
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Awaiting schedule <Calendar className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Matches need date and time
            </div>
          </CardFooter>
        </Card>
        
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Filtered Matches</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-black">
              {filteredMatches.length}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Target className="size-3" />
                Available
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Ready to schedule <Target className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Matches ready for scheduling
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-6">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter matches by championship, gender, and sport to find what you want to schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtered Matches List */}
      <div className="px-4 lg:px-6">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" />
              Unscheduled Matches
            </CardTitle>
            <CardDescription>
              Click on any match to quickly schedule it with date and time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMatches.length > 0 ? (
              <div className="space-y-3">
                {filteredMatches.map((match) => {
                  const { teamAName, teamBName } = getMatchDisplayName(match);
                  return (
                    <div 
                      key={match.id} 
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleQuickSchedule(match)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {match.sport_type}
                          </Badge>
                          <span className="font-medium">
                            {teamAName} vs {teamBName}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Championship: {match.championship?.name || 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {match.teamA?.gender} {match.sport_type}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Calendar className="size-4 mr-2" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Target className="size-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Matches Found</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  {hasActiveFilters
                    ? "No unscheduled matches match your current filters" 
                    : "No unscheduled matches available"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Matches Display */}
      <div className="px-4 lg:px-6">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Scheduled Matches
            </CardTitle>
            <CardDescription>
              All matches that have been scheduled with date and time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledMatches.length > 0 ? (
              <div className="space-y-3">
                {scheduledMatches.map((match) => {
                  const { teamAName, teamBName } = getMatchDisplayName(match);
                  return (
                    <div key={match.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {match.sport_type}
                          </Badge>
                          <span className="font-medium">
                            {teamAName} vs {teamBName}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Championship: {match.championship?.name || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-black">
                          {match.match_time && formatMatchTime(match.match_time)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status: {match.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
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