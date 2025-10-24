"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"

interface FilterBarProps {
  selectedSport: string
  onSportChange: (sport: string) => void
  selectedDate: string
  onDateChange: (date: string) => void
  selectedGender: string
  onGenderChange: (gender: string) => void
}

const sports = [
  { value: "football", label: "⚽ Football", icon: "⚽" },
  { value: "basketball", label: "🏀 Basketball", icon: "🏀" },
  { value: "volleyball", label: "🏐 Volleyball", icon: "🏐" },
]

const dateOptions = [
  { value: "all", label: "All" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "2-weeks-ago", label: "2 Weeks Ago" },
]

const genderOptions = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export function FilterBar({ selectedSport, onSportChange, selectedDate, onDateChange, selectedGender, onGenderChange }: FilterBarProps) {
  const currentDateLabel = dateOptions.find(option => option.value === selectedDate)?.label || "All"
  const currentGenderLabel = genderOptions.find(option => option.value === selectedGender)?.label || "All"

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      {/* Sport Tabs */}
      <Tabs value={selectedSport} onValueChange={onSportChange} className="w-full sm:w-auto">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {sports.map((sport) => (
            <TabsTrigger
              key={sport.value}
              value={sport.value}
              className="flex items-center gap-2 rounded-md text-sm hover:bg-gray-50 transition-colors data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <span>{sport.icon}</span>
              <span className="hidden sm:inline">{sport.label.split(' ')[1]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Date and Gender Filters */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {/* Date Picker */}
        <div>
          <Label htmlFor="date-filter" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Date Range
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                id="date-filter"
                variant="outline" 
                className="w-full sm:w-auto border-gray-200 shadow-none hover:bg-gray-50"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentDateLabel}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
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

        {/* Gender Picker */}
        <div>
          <Label htmlFor="gender-filter" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Gender
          </Label>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <Button 
                id="gender-filter"
                variant="outline" 
                className="w-full sm:w-auto border-gray-200 shadow-none hover:bg-gray-50"
              >
                <span className="mr-2">👥</span>
                {currentGenderLabel}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {genderOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onGenderChange(option.value)}
                  className={selectedGender === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 