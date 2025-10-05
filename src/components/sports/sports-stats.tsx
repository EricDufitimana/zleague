import { Trophy, Calendar, Target, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SportsStatsProps {
  playedGames?: number
  unscheduledMatches?: number
  totalChampionships?: number
  activeTeams?: number
}

export function SportsStats({ 
  playedGames = 0, 
  unscheduledMatches = 0,
  totalChampionships = 0,
  activeTeams = 0
}: SportsStatsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Played Games</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {playedGames}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Trophy className="size-3" />
              Completed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total games finished <Trophy className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Matches with recorded results
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Unscheduled Matches</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {unscheduledMatches}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Calendar className="size-3" />
              Pending
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Awaiting schedule <Calendar className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Matches need date and time
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Championships</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalChampionships}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Target className="size-3" />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Ongoing tournaments <Target className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Competitions in progress
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Teams</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeTeams}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Users className="size-3" />
              Registered
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Teams participating <Users className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Across all championships
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
