"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/Navbar"
import { RotateCcw, Calendar, Clock } from "lucide-react"

export default function SetupMatchesPage() {
  const [selectedSport, setSelectedSport] = useState("")
  const [matchDateTime, setMatchDateTime] = useState("")
  const [isSpinning, setIsSpinning] = useState(false)

  const handleSpinWheel = () => {
    setIsSpinning(true)
    // Simulate spinning animation
    setTimeout(() => {
      setIsSpinning(false)
      // Here you would typically generate random matchups
      console.log("Spinning wheel for", selectedSport, "at", matchDateTime)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Matches</h1>
          <p className="text-gray-600">Generate random matchups for tournaments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spin Wheel Card */}
          <Card className="border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Spin Wheel
              </CardTitle>
              <p className="text-gray-600">Generate random matchups for selected sport</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sport">Select Sport</Label>
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football">⚽ Football</SelectItem>
                    <SelectItem value="basketball">🏀 Basketball</SelectItem>
                    <SelectItem value="volleyball">🏐 Volleyball</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="datetime">Match Date & Time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={matchDateTime}
                    onChange={(e) => setMatchDateTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSpinWheel}
                disabled={!selectedSport || !matchDateTime || isSpinning}
                className="w-full"
                size="lg"
              >
                {isSpinning ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Spin Wheel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Matches Preview */}
          <Card className="border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Generated Matches</CardTitle>
              <p className="text-gray-600">Preview of randomly generated matchups</p>
            </CardHeader>
            <CardContent>
              {isSpinning ? (
                <div className="text-center py-12">
                  <RotateCcw className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Generating matchups...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No matches generated yet</p>
                    <p className="text-sm">Use the spin wheel to generate matchups</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8 border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Select Sport</h3>
                <p className="text-gray-600 text-sm">Choose the sport for which you want to generate matches</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Set Date & Time</h3>
                <p className="text-gray-600 text-sm">Pick when the matches should take place</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Spin Wheel</h3>
                <p className="text-gray-600 text-sm">Generate random matchups automatically</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 