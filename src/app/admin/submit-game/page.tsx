"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/Navbar"
import { Upload, FileText, CheckCircle } from "lucide-react"

export default function SubmitGamePage() {
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSport, setSelectedSport] = useState("")
  const [matchData, setMatchData] = useState({
    homeTeam: "",
    awayTeam: "",
    homeScore: "",
    awayScore: "",
    date: "",
    time: "",
  })

  const handleUploadScan = () => {
    setIsUploading(true)
    // Simulate file upload
    setTimeout(() => {
      setIsUploading(false)
      setIsProcessing(true)
      // Simulate OCR processing
      setTimeout(() => {
        setIsProcessing(false)
        // Auto-fill form with OCR results
        setMatchData({
          homeTeam: "Real Madrid",
          awayTeam: "Barcelona",
          homeScore: "3",
          awayScore: "1",
          date: "2024-01-15",
          time: "20:00",
        })
      }, 3000)
    }, 2000)
  }

  const handleSubmit = () => {
    console.log("Submitting game data:", { sport: selectedSport, ...matchData })
    // Here you would typically send the data to your backend
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Game Results</h1>
          <p className="text-gray-600">Upload match results or enter manually</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Scan Card */}
          <Card className="border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Scan
              </CardTitle>
              <p className="text-gray-600">Upload a photo of the match results for automatic parsing</p>
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

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
              </div>

              <Button
                onClick={handleUploadScan}
                disabled={!selectedSport || isUploading || isProcessing}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Uploading...
                  </>
                ) : isProcessing ? (
                  <>
                    <FileText className="mr-2 h-4 w-4 animate-spin" />
                    Processing OCR...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Parsed Results</CardTitle>
              <p className="text-gray-600">Preview of extracted match data</p>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="text-sm text-gray-600">Processing image with OCR...</span>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ) : matchData.homeTeam ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Successfully parsed!</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">Home Team</Label>
                      <p className="font-medium">{matchData.homeTeam}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Away Team</Label>
                      <p className="font-medium">{matchData.awayTeam}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Home Score</Label>
                        <p className="font-bold text-lg">{matchData.homeScore}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Away Score</Label>
                        <p className="font-bold text-lg">{matchData.awayScore}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Date</Label>
                        <p className="font-medium">{matchData.date}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Time</Label>
                        <p className="font-medium">{matchData.time}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data parsed yet</p>
                  <p className="text-sm">Upload a scan to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Manual Entry Form */}
        <Card className="mt-8 border-0 bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Manual Entry</CardTitle>
            <p className="text-gray-600">Enter match results manually or edit parsed data</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="homeTeam">Home Team</Label>
                  <Input
                    id="homeTeam"
                    value={matchData.homeTeam}
                    onChange={(e) => setMatchData(prev => ({ ...prev, homeTeam: e.target.value }))}
                    placeholder="Enter home team name"
                  />
                </div>
                <div>
                  <Label htmlFor="homeScore">Home Score</Label>
                  <Input
                    id="homeScore"
                    type="number"
                    value={matchData.homeScore}
                    onChange={(e) => setMatchData(prev => ({ ...prev, homeScore: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={matchData.date}
                    onChange={(e) => setMatchData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="awayTeam">Away Team</Label>
                  <Input
                    id="awayTeam"
                    value={matchData.awayTeam}
                    onChange={(e) => setMatchData(prev => ({ ...prev, awayTeam: e.target.value }))}
                    placeholder="Enter away team name"
                  />
                </div>
                <div>
                  <Label htmlFor="awayScore">Away Score</Label>
                  <Input
                    id="awayScore"
                    type="number"
                    value={matchData.awayScore}
                    onChange={(e) => setMatchData(prev => ({ ...prev, awayScore: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={matchData.time}
                    onChange={(e) => setMatchData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleSubmit} className="px-8">
                Submit Game Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 