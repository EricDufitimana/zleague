"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/Navbar"
import { Search } from "lucide-react"

// Mock data
const mockTopPredictors = [
  { id: 1, name: "Alex Predictor", accuracy: 87, predictions: 156, avatar: "" },
  { id: 2, name: "Sarah Expert", accuracy: 84, predictions: 142, avatar: "" },
  { id: 3, name: "Mike Analyst", accuracy: 82, predictions: 198, avatar: "" },
  { id: 4, name: "Emma Stats", accuracy: 79, predictions: 123, avatar: "" },
  { id: 5, name: "David Pro", accuracy: 76, predictions: 167, avatar: "" },
]

const mockUpcomingMatches = [
  {
    id: "1",
    homeTeam: { name: "Real Madrid", logo: "" },
    awayTeam: { name: "Barcelona", logo: "" },
    time: "20:00",
    date: "2024-01-15",
    sport: "football",
  },
  {
    id: "2",
    homeTeam: { name: "Manchester City", logo: "" },
    awayTeam: { name: "Liverpool", logo: "" },
    time: "21:30",
    date: "2024-01-15",
    sport: "football",
  },
  {
    id: "3",
    homeTeam: { name: "Lakers", logo: "" },
    awayTeam: { name: "Warriors", logo: "" },
    time: "22:00",
    date: "2024-01-15",
    sport: "basketball",
  },
  {
    id: "4",
    homeTeam: { name: "Brazil", logo: "" },
    awayTeam: { name: "Italy", logo: "" },
    time: "19:00",
    date: "2024-01-16",
    sport: "volleyball",
  },
]

export default function PredictorsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [predictions, setPredictions] = useState<Record<string, string>>({})

  const handlePredictionChange = (matchId: string, prediction: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: prediction
    }))
  }

  const handleSubmitPredictions = () => {
    console.log("Predictions submitted:", predictions)
    // Here you would typically send the predictions to your backend
  }

  const filteredPredictors = mockTopPredictors.filter(predictor =>
    predictor.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Predict & Winners</h1>
          <p className="text-gray-600">Make predictions and see top predictors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Top Predictors */}
          <aside className="lg:col-span-1">
            <Card className="border-0 bg-white/50 backdrop-blur-sm sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Top Predictors</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search predictors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredPredictors.map((predictor) => (
                  <div key={predictor.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={predictor.avatar} />
                      <AvatarFallback className="bg-gray-50 text-gray-600">
                        {predictor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{predictor.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{predictor.accuracy}% accuracy</span>
                        <span>•</span>
                        <span>{predictor.predictions} predictions</span>
                      </div>
                    </div>
                    <Badge variant={predictor.accuracy >= 80 ? "default" : "secondary"} className="text-xs">
                      {predictor.accuracy}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Prediction Form */}
          <div className="lg:col-span-3">
            <Card className="border-0 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl">Make Your Predictions</CardTitle>
                <p className="text-gray-600">Select your winners for upcoming matches</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {mockUpcomingMatches.map((match) => (
                  <Card key={match.id} className="border border-gray-100 bg-white/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={match.homeTeam.logo} />
                            <AvatarFallback className="bg-gray-50">
                              {match.homeTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <div className="text-2xl mb-1">
                              {match.sport === "football" && "⚽"}
                              {match.sport === "basketball" && "🏀"}
                              {match.sport === "volleyball" && "🏐"}
                            </div>
                            <div className="text-sm text-gray-500">vs</div>
                          </div>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={match.awayTeam.logo} />
                            <AvatarFallback className="bg-gray-50">
                              {match.awayTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">{match.date}</div>
                          <div className="font-semibold text-gray-900">{match.time}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Your Prediction:</Label>
                        <RadioGroup
                          value={predictions[match.id] || ""}
                          onValueChange={(value) => handlePredictionChange(match.id, value)}
                          className="grid grid-cols-3 gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="home" id={`${match.id}-home`} />
                            <Label htmlFor={`${match.id}-home`} className="text-sm font-medium cursor-pointer">
                              {match.homeTeam.name}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="draw" id={`${match.id}-draw`} />
                            <Label htmlFor={`${match.id}-draw`} className="text-sm font-medium cursor-pointer">
                              Draw
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="away" id={`${match.id}-away`} />
                            <Label htmlFor={`${match.id}-away`} className="text-sm font-medium cursor-pointer">
                              {match.awayTeam.name}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end pt-6">
                  <Button 
                    onClick={handleSubmitPredictions}
                    className="px-8"
                    disabled={Object.keys(predictions).length === 0}
                  >
                    Submit Predictions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
} 