'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { updateTeam, deleteTeam, type TeamData } from '@/actions/teams';
import { IconArrowLeft, IconPlus, IconLoader2, IconUsers, IconTrophy, IconShield, IconEdit, IconTrash, IconDotsVertical, IconRefresh } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { AppSidebar } from "@/components/app-sidebar";
import { SportsHeader } from "@/components/sports-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { FamilySelector } from '@/components/FamilySelector';

interface Championship {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
  grade: string;
  gender: string;
  player_count?: number;
  created_at: string;
}

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  grade: string;
  family: string;
}

export default function ChampionshipTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const championshipId = params.id as string;
  
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playersByTeam, setPlayersByTeam] = useState<{ [teamId: number]: Player[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [playersByFamily, setPlayersByFamily] = useState<{ [family: string]: number }>({});
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isPlayersPopoverOpen, setIsPlayersPopoverOpen] = useState(false);
  const [selectedTeamForPlayers, setSelectedTeamForPlayers] = useState<Team | null>(null);
  
  // Team form state
  const [teamName, setTeamName] = useState('');
  const [teamGrade, setTeamGrade] = useState('');
  const [teamGender, setTeamGender] = useState('');
  
  // Edit form state
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamGrade, setEditTeamGrade] = useState('');
  const [editTeamGender, setEditTeamGender] = useState('');

  useEffect(() => {
    if (championshipId) {
      fetchChampionship();
      fetchTeams();
      fetchPlayersByFamily();
    }
  }, [championshipId]);

  const fetchPlayersByFamily = async () => {
    setIsLoadingPlayers(true);
    try {
      const response = await fetch('/api/players/by-family');
      if (response.ok) {
        const data = await response.json();
        setPlayersByFamily(data);
      } else {
        console.error('Failed to fetch players by family');
      }
    } catch (error) {
      console.error('Error fetching players by family:', error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const fetchChampionship = async () => {
    try {
      const response = await fetch('/api/championships');
      if (response.ok) {
        const championships = await response.json();
        const found = championships.find((c: Championship) => c.id.toString() === championshipId);
        if (found) {
          setChampionship(found);
        }
      }
    } catch (error) {
      console.error('Error fetching championship:', error);
    }
  };

  const fetchPlayersForTeam = async (teamId: number, retryCount = 0) => {
    console.log('👥 Fetching players for team:', teamId, retryCount > 0 ? `(retry ${retryCount})` : '');
    try {
      const response = await fetch(`/api/teams/${teamId}/players`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Players fetched for team', teamId, ':', data.players?.length || 0, 'players');
        setPlayersByTeam(prev => ({
          ...prev,
          [teamId]: data.players || []
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to fetch players for team:', teamId, 'Status:', response.status, 'Error:', errorData);
        
        // Retry once for 5xx errors
        if (response.status >= 500 && retryCount < 1) {
          console.log('🔄 Retrying fetch for team:', teamId);
          setTimeout(() => {
            fetchPlayersForTeam(teamId, retryCount + 1);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching players for team:', teamId, error);
      
      // Retry once for network errors
      if (retryCount < 1) {
        console.log('🔄 Retrying fetch for team:', teamId);
        setTimeout(() => {
          fetchPlayersForTeam(teamId, retryCount + 1);
        }, 1000);
      }
    }
  };

  const fetchTeams = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/teams?championship_id=${championshipId}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched:', data.length, 'teams');
        setTeams(data);
        
        // Fetch players for each team
        console.log('👥 Fetching players for', data.length, 'teams');
        data.forEach((team: Team) => {
          console.log('📋 Team:', team.name, '(ID:', team.id, ')');
          // Add a small delay between requests to avoid overwhelming the API
          setTimeout(() => {
            fetchPlayersForTeam(team.id);
          }, Math.random() * 100); // Random delay between 0-100ms
        });
      } else {
        console.error('Failed to fetch teams');
        setTeams([]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setIsRefreshing(false);
      setIsFetching(false);
    }
  };

  const handleCreateTeam = async () => {
    if (selectedFamilies.length === 0) {
      toast.error("Please select at least one family");
      return;
    }

    setIsLoading(true);
    try {
      // Helper function to get grade for a family
      const getFamilyGrade = (family: string): string => {
        const familiesByGrade = {
          'ey': ['Family_1', 'Family_2', 'Family_3', 'Family_4', 'Family_5', 'Family_6'],
          's4': ['Thomas Edison', 'Rosalie Gicanda', 'Lance Solomon Reddick', 'Niyitegeka Felestin', 'Irena Sendler', 'ADA loveloce'],
          's5': ['Pelé (Edson Arantes Do Nascimento)', 'Ubald Rugirangoga', 'Alfred Nobel', 'Toni Morrison', 'Ruth Bader Ginsberg', 'Charles Babbage'],
          's6': ['KATHERINE JOHNSON', 'YVAN BURAVAN', 'Chinua Achebe', 'RUGANZU NDOLI 2', 'AOUA KEITA', 'Fannie Lou Hamer']
        };
        
        for (const [grade, families] of Object.entries(familiesByGrade)) {
          if (families.includes(family)) {
            return grade;
          }
        }
        return 'ey'; // Default fallback
      };

      // Create teams array with proper grades
      const teams = selectedFamilies.map(family => ({
        name: family,
        grade: getFamilyGrade(family)
        // Gender will be automatically assigned by the API based on family name and grade
      }));

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teams: teams,
          championship_id: parseInt(championshipId)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Teams created successfully:', data);
        setIsDialogOpen(false);
        setSelectedFamilies([]);
        // Group teams by grade and gender for better feedback
        const teamsByGrade = teams.reduce((acc, team) => {
          const key = `${team.grade}`;
          if (!acc[key]) {
            acc[key] = { total: 0, male: 0, female: 0 };
          }
          acc[key].total += 1;
          return acc;
        }, {} as { [grade: string]: { total: number; male: number; female: number } });
        
        const gradeSummary = Object.entries(teamsByGrade)
          .map(([grade, counts]) => `${counts.total} ${grade.toUpperCase()}`)
          .join(', ');
        
        toast.success(`${data.count} Team(s) Created Successfully with Gender Assignment (${gradeSummary})`);
        await fetchTeams();
      } else {
        const errorData = await response.json();
        console.error('Error creating teams:', errorData);
        toast.error('Failed to create teams: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error creating teams:', error);
      toast.error("Failed To Create Teams");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setEditTeamName(team.name);
    setEditTeamGrade(team.grade);
    setEditTeamGender(team.gender || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !editTeamName.trim() || !editTeamGrade || !editTeamGender) return;

    setIsLoading(true);
    try {
      const result = await updateTeam(selectedTeam.id, {
        name: editTeamName.trim(),
        grade: editTeamGrade,
        gender: editTeamGender
      });

      if (result.success) {
        setIsEditDialogOpen(false);
        setSelectedTeam(null);
        setEditTeamName('');
        setEditTeamGrade('');
        setEditTeamGender('');
        
        toast.success('Team updated successfully!');
        await fetchTeams();
      } else {
        toast.error('Failed to update team: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const handleViewPlayers = (team: Team) => {
    setSelectedTeamForPlayers(team);
    setIsPlayersPopoverOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      const result = await deleteTeam(selectedTeam.id);

      if (result.success) {
        setIsDeleteDialogOpen(false);
        setSelectedTeam(null);
        
        toast.success('Team deleted successfully!');
        await fetchTeams();
      } else {
        toast.error('Failed to delete team: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!championship) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SportsHeader title="Team Management" />
          <div className="flex flex-1 flex-col">
            <div className="px-4 lg:px-6 flex justify-center items-center py-12">
              <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SportsHeader title="Team Management" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 w-fit"
        >
          <IconArrowLeft className="size-4" />
          Back to Championships
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{championship.name}</h1>
          <p className="text-muted-foreground">Manage teams for this championship</p>
        </div>
      </div>

      {/* Championship Stats */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Total Teams</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {teams.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IconUsers className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active teams</span>
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Male Teams</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {teams.filter(team => team.gender === 'male').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="size-4 flex items-center justify-center text-blue-600 font-bold">♂</div>
              <span className="text-sm text-muted-foreground">Boys teams</span>
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Female Teams</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {teams.filter(team => team.gender === 'female').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="size-4 flex items-center justify-center text-pink-600 font-bold">♀</div>
              <span className="text-sm text-muted-foreground">Girls teams</span>
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg font-semibold">
              <Badge variant={championship.status === 'ongoing' ? 'default' : 'secondary'}>
                {championship.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IconTrophy className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Championship</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Teams</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchTeams}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <IconRefresh className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <IconPlus className="size-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconUsers className="size-5" />
                  Add Teams from Families
                </DialogTitle>
                <DialogDescription>
                  Choose which families will form teams. Each selected family will create a team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <FamilySelector
                  selectedFamilies={selectedFamilies}
                  onFamiliesChange={setSelectedFamilies}
                  playersByFamily={playersByFamily}
                  disabled={isLoading}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedFamilies([]);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={selectedFamilies.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <IconLoader2 className="size-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <IconPlus className="size-4 mr-2" />
                      Create {selectedFamilies.length} Team{selectedFamilies.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teams Grid */}
      {(isFetching || isRefreshing) ? (
        <div className="flex flex-col justify-center items-center py-12">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">
            {isRefreshing ? 'Refreshing teams...' : 'Loading teams...'}
          </p>
        </div>
      ) : teams.length === 0 ? (
        <Card className="@container/card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <IconUsers className="size-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Teams Found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Teams are automatically created when you select families during championship creation. 
              If you need to add additional teams, you can do so below.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <IconPlus className="size-4 mr-2" />
              Add Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4">
          {teams.map((team) => (
            <Card key={team.id} className="@container/card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold">
                      {team.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <span>Grade: {team.grade.toUpperCase()}</span>
                      <Badge variant={team.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                        {team.gender === 'male' ? '♂' : '♀'} {team.gender}
                      </Badge>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewPlayers(team)}>
                        <IconUsers className="mr-2 size-4" />
                        View Players
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTeam(team)}>
                        <IconEdit className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTeam(team)}
                        className="text-destructive"
                      >
                        <IconTrash className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{playersByTeam[team.id]?.length || 0} players</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit className="size-5" />
              Edit Team
            </DialogTitle>
            <DialogDescription>
              Update the team information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeamName" className="text-right">
                Name
              </Label>
              <Input
                id="editTeamName"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                placeholder="Enter team name"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeamGrade" className="text-right">
                Grade
              </Label>
              <Select value={editTeamGrade} onValueChange={setEditTeamGrade}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ey">EY</SelectItem>
                  <SelectItem value="s4">S4</SelectItem>
                  <SelectItem value="s5">S5</SelectItem>
                  <SelectItem value="s6">S6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTeamGender" className="text-right">
                Gender
              </Label>
              <Select value={editTeamGender} onValueChange={setEditTeamGender}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateTeam}
              disabled={!editTeamName.trim() || !editTeamGrade || !editTeamGender || isLoading}
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <IconEdit className="size-4 mr-2" />
                  Update Team
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconTrash className="size-5 text-destructive" />
              Delete Team
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTeam?.name}&quot;? This action cannot be undone.
              {selectedTeam && selectedTeam.player_count && selectedTeam.player_count > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    Warning: This team has {selectedTeam.player_count} player(s). You may need to remove players first.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <IconTrash className="size-4 mr-2" />
                  Delete Team
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        {/* Players Popover */}
        <Dialog open={isPlayersPopoverOpen} onOpenChange={setIsPlayersPopoverOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconUsers className="size-5" />
                Players for {selectedTeamForPlayers?.name}
              </DialogTitle>
              <DialogDescription>
                View all players in this team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTeamForPlayers && playersByTeam[selectedTeamForPlayers.id] && playersByTeam[selectedTeamForPlayers.id].length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {playersByTeam[selectedTeamForPlayers.id].length} players
                    </span>
                    <Badge variant="outline">
                      {selectedTeamForPlayers.grade.toUpperCase()} - {selectedTeamForPlayers.gender}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2">
                    {playersByTeam[selectedTeamForPlayers.id].map((player) => (
                      <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {player.first_name.charAt(0)}{player.last_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {player.first_name} {player.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Grade: {player.grade}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {player.family}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <IconUsers className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Players Found</h3>
                  <p className="text-muted-foreground">
                    No players are currently assigned to this team.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPlayersPopoverOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
