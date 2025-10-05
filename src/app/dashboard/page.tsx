"use client"

import { SportsStats } from "@/components/sports/sports-stats"
import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type MatchItem = {
  id: number
  match_time?: string
  status?: string
  teamA?: { id: number; name: string }
  teamB?: { id: number; name: string }
}

type ChampionshipItem = {
  id: number
  name: string
  status: string
  team_count?: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    playedGames: 0,
    unscheduledMatches: 0,
    totalChampionships: 0,
    activeTeams: 0,
  })

  const [upcoming, setUpcoming] = useState<MatchItem[]>([])
  const [recent, setRecent] = useState<MatchItem[]>([])
  const [champs, setChamps] = useState<ChampionshipItem[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [scheduledRes, playedRes, notYetRes, champsRes] = await Promise.all([
          fetch('/api/matches?status=scheduled'),
          fetch('/api/matches?status=played'),
          fetch('/api/matches?status=not_yet_scheduled'),
          fetch('/api/championships'),
        ])

        const [scheduledJson, playedJson, notYetJson, champsJson] = await Promise.all([
          scheduledRes.json(),
          playedRes.json(),
          notYetRes.json(),
          champsRes.json(),
        ])

        const scheduled: MatchItem[] = scheduledJson?.matches || []
        const played: MatchItem[] = playedJson?.matches || []
        const notYet: MatchItem[] = notYetJson?.matches || []
        const championships: ChampionshipItem[] = Array.isArray(champsJson) ? champsJson : []

        // Stats
        const activeTeams = championships.reduce((sum, c) => sum + (c.team_count || 0), 0)
        setStats({
          playedGames: played.length,
          unscheduledMatches: notYet.length,
          totalChampionships: championships.length,
          activeTeams,
        })

        // Lists
        const sortByTimeAsc = (a: MatchItem, b: MatchItem) => {
          const ta = a.match_time ? new Date(a.match_time).getTime() : 0
          const tb = b.match_time ? new Date(b.match_time).getTime() : 0
          return ta - tb
        }
        const sortByTimeDesc = (a: MatchItem, b: MatchItem) => -sortByTimeAsc(a, b)

        setUpcoming(scheduled.sort(sortByTimeAsc).slice(0, 5))
        setRecent(played.sort(sortByTimeDesc).slice(0, 5))
        setChamps(championships.slice(0, 6))
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    fetchAll()
  }, [])

  const formatDate = (iso?: string) => {
    if (!iso) return 'TBD'
    const d = new Date(iso)
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <SportsStats
        playedGames={stats.playedGames}
        unscheduledMatches={stats.unscheduledMatches}
        totalChampionships={stats.totalChampionships}
        activeTeams={stats.activeTeams}
      />

      {/* Secondary content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full px-4 lg:px-6">
        {/* Upcoming Matches */}
        <Card className="lg:col-span-2 w-full overflow-hidden border border-gray-200/60 shadow-none bg-gradient-to-t from-indigo-50/80 to-white">
          <CardHeader className="px-4 ">
            <CardTitle className="text-sm font-semibold text-gray-800 tracking-wide">Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {upcoming.length === 0 ? (
              <p className="text-base text-gray-500">No upcoming matches scheduled.</p>
            ) : (
              <div className="divide-y">
                {upcoming.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium text-gray-900 truncate">{m.teamA?.name || 'Team A'}</span>
                      <Badge variant="outline" className="h-5 px-2 text-xs rounded-full border-gray-300 text-gray-600 shrink-0">vs</Badge>
                      <span className="text-sm font-medium text-gray-900 truncate">{m.teamB?.name || 'Team B'}</span>
                    </div>
                    <div className="text-sm text-gray-500 shrink-0">
                      {formatDate(m.match_time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Championships */}
        <Card className="w-full overflow-hidden border border-gray-200/60 shadow-none bg-gradient-to-t from-emerald-50/40 to-white">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800 tracking-wide">Active Championships</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {champs.length === 0 ? (
              <p className="text-base text-gray-500">No championships found.</p>
            ) : (
              <div className="space-y-3">
                {champs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.status === 'ongoing' ? 'Ongoing' : 'Ended'}</p>
                    </div>
                    <Badge variant="outline" className="h-5 px-2 text-xs rounded-full border-gray-300 text-gray-600">
                      {(c.team_count || 0)} teams
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent results */}
      <div className="px-4 lg:px-6">
      <Card className="w-full overflow-hidden border border-gray-200/60 shadow-none bg-gradient-to-t from-amber-50/40 to-white">
        <CardHeader className="px-4 py-3 pb-2">
          <CardTitle className="text-sm font-semibold text-gray-800 tracking-wide">Recent Results</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {recent.length === 0 ? (
            <p className="text-base text-gray-500">No results yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((m) => (
                <div key={m.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium text-gray-900 truncate">{m.teamA?.name || 'Team A'}</span>
                      <Badge variant="outline" className="h-5 px-2 text-xs rounded-full border-gray-300 text-gray-600">vs</Badge>
                      <span className="text-sm font-medium text-gray-900 truncate">{m.teamB?.name || 'Team B'}</span>
                    </div>
                    <span className="text-sm text-gray-500 shrink-0">{formatDate(m.match_time)}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">Status: Played</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
