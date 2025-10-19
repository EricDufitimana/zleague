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
  championship?: {
    id: number
    name: string
    status: string
  }
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
      console.log('🚀 Starting to fetch matches from server...')
      setIsLoading(true)
      try {
        const response = await fetch('/api/matches?ongoing_only=true')
        console.log('📡 API Response status:', response.status)
        console.log('📡 API Response ok:', response.ok)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Raw API response data:', data)
          console.log('📊 Total matches fetched:', data.matches?.length || 0, 'matches')
          
          // Log all matches with detailed information
          if (data.matches && data.matches.length > 0) {
            console.log('🏆 All matches from server:')
            data.matches.forEach((match: Match, index: number) => {
              console.log(`Match ${index + 1}:`, {
                id: match.id,
                teamA: match.teamA?.name || 'Unknown Team A',
                teamB: match.teamB?.name || 'Unknown Team B',
                team_a_score: match.team_a_score,
                team_b_score: match.team_b_score,
                status: match.status,
                sport_type: match.sport_type,
                created_at: match.created_at,
                championship_id: match.championship_id,
                championship_status: match.championship?.status || 'Unknown'
              })
            })
            
            // Log status distribution
            const statusCounts = data.matches.reduce((acc: any, match: Match) => {
              acc[match.status] = (acc[match.status] || 0) + 1
              return acc
            }, {})
            console.log('📈 Match status distribution:', statusCounts)
            
            // Log sport type distribution
            const sportCounts = data.matches.reduce((acc: any, match: Match) => {
              acc[match.sport_type] = (acc[match.sport_type] || 0) + 1
              return acc
            }, {})
            console.log('⚽ Sport type distribution:', sportCounts)
          } else {
            console.log('⚠️ No matches found in API response')
          }
          
          setMatches(data.matches || [])
          console.log('✅ Matches set in state successfully')
        } else {
          console.error('❌ API request failed with status:', response.status)
          const errorText = await response.text()
          console.error('❌ Error response body:', errorText)
        }
      } catch (error) {
        console.error('💥 Error fetching matches:', error)
        console.error('💥 Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        })
      } finally {
        setIsLoading(false)
        console.log('🏁 Finished fetching matches, loading set to false')
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
    console.log('🔄 Converting match to MatchCard format:', {
      original_id: match.id,
      original_status: match.status,
      teamA: match.teamA?.name,
      teamB: match.teamB?.name,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      sport_type: match.sport_type,
      created_at: match.created_at
    })
    
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
              match.status === 'scheduled' ? 'not_played' as const : 'live' as const,
      sport: match.sport_type as "football" | "basketball" | "volleyball",
      time: match.status === 'scheduled' ? 
        `${new Date(match.created_at).toLocaleDateString('en-US', { weekday: 'short' })} ${new Date(match.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}` : undefined,
      date: match.created_at
    }
    
    console.log('✅ Converted match result:', {
      converted_id: converted.id,
      converted_status: converted.status,
      homeTeam: converted.homeTeam,
      awayTeam: converted.awayTeam,
      sport: converted.sport,
      time: converted.time,
      date: converted.date
    })
    
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
      console.log('🔍 Filtering match:', {
        id: match.id,
        status: match.status,
        sport_type: match.sport_type,
        teamA: match.teamA?.name,
        teamB: match.teamB?.name,
        teamA_gender: match.teamA?.gender,
        teamB_gender: match.teamB?.gender,
        created_at: match.created_at,
        selectedSport,
        selectedGender,
        selectedDate
      })
      
      // Only show scheduled or played matches (exclude not_yet_scheduled)
      if (!['scheduled', 'played'].includes(match.status)) {
        console.log('❌ Filtered out - not scheduled/played status:', match.status)
        return false
      }
      
      // Skip matches with null teamA or teamB
      if (!match.teamA || !match.teamB) {
        console.log('❌ Filtered out - missing team data:', { teamA: !!match.teamA, teamB: !!match.teamB })
        return false
      }
      
      // Filter by sport
      if (match.sport_type !== selectedSport) {
        console.log('❌ Filtered out - sport mismatch:', { match_sport: match.sport_type, selected_sport: selectedSport })
        return false
      }
      
      // Filter by gender
      if (selectedGender !== "all") {
        const teamAGender = match.teamA.gender
        const teamBGender = match.teamB.gender
        if (teamAGender !== selectedGender || teamBGender !== selectedGender) {
          console.log('❌ Filtered out - gender mismatch:', { 
            teamA_gender: teamAGender, 
            teamB_gender: teamBGender, 
            selected_gender: selectedGender 
          })
          return false
        }
      }
      
      // Filter by date range
      const matchDate = new Date(match.created_at)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let dateMatch = true
      if (selectedDate === "all") dateMatch = true
      else if (selectedDate === "this-week") dateMatch = diffDays < 7
      else if (selectedDate === "last-week") dateMatch = diffDays >= 7 && diffDays < 14
      else if (selectedDate === "2-weeks-ago") dateMatch = diffDays >= 14 && diffDays < 21
      
      if (!dateMatch) {
        console.log('❌ Filtered out - date mismatch:', { 
          diffDays, 
          selectedDate, 
          matchDate: match.created_at 
        })
        return false
      }
      
      console.log('✅ Match passed all filters')
      return true
    })
    .map(convertToMatchCard)

  // Log final results
  console.log('📊 Final filtering results:', {
    total_matches_from_server: matches.length,
    filtered_matches_count: filteredMatches.length,
    selectedSport,
    selectedGender,
    selectedDate,
    filteredMatches: filteredMatches.map(match => ({
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      status: match.status,
      sport: match.sport,
      time: match.time
    }))
  })

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
