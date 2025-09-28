import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Match {
  id: string
  homeTeam: {
    name: string
    logo?: string
    score: number
  }
  awayTeam: {
    name: string
    logo?: string
    score: number
  }
  status: "scheduled" | "live" | "final"
  time?: string
  sport: "football" | "basketball" | "volleyball"
}

interface MatchCardProps {
  match: Match
  className?: string
}

const sportIcons = {
  football: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
}

const statusConfig = {
  scheduled: { label: "Scheduled", variant: "secondary" as const },
  live: { label: "LIVE", variant: "destructive" as const },
  final: { label: "Final", variant: "default" as const },
}

export function MatchCard({ match, className }: MatchCardProps) {
  const status = statusConfig[match.status]
  const sportIcon = sportIcons[match.sport]

  return (
    <Card className={cn("border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-12 w-12 border-2 border-gray-100">
              <AvatarImage src={match.homeTeam.logo} alt={match.homeTeam.name} />
              <AvatarFallback className="bg-gray-50 text-gray-600 font-semibold">
                {match.homeTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{match.homeTeam.name}</p>
            </div>
          </div>

          {/* Score Section */}
          <div className="flex items-center space-x-4 px-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{match.homeTeam.score}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">{sportIcon}</div>
              <div className="text-sm text-gray-500">vs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{match.awayTeam.score}</div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-3 flex-1 justify-end">
            <div className="min-w-0 flex-1 text-right">
              <p className="font-semibold text-gray-900 truncate">{match.awayTeam.name}</p>
            </div>
            <Avatar className="h-12 w-12 border-2 border-gray-100">
              <AvatarImage src={match.awayTeam.logo} alt={match.awayTeam.name} />
              <AvatarFallback className="bg-gray-50 text-gray-600 font-semibold">
                {match.awayTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mt-4">
          <Badge 
            variant={status.variant}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              match.status === "live" && "animate-pulse"
            )}
          >
            {match.status === "scheduled" && match.time ? match.time : status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
} 