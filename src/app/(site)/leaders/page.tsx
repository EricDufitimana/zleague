"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navigation/Navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types for different leaderboard entries
type FootballPlayer = {
  rank: number;
  name: string;
  team: string;
  goals: number;
  assists: number;
  shotsOnTarget: number;
  saves: number;
  gamesPlayed: number;
  goalsPerGame: string;
  assistsPerGame: string;
  shotsOnTargetPerGame: string;
  savesPerGame: string;
  avatar: string;
};

type BasketballPlayer = {
  rank: number;
  name: string;
  team: string;
  points: number;
  rebounds: number;
  assists: number;
  threePointsMade: number;
  threePointsAttempted: number;
  gamesPlayed: number;
  ppg: string;
  rpg: string;
  apg: string;
  threePointsPerGame: string;
  threePointPercentage: string;
  avatar: string;
};

type VolleyballPlayer = {
  rank: number;
  name: string;
  team: string;
  points: number;
  blocks: number;
  aces: number;
  avatar: string;
};

type LeaderPlayer = FootballPlayer | BasketballPlayer | VolleyballPlayer;

export default function LeadersPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const [selectedCategory, setSelectedCategory] = useState("goals")
  const [selectedGender, setSelectedGender] = useState("all")
  const [allLeaders, setAllLeaders] = useState<LeaderPlayer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Reset category when sport changes
  useEffect(() => {
    const categories = getCategories(selectedSport)
    if (categories.length > 0) {
      setSelectedCategory(categories[0].value)
    }
  }, [selectedSport])

  // Fetch leaders data from API (only when sport or gender changes)
  useEffect(() => {
    const fetchLeaders = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/leaders?sport=${selectedSport}&gender=${selectedGender}`)
        const data = await response.json()
        
        if (data.success) {
          setAllLeaders(data.leaders)
        } else {
          console.error('Failed to fetch leaders:', data.error)
          setAllLeaders([])
        }
      } catch (error) {
        console.error('Error fetching leaders:', error)
        setAllLeaders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaders()
  }, [selectedSport, selectedGender])

  // Filter and sort leaders client-side based on selected category
  const leaders = useMemo(() => {
    if (allLeaders.length === 0) return []

    const sorted = [...allLeaders]

    // Sort based on selected category
    if (selectedSport === 'football') {
      if (selectedCategory === 'goals') {
        sorted.sort((a, b) => {
          const aPlayer = a as FootballPlayer
          const bPlayer = b as FootballPlayer
          return bPlayer.goals - aPlayer.goals || bPlayer.assists - aPlayer.assists
        })
      } else if (selectedCategory === 'assists') {
        sorted.sort((a, b) => {
          const aPlayer = a as FootballPlayer
          const bPlayer = b as FootballPlayer
          return bPlayer.assists - aPlayer.assists || bPlayer.goals - aPlayer.goals
        })
      } else if (selectedCategory === 'saves') {
        sorted.sort((a, b) => {
          const aPlayer = a as FootballPlayer
          const bPlayer = b as FootballPlayer
          return bPlayer.saves - aPlayer.saves || bPlayer.goals - aPlayer.goals
        })
      } else if (selectedCategory === 'shots_on_target') {
        sorted.sort((a, b) => {
          const aPlayer = a as FootballPlayer
          const bPlayer = b as FootballPlayer
          return bPlayer.shotsOnTarget - aPlayer.shotsOnTarget || bPlayer.goals - aPlayer.goals
        })
      }
    } else if (selectedSport === 'basketball') {
      if (selectedCategory === 'points') {
        sorted.sort((a, b) => {
          const aPlayer = a as BasketballPlayer
          const bPlayer = b as BasketballPlayer
          return bPlayer.points - aPlayer.points || bPlayer.assists - aPlayer.assists
        })
      } else if (selectedCategory === 'rebounds') {
        sorted.sort((a, b) => {
          const aPlayer = a as BasketballPlayer
          const bPlayer = b as BasketballPlayer
          return bPlayer.rebounds - aPlayer.rebounds || bPlayer.points - aPlayer.points
        })
      } else if (selectedCategory === 'assists') {
        sorted.sort((a, b) => {
          const aPlayer = a as BasketballPlayer
          const bPlayer = b as BasketballPlayer
          return bPlayer.assists - aPlayer.assists || bPlayer.points - aPlayer.points
        })
      } else if (selectedCategory === 'three_points_made') {
        sorted.sort((a, b) => {
          const aPlayer = a as BasketballPlayer
          const bPlayer = b as BasketballPlayer
          return bPlayer.threePointsMade - aPlayer.threePointsMade || bPlayer.points - aPlayer.points
        })
      }
    }

    // Re-rank after sorting and take top 10
    return sorted.slice(0, 10).map((player, index) => ({
      ...player,
      rank: index + 1
    }))
  }, [allLeaders, selectedCategory, selectedSport])

  const getCategories = (sport: string) => {
    switch (sport) {
      case "football":
        return [
          { value: "goals", label: "Goals" },
          { value: "assists", label: "Assists" },
          { value: "saves", label: "Saves" },
          { value: "shots_on_target", label: "Shots on Target" },
        ]
      case "basketball":
        return [
          { value: "points", label: "Points" },
          { value: "rebounds", label: "Rebounds" },
          { value: "assists", label: "Assists" },
          { value: "three_points_made", label: "3-Pointers Made" },
        ]
      case "volleyball":
        return [
          { value: "points", label: "Points" },
          { value: "blocks", label: "Blocks" },
        ]
      default:
        return []
    }
  }

  const categories = getCategories(selectedSport)

  const getColumnHeaders = (sport: string, category: string) => {
    switch (sport) {
      case "football":
        return ["Rank", "Player", "Family", "Total Goals", "Total Assists", "Shots on Target", "Saves", "Games"]
      case "basketball":
        return ["Rank", "Player", "Family", "Total Points", "Total Rebounds", "Total Assists", "3PT Made", "Games"]
      case "volleyball":
        return ["Rank", "Player", "Family", "Points", "Blocks", "Aces"]
      default:
        return []
    }
  }

  const headers = getColumnHeaders(selectedSport, selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboards</h1>
          <p className="text-gray-600">Top performers across all sports</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Sport</label>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="football">⚽ Football</SelectItem>
                <SelectItem value="basketball">🏀 Basketball</SelectItem>
                <SelectItem value="volleyball">🏐 Volleyball</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leaderboard Table */}
        <Card className="border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">
                {selectedSport === "football" && "⚽"}
                {selectedSport === "basketball" && "🏀"}
                {selectedSport === "volleyball" && "🏐"}
              </span>
              Top {categories.find(c => c.value === selectedCategory)?.label} Leaders
            </CardTitle>
            {selectedSport === "basketball" && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-gray-700">
                  <span className="font-semibold">💡 Tip:</span> Hover over stats to see averages per game (PPG = Points Per Game, RPG = Rebounds Per Game, APG = Assists Per Game)
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : leaders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header} className="font-semibold text-gray-900">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((player: LeaderPlayer) => (
                    <TableRow key={player.rank} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium">
                        <Badge variant={player.rank <= 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                          {player.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                      
                          <span className="font-medium text-gray-900">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{player.team}</TableCell>
                      {selectedSport === "football" && (
                        <>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as FootballPlayer).goals}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">Per Game:</span>
                                    <span className="text-sm font-semibold text-emerald-600">{(player as FootballPlayer).goalsPerGame}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as FootballPlayer).assists}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">Per Game:</span>
                                    <span className="text-sm font-semibold text-blue-600">{(player as FootballPlayer).assistsPerGame}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as FootballPlayer).shotsOnTarget}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">Per Game:</span>
                                    <span className="text-sm font-semibold text-purple-600">{(player as FootballPlayer).shotsOnTargetPerGame}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as FootballPlayer).saves}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">Per Game:</span>
                                    <span className="text-sm font-semibold text-orange-600">{(player as FootballPlayer).savesPerGame}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">{(player as FootballPlayer).gamesPlayed}</TableCell>
                        </>
                      )}
                      {selectedSport === "basketball" && (
                        <>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as BasketballPlayer).points}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">PPG:</span>
                                    <span className="text-sm font-semibold text-emerald-600">{(player as BasketballPlayer).ppg}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as BasketballPlayer).rebounds}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">RPG:</span>
                                    <span className="text-sm font-semibold text-blue-600">{(player as BasketballPlayer).rpg}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as BasketballPlayer).assists}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-600">APG:</span>
                                    <span className="text-sm font-semibold text-purple-600">{(player as BasketballPlayer).apg}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="font-bold text-gray-900 cursor-help">
                                    {(player as BasketballPlayer).threePointsMade}
                                    <span className="text-xs text-gray-500">/{(player as BasketballPlayer).threePointsAttempted}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border border-gray-200 shadow-sm px-2 py-1.5">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-600">3P%:</span>
                                      <span className="text-sm font-semibold text-orange-600">{(player as BasketballPlayer).threePointPercentage}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-600">Per Game:</span>
                                      <span className="text-sm font-semibold text-orange-600">{(player as BasketballPlayer).threePointsPerGame}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">{(player as BasketballPlayer).gamesPlayed}</TableCell>
                        </>
                      )}
                      {selectedSport === "volleyball" && (
                        <>
                          <TableCell className="font-bold text-gray-900">{(player as VolleyballPlayer).points}</TableCell>
                          <TableCell className="font-bold text-gray-900">{(player as VolleyballPlayer).blocks}</TableCell>
                          <TableCell className="font-bold text-gray-900">{(player as VolleyballPlayer).aces}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
                <p className="text-gray-600">No statistics recorded for this category yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 