"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navigation/Navbar"
import { Search, History } from "lucide-react"
import { useSession } from "@/hooks/useSession"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type TopPredictor = {
  id: number
  name: string
  accuracy: number
  predictions: number
  avatar: string
}

type UpcomingMatch = {
  id: string
  homeTeam: { id: number; name: string; logo: string }
  awayTeam: { id: number; name: string; logo: string }
  time: string
  date: string
  sport: string
}

type UserPredictionDetail = {
  id: number
  match_id: number
  predicted_winner_id: number
  is_correct: boolean | null
  created_at: string
  match: {
    id: number
    team_a_id: number
    team_b_id: number
    winner_id: number | null
    status: string
    match_time: string | null
    teamA: { name: string }
    teamB: { name: string }
  }
}

export default function PredictorsPage() {
  const { user } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [predictions, setPredictions] = useState<Record<string, string>>({})
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([])
  const [topPredictors, setTopPredictors] = useState<TopPredictor[]>([])
  const [userPredictions, setUserPredictions] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [userPredictionDetails, setUserPredictionDetails] = useState<UserPredictionDetail[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)

  // Fetch scheduled matches and top predictors from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch scheduled matches
        const matchesRes = await fetch(`/api/matches?status=scheduled`)
        const matchesJson = await matchesRes.json()
        const apiMatches: Array<{
          id: number
          team_a_id?: number
          team_b_id?: number
          teamA?: { id: number; name: string }
          teamB?: { id: number; name: string }
          match_time?: string
          created_at: string
          sport_type?: string
        }> = matchesJson?.matches || []
        
        console.log('Raw API matches data:', apiMatches)
        
        const mapped: UpcomingMatch[] = apiMatches.map((m) => {
          console.log('Processing match:', {
            id: m.id,
            team_a_id: m.team_a_id,
            team_b_id: m.team_b_id,
            teamA: m.teamA,
            teamB: m.teamB
          })
          const when = m.match_time ? new Date(m.match_time) : new Date(m.created_at)
          const date = when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const time = when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          return {
            id: String(m.id),
            homeTeam: { 
              id: m.team_a_id || m.teamA?.id || 0, 
              name: (m.teamA?.name || 'Team A').replace(/_/g, ' '), 
              logo: '' 
            },
            awayTeam: { 
              id: m.team_b_id || m.teamB?.id || 0, 
              name: (m.teamB?.name || 'Team B').replace(/_/g, ' '), 
              logo: '' 
            },
            time,
            date,
            sport: m.sport_type || 'football',
          }
        })
        setUpcomingMatches(mapped)

        // Fetch top predictors
        const predictorsRes = await fetch('/api/predictions')
        const predictorsJson = await predictorsRes.json()
        const predictions: Array<{
          user_id: number
          is_correct: boolean | null
          user?: { username?: string; first_name?: string; last_name?: string }
        }> = predictorsJson?.predictions || []
        
        // Calculate top predictors based on accuracy
        const userStats = new Map<number, { correct: number; total: number; name: string }>()
        
        predictions.forEach((pred) => {
          if (pred.is_correct !== null && pred.user) {
            const userId = pred.user_id
            const userName = pred.user.username || `${pred.user.first_name} ${pred.user.last_name}`
            
            if (!userStats.has(userId)) {
              userStats.set(userId, { correct: 0, total: 0, name: userName })
            }
            
            const stats = userStats.get(userId)!
            stats.total++
            if (pred.is_correct) stats.correct++
          }
        })

        const topPredictorsList: TopPredictor[] = Array.from(userStats.entries())
          .map(([userId, stats]) => ({
            id: userId,
            name: stats.name,
            accuracy: Math.round((stats.correct / stats.total) * 100),
            predictions: stats.total,
            avatar: ''
          }))
          .sort((a, b) => b.accuracy - a.accuracy)
          .slice(0, 5)

        setTopPredictors(topPredictorsList)

        // Fetch user's existing predictions if user is logged in
        if (user) {
          console.log('Fetching user predictions for user:', user.id)
          const userRes = await fetch(`/api/users?auth_user_id=${user.id}`)
          const userData = await userRes.json()
          
          if (userData.user) {
            const predictionsRes = await fetch(`/api/predictions?user_id=${userData.user.id}`)
            const predictionsJson = await predictionsRes.json()
            const userPreds: UserPredictionDetail[] = predictionsJson?.predictions || []
            
            // Get set of match IDs user has already predicted
            const predictedMatchIds = new Set<number>(userPreds.map((p) => parseInt(String(p.match_id))).filter((id: number) => !isNaN(id)))
            setUserPredictions(predictedMatchIds)
            
            // Store detailed predictions for dialog
            setUserPredictionDetails(userPreds)
            
            console.log('User has already predicted on matches:', Array.from(predictedMatchIds))
          }
        }
      } catch (e) {
        console.error('Failed to load data', e)
        setUpcomingMatches([])
        setTopPredictors([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user]) // Re-run when user changes

  const handlePredictionChange = (matchId: string, prediction: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: prediction
    }))
  }

  const handleSubmitPredictions = async () => {
    if (!user) {
      toast.error("Please sign in to submit predictions")
      return
    }

    if (Object.keys(predictions).length === 0) {
      toast.error("Please make at least one prediction")
      return
    }

    setIsSubmitting(true)
    
    try {
      const submissionPromises = Object.entries(predictions).map(async ([matchId, prediction]) => {
        const match = availableMatches.find(m => m.id === matchId)
        if (!match) {
          console.error('Match not found for ID:', matchId)
          return
        }

        // Validate team IDs exist
        if (!match.homeTeam.id || !match.awayTeam.id) {
          console.error('Missing team IDs for match:', match)
          throw new Error(`Match ${matchId} is missing team IDs. Cannot submit prediction.`)
        }

        // Determine the predicted winner ID based on the prediction
        const predictedWinnerId = prediction === "home" 
          ? match.homeTeam.id 
          : match.awayTeam.id

        console.log('Submitting prediction:', {
          matchId,
          prediction,
          predictedWinnerId,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          authUserId: user.id,
          fullMatch: match
        })

        // Get the users table ID for this user
        const userResponse = await fetch(`/api/users?auth_user_id=${user.id}`)
        const userData = await userResponse.json()
        
        if (!userData.user) {
          throw new Error('User not found in users table')
        }

        const response = await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            match_id: parseInt(matchId),
            predicted_winner_id: predictedWinnerId,
            user_id: userData.user.id
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to submit prediction for match ${matchId}`)
        }
      })

      await Promise.all(submissionPromises)
      toast.success("Predictions submitted successfully!")
      setPredictions({})
      
      // Refresh the data to update available matches
      const fetchData = async () => {
        try {
          const userRes = await fetch(`/api/users?auth_user_id=${user.id}`)
          const userData = await userRes.json()
          
          if (userData.user) {
            const predictionsRes = await fetch(`/api/predictions?user_id=${userData.user.id}`)
            const predictionsJson = await predictionsRes.json()
            const userPreds: UserPredictionDetail[] = predictionsJson?.predictions || []
            
            const predictedMatchIds = new Set<number>(userPreds.map((p) => parseInt(String(p.match_id))).filter((id: number) => !isNaN(id)))
            setUserPredictions(predictedMatchIds)
            
            // Update detailed predictions
            setUserPredictionDetails(userPreds)
          }
        } catch (e) {
          console.error('Failed to refresh predictions:', e)
        }
      }
      fetchData()
    } catch (error) {
      console.error('Error submitting predictions:', error)
      toast.error("Failed to submit predictions. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredPredictors = topPredictors.filter(predictor =>
    predictor.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter out matches user has already predicted on
  const availableMatches = upcomingMatches.filter(match => 
    !userPredictions.has(parseInt(match.id))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Predict Winners</h1>
          <p className="text-base text-gray-600 mt-2">Pick winners for upcoming scheduled matches and track top predictors.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Top Predictors */}
          <aside className="lg:col-span-1">
            <Card className="border border-gray-200 bg-white/95">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium text-gray-900">Top Predictors</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 h-4 w-4" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredPredictors.map((predictor, index) => (
                  <div key={predictor.id} className="flex items-center gap-3 p-3 rounded border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700">
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={predictor.avatar} />
                      <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
                        {predictor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{predictor.name}</p>
                      <p className="text-xs text-gray-600">{predictor.accuracy}% accuracy • {predictor.predictions}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100">{predictor.accuracy}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Right: Predictions */}
          <section className="lg:col-span-2 space-y-6">
            {/* Your Predictions Section */}
            {user && (
              <Card className="border border-gray-200 bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-gray-900">Your Predictions</CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                          <History className="h-4 w-4" />
                          View All
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Prediction History</DialogTitle>
                          <DialogDescription>
                            All your predictions and their current status
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 mt-4">
                          {userPredictionDetails.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8">
                              No predictions yet.
                            </div>
                          ) : (
                            userPredictionDetails.map((pred) => {
                              const predictedTeam = pred.predicted_winner_id === pred.match.team_a_id 
                                ? pred.match.teamA.name 
                                : pred.match.teamB.name
                              
                              let statusBadge
                              let statusColor
                              
                              if (pred.is_correct === null) {
                                statusBadge = "Pending"
                                statusColor = "bg-amber-50 text-amber-700 border-amber-200"
                              } else if (pred.is_correct) {
                                statusBadge = "Correct"
                                statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
                              } else {
                                statusBadge = "Incorrect"
                                statusColor = "bg-rose-50 text-rose-700 border-rose-200"
                              }
                              
                              return (
                                <div key={pred.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50/50 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {pred.match.teamA.name.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">vs</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                          {pred.match.teamB.name.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        Predicted: <span className="font-medium text-gray-900">{predictedTeam.replace(/_/g, ' ')}</span>
                                      </div>
                                      {pred.match.winner_id && (
                                        <div className="text-sm text-gray-600 mt-1">
                                          Winner: <span className="font-medium text-gray-900">
                                            {pred.match.winner_id === pred.match.team_a_id 
                                              ? pred.match.teamA.name.replace(/_/g, ' ')
                                              : pred.match.teamB.name.replace(/_/g, ' ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="outline" className={`${statusColor} text-xs`}>
                                      {statusBadge}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                    <div>
                                      <span className="text-gray-400">Predicted:</span>
                                      <div className="font-medium text-gray-600 mt-0.5">
                                        {new Date(pred.created_at).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Match Time:</span>
                                      <div className="font-medium text-gray-600 mt-0.5">
                                        {pred.match.match_time 
                                          ? new Date(pred.match.match_time).toLocaleDateString('en-US', { 
                                              month: 'short', 
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'TBA'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {userPredictionDetails.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      No predictions yet. Start by selecting matches below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-gray-900">{userPredictionDetails.length}</div>
                        <div className="text-xs text-gray-600 mt-1">Total</div>
                      </div>
                      <div className="text-center border-l border-r border-gray-200">
                        <div className="text-2xl font-semibold text-emerald-600">
                          {userPredictionDetails.filter(p => p.is_correct === true).length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Correct</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-amber-600">
                          {userPredictionDetails.filter(p => p.is_correct === null).length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Pending</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border border-gray-200 bg-white">
              <CardHeader className="pb-0">
                <CardTitle className="text-base font-medium text-gray-900">Scheduled Matches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="text-sm text-gray-500 p-6">Loading scheduled matches…</div>
                ) : availableMatches.length === 0 ? (
                  <div className="text-sm text-gray-500 p-6">
                    {upcomingMatches.length === 0 
                      ? "No scheduled matches available." 
                      : "You have already made predictions on all available matches."}
                  </div>
                ) : (
                  availableMatches.map((match) => (
                  <div key={match.id} className="rounded border border-gray-200">
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="flex items-center gap-2">
                       
                            <span className="text-base font-medium text-gray-900">{match.homeTeam.name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">vs</span>
                          <div className="flex items-center gap-2">
                      
                            <span className="text-base font-medium text-gray-900">{match.awayTeam.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{match.date}</div>
                          <div className="text-base font-semibold text-gray-900">{match.time}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <RadioGroup
                          value={predictions[match.id] || ""}
                          onValueChange={(value) => handlePredictionChange(match.id, value)}
                          className="grid grid-cols-2 gap-3"
                        >
                          <label 
                            htmlFor={`${match.id}-home`} 
                            className={`flex items-center gap-2 rounded border p-3 cursor-pointer transition-all ${
                              predictions[match.id] === "home" 
                                ? "bg-cyan-50 border-cyan-300" 
                                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <RadioGroupItem value="home" id={`${match.id}-home`} />
                            <span className="text-sm text-gray-900">{match.homeTeam.name}</span>
                          </label>
                          <label 
                            htmlFor={`${match.id}-away`} 
                            className={`flex items-center gap-2 rounded border p-3 cursor-pointer transition-all ${
                              predictions[match.id] === "away" 
                                ? "bg-cyan-50 border-cyan-300" 
                                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <RadioGroupItem value="away" id={`${match.id}-away`} />
                            <span className="text-sm text-gray-900">{match.awayTeam.name}</span>
                          </label>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>
                  )))}

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSubmitPredictions} 
                    className="px-7 bg-emerald-600 hover:bg-emerald-700 text-white" 
                    variant="default" 
                    disabled={Object.keys(predictions).length === 0 || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}