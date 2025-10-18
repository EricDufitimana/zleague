"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Navbar } from "@/components/navigation/Navbar"
import { FilterBar } from "@/components/sports/FilterBar"
import { MatchCard } from "@/components/sports/MatchCard"
import { MatchStatsDialog } from "@/components/sports/MatchStatsDialog"
import { ArrowUpDown } from "lucide-react"

interface Match {
  id: number
  team_a_id: number
  team_b_id: number
  championship_id: number
  sport_type: string
  status: string
  winner_id?: number
  team_a_score?: number
  team_b_score?: number
  teamA?: {
    id: number
    name: string
    grade: string
    gender?: string
  }
  teamB?: {
    id: number
    name: string
    grade: string
    gender?: string
  }
  created_at: string
}

export default function ScoresPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const [selectedDate, setSelectedDate] = useState("all")
  const [selectedGender, setSelectedGender] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)

  // Fetch matches from API (only from ongoing championships)
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/matches?ongoing_only=true')
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Fetched matches from ongoing championships:', data.matches?.length || 0, 'matches')
          
          // Debug: Log first match with scores to verify data
          if (data.matches && data.matches.length > 0) {
            const firstMatch = data.matches[0]
            console.log('🔍 Sample match data from ongoing championship:', {
              id: firstMatch.id,
              teamA: firstMatch.teamA?.name,
              teamB: firstMatch.teamB?.name,
              team_a_score: firstMatch.team_a_score,
              team_b_score: firstMatch.team_b_score,
              status: firstMatch.status,
              sport_type: firstMatch.sport_type,
              championship_status: firstMatch.championship?.status
            })
          }
          
          setMatches(data.matches || [])
        }
      } catch (error) {
        console.error('Error fetching matches:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [])

  // Helper function to get week label for a match
  const getWeekLabel = (matchDate: string) => {
    const now = new Date()
    const match = new Date(matchDate)
    const diffDays = Math.floor((now.getTime() - match.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) return "This Week"
    if (diffDays < 14) return "Last Week"
    if (diffDays < 21) return "2 Weeks Ago"
    return "Older"
  }

  // Convert API match to MatchCard format
  const convertToMatchCard = (match: Match) => {
    const converted = {
      id: match.id.toString(),
      homeTeam: { 
        name: match.teamA?.name || 'Unknown Team', 
        score: match.status === 'played' ? (match.team_a_score ?? 0) : null
      },
      awayTeam: { 
        name: match.teamB?.name || 'Unknown Team', 
        score: match.status === 'played' ? (match.team_b_score ?? 0) : null
      },
      status: match.status === 'played' ? 'final' as const : 
              match.status === 'scheduled' ? 'not_played' as const : 
              match.status === 'not_yet_scheduled' ? 'not_played' as const : 'live' as const,
      sport: match.sport_type as "football" | "basketball" | "volleyball",
      time: (match.status === 'scheduled' || match.status === 'not_yet_scheduled') ? 
        `${new Date(match.created_at).toLocaleDateString('en-US', { weekday: 'short' })} ${new Date(match.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}` : undefined,
      date: match.created_at
    }
    
    // Debug: Log scores for played matches
    if (match.status === 'played' && (match.team_a_score !== undefined || match.team_b_score !== undefined)) {
      console.log('⚽ Match scores:', {
        match_id: match.id,
        teamA: match.teamA?.name,
        teamB: match.teamB?.name,
        team_a_score: match.team_a_score,
        team_b_score: match.team_b_score
      })
    }
    
    return converted
  }

  // Filter matches based on selected sport, date, and gender
  const filteredMatches = matches
    .filter(match => {
      // Only show scheduled, played, or not yet scheduled matches
      if (!['scheduled', 'played', 'not_yet_scheduled'].includes(match.status)) return false
      
      // Skip matches with null teamA or teamB
      if (!match.teamA || !match.teamB) return false
      
      // Filter by sport
      if (match.sport_type !== selectedSport) return false
      
      // Filter by gender
      if (selectedGender !== "all") {
        const teamAGender = match.teamA.gender
        const teamBGender = match.teamB.gender
        if (teamAGender !== selectedGender || teamBGender !== selectedGender) return false
      }
      
      // Filter by date range
      const matchDate = new Date(match.created_at)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (selectedDate === "all") return true
      if (selectedDate === "this-week") return diffDays < 7
      if (selectedDate === "last-week") return diffDays >= 7 && diffDays < 14
      if (selectedDate === "2-weeks-ago") return diffDays >= 14 && diffDays < 21
      
      return true
    })
    .map(convertToMatchCard)

  // Group matches by week when "all" is selected
  const groupedMatches = selectedDate === "all" ? 
    filteredMatches.reduce((acc, match) => {
      const originalMatch = matches.find(m => m.id.toString() === match.id)
      if (!originalMatch) return acc
      
      const weekLabel = getWeekLabel(originalMatch.created_at)
      if (!acc[weekLabel]) acc[weekLabel] = []
      acc[weekLabel].push(match)
      return acc
    }, {} as Record<string, typeof filteredMatches>) : null

  // Handle match click to show stats
  const handleMatchClick = (matchId: string) => {
    const match = matches.find(m => m.id.toString() === matchId)
    if (match) {
      setSelectedMatch(match)
      setStatsDialogOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Matches</h1>
              <p className="text-gray-600 mt-1">Past and upcoming games</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar
            selectedSport={selectedSport}
            onSportChange={setSelectedSport}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedGender={selectedGender}
            onGenderChange={setSelectedGender}
          />
        </div>

        {/* Matches Grid */}
        <div className="space-y-6">
          {isLoading ? (
            // Loading skeletons
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="flex items-center space-x-2 px-3">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                      <div className="flex items-center space-x-2 flex-1 justify-end">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-center mt-2">
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMatches.length > 0 ? (
            selectedDate === "all" && groupedMatches ? (
              // Grouped matches by week
              <div className="space-y-6">
                {Object.entries(groupedMatches).map(([weekLabel, matches]) => (
                  matches.length > 0 && (
                    <section key={weekLabel} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-[1px] w-6 bg-[#E67514]/30" />
                        <h2 className="text-sm font-medium uppercase tracking-wider text-[#E67514]/80">{weekLabel}</h2>
                        <div className="flex-1 h-[1px] bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matches.map((match) => (
                          <MatchCard 
                            key={match.id} 
                            match={match}
                            onClick={() => handleMatchClick(match.id)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                ))}
              </div>
            ) : (
              // Regular matches (not grouped)
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => (
                  <MatchCard 
                    key={match.id} 
                    match={match}
                    onClick={() => handleMatchClick(match.id)}
                  />
                ))}
              </div>
            )
          ) : (
            // No matches found
            <Card className="border border-gray-200 bg-white shadow-sm text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try selecting a different sport or date</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Match Stats Dialog */}
      {selectedMatch && (
        <MatchStatsDialog
          open={statsDialogOpen}
          onOpenChange={setStatsDialogOpen}
          matchId={selectedMatch.id.toString()}
          sport={selectedMatch.sport_type as "football" | "basketball" | "volleyball"}
          homeTeamName={selectedMatch.teamA?.name || 'Team A'}
          awayTeamName={selectedMatch.teamB?.name || 'Team B'}
        />
      )}
    </div>
  )
}
