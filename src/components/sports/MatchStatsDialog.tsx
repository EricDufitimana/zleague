"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Target, Users, Crosshair, Shield } from "lucide-react"

interface PlayerStat {
  player_id: number
  player_name: string
  // Basketball stats
  points?: number
  rebounds?: number
  assists?: number
  three_points_made?: number
  three_points_attempted?: number
  // Football stats
  goals?: number
  shots_on_target?: number
  saves?: number
}

interface TeamStats {
  team_id: number
  team_name: string
  players: PlayerStat[]
  total_score: number
}

interface MatchStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matchId: string
  sport: "football" | "basketball" | "volleyball"
  homeTeamName: string
  awayTeamName: string
}

export function MatchStatsDialog({ 
  open, 
  onOpenChange, 
  matchId, 
  sport,
  homeTeamName,
  awayTeamName 
}: MatchStatsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [teamAStats, setTeamAStats] = useState<TeamStats | null>(null)
  const [teamBStats, setTeamBStats] = useState<TeamStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && matchId) {
      fetchMatchStats()
    }
  }, [open, matchId])

  const fetchMatchStats = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const endpoint = sport === 'basketball' 
        ? `/api/basketball-scores?match_id=${matchId}`
        : `/api/football-scores?match_id=${matchId}`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      
      // Group stats by team
      const teamStats = new Map<number, TeamStats>()
      
      data.scores?.forEach((score: any) => {
        const teamId = score.team_id
        const teamName = score.team?.name || 'Unknown Team'
        
        if (!teamStats.has(teamId)) {
          teamStats.set(teamId, {
            team_id: teamId,
            team_name: teamName,
            players: [],
            total_score: 0
          })
        }
        
        const team = teamStats.get(teamId)!
        const playerName = score.player 
          ? `${score.player.first_name} ${score.player.last_name}`
          : 'Unknown Player'
        
        if (sport === 'basketball') {
          team.players.push({
            player_id: score.player_id,
            player_name: playerName,
            points: score.points || 0,
            rebounds: score.rebounds || 0,
            assists: score.assists || 0,
            three_points_made: score.three_points_made || 0,
            three_points_attempted: score.three_points_attempted || 0,
          })
          team.total_score += score.points || 0
        } else {
          team.players.push({
            player_id: score.player_id,
            player_name: playerName,
            goals: score.goals || 0,
            assists: score.assists || 0,
            shots_on_target: score.shots_on_target || 0,
            saves: score.saves || 0,
          })
          team.total_score += score.goals || 0
        }
      })
      
      const teams = Array.from(teamStats.values())
      setTeamAStats(teams[0] || null)
      setTeamBStats(teams[1] || null)
      
    } catch (err) {
      console.error('Error fetching match stats:', err)
      setError('Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  const renderBasketballStats = (team: TeamStats) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-semibold">
              {team.team_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-gray-900">{team.team_name}</h3>
        </div>
        <Badge className="bg-blue-600 text-white">{team.total_score} pts</Badge>
      </div>
      
      {team.players.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No player stats available</p>
      ) : (
        <div className="space-y-2">
          {team.players.map((player) => (
            <div key={player.player_id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">{player.player_name}</span>
                <span className="text-lg font-bold text-blue-600">{player.points} pts</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{player.rebounds} reb</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{player.assists} ast</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span>{player.three_points_made}/{player.three_points_attempted} 3PT</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderFootballStats = (team: TeamStats) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-semibold">
              {team.team_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-gray-900">{team.team_name}</h3>
        </div>
        <Badge className="bg-green-600 text-white">{team.total_score} goals</Badge>
      </div>
      
      {team.players.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No player stats available</p>
      ) : (
        <div className="space-y-2">
          {team.players.map((player) => (
            <div key={player.player_id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">{player.player_name}</span>
                <span className="text-lg font-bold text-green-600">⚽ {player.goals}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{player.assists} assists</span>
                </div>
                <div className="flex items-center gap-1">
                  <Crosshair className="h-3 w-3" />
                  <span>{player.shots_on_target} shots</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>{player.saves} saves</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900 tracking-tight">Match Statistics</DialogTitle>
          <DialogDescription className="text-gray-600">
            Player performance breakdown for {homeTeamName} vs {awayTeamName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(95vh-140px)] pr-4">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">❌ {error}</p>
              <p className="text-sm text-gray-500">Unable to load player statistics</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {teamAStats && (
                  <div className="space-y-4 pt-4">
                    {sport === 'basketball' 
                      ? renderBasketballStats(teamAStats)
                      : renderFootballStats(teamAStats)
                    }
                  </div>
                )}
                
                {teamBStats && (
                  <div className="space-y-4 pt-4">
                    {sport === 'basketball'
                      ? renderBasketballStats(teamBStats)
                      : renderFootballStats(teamBStats)
                    }
                  </div>
                )}
                
                {!teamAStats && !teamBStats && (
                  <div className="col-span-2 text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No statistics available</h3>
                    <p className="text-gray-600">Statistics for this match will appear here once the game is completed.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

