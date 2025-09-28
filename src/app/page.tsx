"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Navbar } from "@/components/Navbar"
import { FilterBar } from "@/components/FilterBar"
import { MatchCard } from "@/components/MatchCard"

// Mock data for demonstration
const mockMatches = [
  {
    id: "1",
    homeTeam: { name: "Real Madrid", score: 3 },
    awayTeam: { name: "Barcelona", score: 1 },
    status: "final" as const,
    sport: "football" as const,
  },
  {
    id: "2",
    homeTeam: { name: "Manchester City", score: 2 },
    awayTeam: { name: "Liverpool", score: 2 },
    status: "live" as const,
    sport: "football" as const,
  },
  {
    id: "3",
    homeTeam: { name: "Bayern Munich", score: 0 },
    awayTeam: { name: "PSG", score: 0 },
    status: "scheduled" as const,
    time: "20:00",
    sport: "football" as const,
  },
  {
    id: "4",
    homeTeam: { name: "Lakers", score: 108 },
    awayTeam: { name: "Warriors", score: 112 },
    status: "final" as const,
    sport: "basketball" as const,
  },
  {
    id: "5",
    homeTeam: { name: "Celtics", score: 95 },
    awayTeam: { name: "Heat", score: 98 },
    status: "live" as const,
    sport: "basketball" as const,
  },
  {
    id: "6",
    homeTeam: { name: "Brazil", score: 3 },
    awayTeam: { name: "Italy", score: 1 },
    status: "final" as const,
    sport: "volleyball" as const,
  },
]

export default function ScoresPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const [selectedDate, setSelectedDate] = useState("today")
  const [isLoading, setIsLoading] = useState(false)

  // Filter matches based on selected sport
  const filteredMatches = mockMatches.filter(match => match.sport === selectedSport)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Today's Matches</h1>
          <p className="text-gray-600">Live scores and upcoming games</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar
            selectedSport={selectedSport}
            onSportChange={setSelectedSport}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Matches Grid */}
        <div className="space-y-6">
          {isLoading ? (
            // Loading skeletons
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex items-center space-x-4 px-6">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                      <div className="flex items-center space-x-3 flex-1 justify-end">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-12 rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-center mt-4">
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMatches.length > 0 ? (
            // Actual matches
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            // No matches found
            <Card className="border-0 bg-white shadow-sm text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">Try selecting a different sport or date</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
