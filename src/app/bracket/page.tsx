"use client"

import { useEffect, useMemo, useState, useCallback, memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navigation/Navbar"
import { cn } from "@/lib/utils"
import { Bracket, type IRoundProps, Seed, SeedItem, SeedTeam, type IRenderSeedProps } from "@sportsgram/brackets"

type ApiTeam = { id: number; name: string; grade: string; gender?: string }
type ApiMatch = {
  id: number
  team_a_id: number | null
  team_b_id: number | null
  next_match_id: number | null
  sport_type: string
  gender?: string
  status: string
  winner_id?: number | null
  match_time?: string | null
  created_at: string
  teamA?: ApiTeam | null
  teamB?: ApiTeam | null
}

type BracketColumn = ApiMatch[][]

// Memoized components for better performance
const BracketMiniCard = memo(({ 
  titleA, 
  titleB, 
  wonA, 
  wonB 
}: { 
  titleA: string
  titleB: string
  wonA?: boolean
  wonB?: boolean 
}) => {
  const getInitials = useCallback((name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2)
  , [])

  return (
    <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow w-[clamp(220px,24vw,320px)]">
      <CardContent className="p-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px] bg-gray-50">
                {getInitials(titleA)}
                </AvatarFallback>
              </Avatar>
            <span className={cn("text-sm font-medium truncate", wonA ? "text-green-700" : "text-gray-900")}>
              {titleA}
            </span>
          </div>
          {wonA && <Badge variant="outline" className="ml-2 text-green-600 border-green-600">Won</Badge>}
            </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-[10px] bg-gray-50">
                {getInitials(titleB)}
              </AvatarFallback>
            </Avatar>
            <span className={cn("text-sm font-medium truncate", wonB ? "text-green-700" : "text-gray-900")}>
              {titleB}
            </span>
          </div>
          {wonB && <Badge variant="outline" className="ml-2 text-green-600 border-green-600">Won</Badge>}
        </div>
      </CardContent>
    </Card>
  )
})
BracketMiniCard.displayName = "BracketMiniCard"

const NextMatchCard = memo(({ teamA, teamB }: { teamA: string; teamB: string }) => {
  const getInitials = useCallback((name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2)
  , [])

  return (
    <Card className="border border-gray-200 bg-white shadow-md w-[clamp(220px,24vw,320px)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-gray-100">
                {getInitials(teamA)}
                </AvatarFallback>
              </Avatar>
            <span className="text-sm font-medium text-gray-900 truncate">{teamA}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-gray-100">
                {getInitials(teamB)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900 truncate">{teamB}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
NextMatchCard.displayName = "NextMatchCard"

// Custom styled seed component following @sportsgram/brackets structure
const CustomSeed = ({ seed }: IRenderSeedProps) => {
  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const winnerIndex = seed.winner

  return (
    <Seed style={{ backgroundColor: 'transparent' }}>
      <SeedItem style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden' }}>
        <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-[10px] hover:shadow-lg hover:border-gray-300 transition-all min-w-[280px]">
          {/* Team A */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
              {getInitials(seed.teams?.[0]?.name || 'TBD')}
            </div>
            <SeedTeam className="flex-1 text-sm font-medium text-gray-900 truncate">
              {seed.teams?.[0]?.name || 'TBD'}
            </SeedTeam>
            {winnerIndex === 0 && (
              <Badge className="bg-green-600 text-white text-xs">Winner</Badge>
            )}
          </div>
          {/* Divider */}
          <div className="h-px bg-gray-100 -mx-4" />
          {/* Team B */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
              {getInitials(seed.teams?.[1]?.name || 'TBD')}
            </div>
            <SeedTeam className="flex-1 text-sm font-medium text-gray-900 truncate">
              {seed.teams?.[1]?.name || 'TBD'}
            </SeedTeam>
            {winnerIndex === 1 && (
              <Badge className="bg-green-600 text-white text-xs">Winner</Badge>
            )}
          </div>
        </div>
      </SeedItem>
    </Seed>
  )
}

// Optimized bracket building logic
function buildBracketStructure(matches: ApiMatch[]) {
  if (matches.length === 0) return { columns: [], matchById: new Map(), depthById: new Map() }

  // Build lookup maps
  const matchById = new Map<number, ApiMatch>()
  const feedersByNextId = new Map<number, ApiMatch[]>()
  
  for (const m of matches) {
    matchById.set(m.id, m)
    if (m.next_match_id) {
      const feeders = feedersByNextId.get(m.next_match_id) ?? []
      feeders.push(m)
      feedersByNextId.set(m.next_match_id, feeders)
    }
  }

  // Calculate depth using BFS from finals
  const depthById = new Map<number, number>()
  const finals = matches.filter(m => m.next_match_id === null)
  const queue = [...finals]
  
  for (const f of finals) {
    depthById.set(f.id, 0)
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDepth = depthById.get(current.id)!
    const feeders = feedersByNextId.get(current.id) ?? []
    
    for (const feeder of feeders) {
      if (!depthById.has(feeder.id)) {
        depthById.set(feeder.id, currentDepth + 1)
        queue.push(feeder)
      }
    }
  }

  // Build columns from deepest to finals
  const maxDepth = Math.max(...Array.from(depthById.values()), 0)
  const columnsByDepth: ApiMatch[][] = Array.from({ length: maxDepth + 1 }, () => [])
  
  // Populate finals
  columnsByDepth[0] = finals

  // Build subsequent rounds by following feeders
  for (let depth = 1; depth <= maxDepth; depth++) {
    const previousRound = columnsByDepth[depth - 1]
    const currentRound: ApiMatch[] = []
    
    for (const nextMatch of previousRound) {
      const feeders = (feedersByNextId.get(nextMatch.id) ?? []).sort((a, b) => a.id - b.id)
      currentRound.push(...feeders)
    }
    
    columnsByDepth[depth] = currentRound
  }

  // Reverse to get left-to-right display order
  const columns = columnsByDepth.reverse()

  return { columns, matchById, depthById, feedersByNextId }
}

export default function BracketPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const [selectedGender, setSelectedGender] = useState<"male" | "female">("male")
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true)
      setFetchError(null)
      
      try {
        const res = await fetch('/api/matches')
        
        if (!res.ok) {
          const text = await res.text()
          console.error('Matches API error', res.status, text)
          throw new Error(`API error ${res.status}`)
        }
        
        const data = await res.json()
        console.log('Bracket fetched matches:', data.matches)
        setMatches((data.matches || []) as ApiMatch[])
      } catch (e) {
        console.error('Failed to fetch matches', e)
        setFetchError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMatches()
  }, [])

  // Optimized filtering with useMemo
  const filteredMatches = useMemo(() => {
    return matches.filter(m => 
      m.sport_type === selectedSport && 
      m.gender === selectedGender
    )
  }, [matches, selectedSport, selectedGender])

  // Build bracket structure once when filtered matches change
  const bracketData = useMemo(() => 
    buildBracketStructure(filteredMatches), 
    [filteredMatches]
  )

  const { columns, matchById, feedersByNextId } = bracketData

  const renderBracketColumn = useCallback((col: ApiMatch[], colIdx: number) => {
    // Hide matches that are targets of feeders (they will be rendered as centered preview from previous column)
    const sourceOnly = col.filter(m => !(feedersByNextId as Map<number, ApiMatch[]>).has(m.id))

    // Group by next_match_id to show feeders together
    const groupMap = new Map<number | string, ApiMatch[]>()
    
    for (const m of sourceOnly) {
      const key = m.next_match_id ?? `self-${m.id}`
      const group = groupMap.get(key) ?? []
      group.push(m)
      groupMap.set(key, group)
    }

    const isNotFinals = colIdx < columns.length - 1

    return Array.from(groupMap.entries()).map(([key, group]) => {
      const nextId = typeof key === 'number' ? key : null
      const nextMatch = nextId ? matchById.get(nextId) : undefined
      
      return (
        <div key={String(key)} className="mb-8">
          <div className={cn("grid items-center gap-6", isNotFinals ? "grid-cols-[1fr_auto_auto]" : "grid-cols-1")}>
            {/* Left side: Feeder matches */}
            <div className="space-y-4 relative">
              {group.map((m, idx) => {
                const titleA = m.teamA?.name || 'TBD'
                const titleB = m.teamB?.name || 'TBD'
                const wonA = m.winner_id != null && m.winner_id === m.team_a_id
                const wonB = m.winner_id != null && m.winner_id === m.team_b_id
                
                return (
                  <div key={m.id} className="relative">
                    <BracketMiniCard 
                      titleA={titleA} 
                      titleB={titleB} 
                      wonA={wonA} 
                      wonB={wonB} 
                    />
                    {/* Modern horizontal connector to bus */}
                    {isNotFinals && nextMatch && (
                      <>
                        <div className="absolute top-1/2 -right-7 w-7 h-[2px] rounded-full bg-gradient-to-r from-gray-200 to-gray-300 -translate-y-1/2" />
                        <div className="absolute top-1/2 -right-8 h-1.5 w-1.5 rounded-full bg-gray-300 -translate-y-1/2" />
                      </>
                    )}
                  </div>
                )
              })}
              {/* Modern vertical bus connecting feeder pair */}
              {isNotFinals && nextMatch && group.length >= 2 && (
                <>
                <div 
                    className="absolute right-0 w-[2px] rounded-full bg-gradient-to-b from-gray-200 to-gray-300"
                  style={{
                      top: 'calc(50% - 0.5rem)',
                      bottom: 'calc(50% - 0.5rem)',
                    height: 'auto',
                    transform: 'translateY(-50%)'
                  }}
                />
                  <div className="absolute right-0 -translate-x-1 top-[calc(50%-0.5rem)] h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <div className="absolute right-0 -translate-x-1 bottom-[calc(50%-0.5rem)] h-1.5 w-1.5 rounded-full bg-gray-300" />
                </>
              )}
            </div>

            {/* Right side: Next match preview - only show if there are multiple feeders */}
            {isNotFinals && nextMatch && group.length >= 2 && (
              <>
                {/* Center: Vertical connector */}
                <div className="h-full flex items-center justify-center">
                  <div className="w-[2px] h-32 rounded-full bg-gradient-to-b from-gray-200 to-gray-300" />
                </div>
                
                <div className="relative flex justify-center">
                  <NextMatchCard 
                    teamA={nextMatch.teamA?.name || 'TBD'} 
                    teamB={nextMatch.teamB?.name || 'TBD'} 
                  />
                  {/* Horizontal line from connector to next match */}
                  <div className="absolute top-1/2 -left-10 w-10 h-[2px] rounded-full bg-gradient-to-r from-gray-200 to-gray-300 -translate-y-1/2" />
                  <div className="absolute top-1/2 -left-10 -translate-x-2 h-1.5 w-1.5 rounded-full bg-gray-300 -translate-y-1/2" />
                </div>
              </>
            )}
          </div>
        </div>
      )
    })
  }, [columns.length, matchById])

  const showEmptyState = !isLoading && !fetchError && (
    matches.length === 0 || filteredMatches.length === 0 || columns.length === 0
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Tournament Bracket</h1>
            <p className="text-gray-600">Follow match progression</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <Label htmlFor="gender-select" className="text-sm text-gray-700">Gender</Label>
              <Select value={selectedGender} onValueChange={(v) => setSelectedGender(v as 'male' | 'female')}>
                <SelectTrigger id="gender-select" className="w-[160px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs value={selectedSport} onValueChange={setSelectedSport} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="football">⚽ Football</TabsTrigger>
            <TabsTrigger value="basketball">🏀 Basketball</TabsTrigger>
            <TabsTrigger value="volleyball">🏐 Volleyball</TabsTrigger>
          </TabsList>
        </Tabs>

        {fetchError && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-700">❌ Failed to load matches: {fetchError}</p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex gap-16">
              {/* Round 1 Skeleton */}
              <div className="space-y-4 min-w-[280px]">
                <Skeleton className="h-6 w-20 mx-auto mb-4" />
                <div className="space-y-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-[10px] p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                      <Skeleton className="h-px w-full" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Round 2 Skeleton */}
              <div className="space-y-4 min-w-[280px]">
                <Skeleton className="h-6 w-20 mx-auto mb-4" />
                <div className="space-y-16">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-[10px] p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                      <Skeleton className="h-px w-full" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Finals Skeleton */}
              <div className="space-y-4 min-w-[280px]">
                <Skeleton className="h-6 w-24 mx-auto mb-4" />
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="bg-white border border-gray-200 rounded-[10px] p-4 space-y-2 w-full">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                    <Skeleton className="h-px w-full" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !fetchError && matches.length === 0 && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">⚠️ No data fetched from API. Create matches first or check API connectivity.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !fetchError && matches.length > 0 && filteredMatches.length === 0 && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">⚠️ No matches match current filters. Try changing sport or gender.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !fetchError && filteredMatches.length > 0 && columns.length === 0 && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700">⚠️ Bracket structure incomplete. Ensure matches have proper next_match_id links.</p>
            </CardContent>
          </Card>
        )}

        

        {!showEmptyState && !isLoading && !fetchError && columns.length > 0 && (
          <div className="w-full overflow-x-auto pb-4">
            <style dangerouslySetInnerHTML={{__html: `
              .react-brackets__bracket {
                gap: 60px !important;
              }
              .react-brackets__round {
                gap: 40px !important;
              }
            `}} />
            {(() => {
              const rounds: IRoundProps[] = columns.map((col, idx) => ({
                title: idx === columns.length - 1 ? '🏆 Finals' : `Round ${idx + 1}`,
                seeds: col.map((m) => {
                  // Determine winner index (0 for team A, 1 for team B, undefined for no winner)
                  let winnerIndex: number | undefined = undefined
                  if (m.winner_id && m.team_a_id && m.team_b_id) {
                    if (m.winner_id === m.team_a_id) {
                      winnerIndex = 0
                    } else if (m.winner_id === m.team_b_id) {
                      winnerIndex = 1
                    }
                  }
                  
                  return {
                    id: m.id,
                    date: (m.match_time ?? m.created_at) || new Date().toISOString(),
                    teams: [
                      { name: m.teamA?.name || 'TBD' },
                      { name: m.teamB?.name || 'TBD' }
                    ],
                    winner: winnerIndex // Custom property for winner highlighting
                  }
                })
              }))
              return (
                <Bracket 
                  rounds={rounds}
                  renderSeedComponent={CustomSeed}
                  roundTitleComponent={(title) => (
                    <div className="text-sm font-semibold text-gray-800 text-center mb-4 tracking-wide">
                      {title}
                    </div>
                  )}
                />
                    )
                  })()}
        </div>
        )}
      </main>
    </div>
  )
}