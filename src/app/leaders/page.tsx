"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/Navbar"

// Mock leaderboard data
const mockLeaders = {
  football: {
    goals: [
      { rank: 1, name: "Erling Haaland", team: "Manchester City", goals: 12, assists: 3, avatar: "" },
      { rank: 2, name: "Kylian Mbappé", team: "PSG", goals: 10, assists: 5, avatar: "" },
      { rank: 3, name: "Harry Kane", team: "Bayern Munich", goals: 9, assists: 2, avatar: "" },
      { rank: 4, name: "Vinicius Jr", team: "Real Madrid", goals: 8, assists: 6, avatar: "" },
      { rank: 5, name: "Mohamed Salah", team: "Liverpool", goals: 7, assists: 4, avatar: "" },
    ],
    assists: [
      { rank: 1, name: "Kevin De Bruyne", team: "Manchester City", goals: 3, assists: 8, avatar: "" },
      { rank: 2, name: "Bruno Fernandes", team: "Manchester United", goals: 4, assists: 7, avatar: "" },
      { rank: 3, name: "Vinicius Jr", team: "Real Madrid", goals: 8, assists: 6, avatar: "" },
      { rank: 4, name: "Kylian Mbappé", team: "PSG", goals: 10, assists: 5, avatar: "" },
      { rank: 5, name: "Lionel Messi", team: "Inter Miami", goals: 6, assists: 5, avatar: "" },
    ],
  },
  basketball: {
    points: [
      { rank: 1, name: "LeBron James", team: "Lakers", points: 28.5, rebounds: 7.2, assists: 8.1, avatar: "" },
      { rank: 2, name: "Stephen Curry", team: "Warriors", points: 27.8, rebounds: 4.3, assists: 6.8, avatar: "" },
      { rank: 3, name: "Kevin Durant", team: "Suns", points: 26.4, rebounds: 6.8, assists: 5.2, avatar: "" },
      { rank: 4, name: "Giannis Antetokounmpo", team: "Bucks", points: 25.7, rebounds: 11.2, assists: 5.9, avatar: "" },
      { rank: 5, name: "Luka Dončić", team: "Mavericks", points: 25.1, rebounds: 8.2, assists: 8.9, avatar: "" },
    ],
    rebounds: [
      { rank: 1, name: "Giannis Antetokounmpo", team: "Bucks", points: 25.7, rebounds: 11.2, assists: 5.9, avatar: "" },
      { rank: 2, name: "Nikola Jokić", team: "Nuggets", points: 24.8, rebounds: 10.9, assists: 9.1, avatar: "" },
      { rank: 3, name: "Joel Embiid", team: "76ers", points: 23.4, rebounds: 10.1, assists: 4.2, avatar: "" },
      { rank: 4, name: "Anthony Davis", team: "Lakers", points: 22.1, rebounds: 9.8, assists: 3.4, avatar: "" },
      { rank: 5, name: "Domantas Sabonis", team: "Kings", points: 19.8, rebounds: 9.5, assists: 6.2, avatar: "" },
    ],
  },
  volleyball: {
    points: [
      { rank: 1, name: "Yuki Ishikawa", team: "Japan", points: 245, blocks: 18, aces: 12, avatar: "" },
      { rank: 2, name: "Wilfredo León", team: "Poland", points: 238, blocks: 15, aces: 18, avatar: "" },
      { rank: 3, name: "Earvin N&apos;Gapeth", team: "France", points: 226, blocks: 12, aces: 14, avatar: "" },
      { rank: 4, name: "Yuji Nishida", team: "Japan", points: 218, blocks: 14, aces: 16, avatar: "" },
      { rank: 5, name: "Bartosz Kurek", team: "Poland", points: 212, blocks: 11, aces: 13, avatar: "" },
    ],
    blocks: [
      { rank: 1, name: "Maxwell Holt", team: "USA", points: 156, blocks: 42, aces: 8, avatar: "" },
      { rank: 2, name: "Robertlandy Simón", team: "Cuba", points: 134, blocks: 38, aces: 11, avatar: "" },
      { rank: 3, name: "Yuki Ishikawa", team: "Japan", points: 245, blocks: 18, aces: 12, avatar: "" },
      { rank: 4, name: "Wilfredo León", team: "Poland", points: 238, blocks: 15, aces: 18, avatar: "" },
      { rank: 5, name: "Yuji Nishida", team: "Japan", points: 218, blocks: 14, aces: 16, avatar: "" },
    ],
  },
}

export default function LeadersPage() {
  const [selectedSport, setSelectedSport] = useState("football")
  const [selectedCategory, setSelectedCategory] = useState("goals")

  const getCategories = (sport: string) => {
    switch (sport) {
      case "football":
        return [
          { value: "goals", label: "Goals" },
          { value: "assists", label: "Assists" },
        ]
      case "basketball":
        return [
          { value: "points", label: "Points" },
          { value: "rebounds", label: "Rebounds" },
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
  const leaders = mockLeaders[selectedSport as keyof typeof mockLeaders]?.[selectedCategory as keyof any] || []

  const getColumnHeaders = (sport: string, category: string) => {
    switch (sport) {
      case "football":
        return ["Rank", "Player", "Team", "Goals", "Assists"]
      case "basketball":
        return ["Rank", "Player", "Team", "Points", "Rebounds", "Assists"]
      case "volleyball":
        return ["Rank", "Player", "Team", "Points", "Blocks", "Aces"]
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
              <SelectTrigger>
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
              <SelectTrigger>
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
          </CardHeader>
          <CardContent>
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
                {leaders.map((player: any) => (
                  <TableRow key={player.rank} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium">
                      <Badge variant={player.rank <= 3 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                        {player.rank}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={player.avatar} />
                          <AvatarFallback className="text-xs bg-gray-50">
                            {player.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">{player.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{player.team}</TableCell>
                    {selectedSport === "football" && (
                      <>
                        <TableCell className="font-bold text-gray-900">{player.goals}</TableCell>
                        <TableCell className="font-bold text-gray-900">{player.assists}</TableCell>
                      </>
                    )}
                    {selectedSport === "basketball" && (
                      <>
                        <TableCell className="font-bold text-gray-900">{player.points}</TableCell>
                        <TableCell className="font-bold text-gray-900">{player.rebounds}</TableCell>
                        <TableCell className="font-bold text-gray-900">{player.assists}</TableCell>
                      </>
                    )}
                    {selectedSport === "volleyball" && (
                      <>
                        <TableCell className="font-bold text-gray-900">{player.points}</TableCell>
                        <TableCell className="font-bold text-gray-900">{player.blocks}</TableCell>
                        <TableCell className="font-bold text-gray-900">{player.aces}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 