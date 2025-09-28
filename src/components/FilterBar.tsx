"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"

interface FilterBarProps {
  selectedSport: string
  onSportChange: (sport: string) => void
  selectedDate: string
  onDateChange: (date: string) => void
}

const sports = [
  { value: "football", label: "⚽ Football", icon: "⚽" },
  { value: "basketball", label: "🏀 Basketball", icon: "🏀" },
  { value: "volleyball", label: "🏐 Volleyball", icon: "🏐" },
]

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
]

export function FilterBar({ selectedSport, onSportChange, selectedDate, onDateChange }: FilterBarProps) {
  const currentDateLabel = dateOptions.find(option => option.value === selectedDate)?.label || "Today"

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      {/* Sport Tabs */}
      <Tabs value={selectedSport} onValueChange={onSportChange} className="w-full sm:w-auto">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          {sports.map((sport) => (
            <TabsTrigger key={sport.value} value={sport.value} className="flex items-center gap-2">
              <span>{sport.icon}</span>
              <span className="hidden sm:inline">{sport.label.split(' ')[1]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Date Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentDateLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {dateOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onDateChange(option.value)}
              className={selectedDate === option.value ? "bg-accent" : ""}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 