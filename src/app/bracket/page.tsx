"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Navbar } from "@/components/Navbar"
import { cn } from "@/lib/utils"

// Mock bracket data
const mockBracketData = {
  football: {
    rounds: [
      {
        name: "Quarter Finals",
        matches: [
          {
            id: "qf1",
            homeTeam: { name: "Real Madrid", score: 3 },
            awayTeam: { name: "Barcelona", score: 1 },
            status: "final",
          },
          {
            id: "qf2",
            homeTeam: { name: "Manchester City", score: 2 },
            awayTeam: { name: "Liverpool", score: 2 },
            status: "live",
          },
          {
            id: "qf3",
            homeTeam: { name: "Bayern Munich", score: 0 },
            awayTeam: { name: "PSG", score: 0 },
            status: "scheduled",
            time: "20:00",
          },
          {
            id: "qf4",
            homeTeam: { name: "Juventus", score: 1 },
            awayTeam: { name: "AC Milan", score: 0 },
            status: "final",
          },
        ],
      },
      {
        name: "Semi Finals",
        matches: [
          {
            id: "sf1",
            homeTeam: { name: "Real Madrid", score: 0 },
            awayTeam: { name: "Manchester City", score: 0 },
            status: "scheduled",
            time: "TBD",
          },
          {
            id: "sf2",
            homeTeam: { name: "Bayern Munich", score: 0 },
            awayTeam: { name: "Juventus", score: 0 },
            status: "scheduled",
            time: "TBD",
          },
        ],
      },
      {
        name: "Final",
        matches: [
          {
            id: "final",
            homeTeam: { name: "TBD", score: 0 },
            awayTeam: { name: "TBD", score: 0 },
            status: "scheduled",
            time: "TBD",
          },
        ],
      },
    ],
  },
  basketball: {
    rounds: [
      {
        name: "Quarter Finals",
        matches: [
          {
            id: "qf1",
            homeTeam: { name: "Lakers", score: 108 },
            awayTeam: { name: "Warriors", score: 112 },
            status: "final",
          },
          {
            id: "qf2",
            homeTeam: { name: "Celtics", score: 95 },
            awayTeam: { name: "Heat", score: 98 },
            status: "live",
          },
        ],
      },
    ],
  },
  volleyball: {
    rounds: [
      {
        name: "Quarter Finals",
        matches: [
          {
            id: "qf1",
            homeTeam: { name: "Brazil", score: 3 },
            awayTeam: { name: "Italy", score: 1 },
            status: "final",
          },
        ],
      },
    ],
  },
}

function BracketMatch({ match }: { match: any }) {
  const statusConfig = {
    scheduled: { label: "Scheduled", variant: "secondary" as const },
    live: { label: "LIVE", variant: "destructive" as const },
    final: { label: "Final", variant: "default" as const },
  }

  const status = statusConfig[match.status as keyof typeof statusConfig]

  return (
    <Card className="border-0 bg-white/50 backdrop-blur-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-gray-50">
                  {match.homeTeam.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-900 truncate">{match.homeTeam.name}</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{match.homeTeam.score}</span>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-gray-50">
                  {match.awayTeam.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-900 truncate">{match.awayTeam.name}</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{match.awayTeam.score}</span>
          </div>

          {/* Status */}
          <div className="flex justify-center pt-2">
            <Badge 
              variant={status.variant}
              className={cn(
                "text-xs",
                match.status === "live" && "animate-pulse"
              )}
            >
              {match.status === "scheduled" && match.time ? match.time : status.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BracketPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const bracketData = mockBracketData[selectedSport as keyof typeof mockBracketData]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament Bracket</h1>
          <p className="text-gray-600">Follow the tournament progression</p>
        </div>

        {/* Sport Tabs */}
        <Tabs value={selectedSport} onValueChange={setSelectedSport} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="football" className="flex items-center gap-2">
              <span>⚽</span>
              <span className="hidden sm:inline">Football</span>
            </TabsTrigger>
            <TabsTrigger value="basketball" className="flex items-center gap-2">
              <span>🏀</span>
              <span className="hidden sm:inline">Basketball</span>
            </TabsTrigger>
            <TabsTrigger value="volleyball" className="flex items-center gap-2">
              <span>🏐</span>
              <span className="hidden sm:inline">Volleyball</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="football" className="mt-6">
            <BracketView rounds={bracketData.rounds} />
          </TabsContent>
          <TabsContent value="basketball" className="mt-6">
            <BracketView rounds={bracketData.rounds} />
          </TabsContent>
          <TabsContent value="volleyball" className="mt-6">
            <BracketView rounds={bracketData.rounds} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function BracketView({ rounds }: { rounds: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {rounds.map((round, roundIndex) => (
        <div key={round.name} className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">{round.name}</h3>
          </div>
          <div className="space-y-4">
            {round.matches.map((match: any) => (
              <BracketMatch key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
} 