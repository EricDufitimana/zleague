"use client"

import { SportsStats } from "@/components/sports-stats"
import { useState, useEffect } from "react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    playedGames: 0,
    unscheduledMatches: 0, 
    totalChampionships: 0,
    activeTeams: 0
  })

  useEffect(() => {
    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        // This would normally fetch from your APIs
        // For now using placeholder data
        setStats({
          playedGames: 24,
          unscheduledMatches: 8,
          totalChampionships: 3,
          activeTeams: 16
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <SportsStats 
        playedGames={stats.playedGames}
        unscheduledMatches={stats.unscheduledMatches}
        totalChampionships={stats.totalChampionships}
        activeTeams={stats.activeTeams}
      />
    </div>
  )
}
