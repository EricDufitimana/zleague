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
  status: "scheduled" | "live" | "final" | "not_played"
  time?: string
  date?: string
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
  not_played: { label: "Not Played", variant: "outline" as const },
}

export function MatchCard({ match, className }: MatchCardProps) {
  const status = statusConfig[match.status]
  const sportIcon = sportIcons[match.sport]

  return (
    <Card className={cn("bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 relative", className)}>
      <CardContent className="p-3">
        {/* Not Played Badge - Top Right Corner */}
        {match.status === "not_played" && (
          <Badge 
            variant="outline"
            className="absolute top-2 right-2 px-2 text-xs font-medium bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
          >
            Not Played
          </Badge>
        )}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 border border-gray-100">
              <AvatarImage src={match.homeTeam.logo} alt={match.homeTeam.name} />
              <AvatarFallback className="bg-gray-50 text-gray-600 font-semibold text-xs">
                {match.homeTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate text-sm">{match.homeTeam.name}</p>
            </div>
          </div>

          {/* Score Section */}
          <div className="flex items-center space-x-2 px-3">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{match.homeTeam.score}</div>
            </div>
            <div className="text-center">
              <div className="text-lg mb-0.5">{sportIcon}</div>
              <div className="text-xs text-gray-500">vs</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{match.awayTeam.score}</div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-2 flex-1 justify-end min-w-0">
            <div className="min-w-0 flex-1 text-right">
              <p className="font-medium text-gray-900 truncate text-sm">{match.awayTeam.name}</p>
            </div>
            <Avatar className="h-8 w-8 border border-gray-100">
              <AvatarImage src={match.awayTeam.logo} alt={match.awayTeam.name} />
              <AvatarFallback className="bg-gray-50 text-gray-600 font-semibold text-xs">
                {match.awayTeam.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mt-2">
          {match.status === "not_played" && match.time ? (
            <Badge 
              variant="secondary"
              className="px-2 py-0.5 text-xs font-medium rounded-2xl"
            >
              {match.time}
            </Badge>
          ) : match.status !== "not_played" ? (
            <Badge 
              variant={status.variant}
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-2xl",
                match.status === "live" && "animate-pulse"
              )}
            >
              {status.label}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
} 