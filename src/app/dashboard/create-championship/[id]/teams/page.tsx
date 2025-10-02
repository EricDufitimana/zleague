'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { updateTeam, deleteTeam } from '@/actions/teams';
import { IconArrowLeft, IconPlus, IconLoader2, IconUsers, IconTrophy, IconEdit, IconTrash, IconDotsVertical, IconRefresh } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { AppSidebar } from "@/components/app-sidebar";
import { SportsHeader } from "@/components/sports-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

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

export default function ChampionshipTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const championshipId = params.id as string;
  
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Team form state
  const [teamName, setTeamName] = useState('');
  const [teamGrade, setTeamGrade] = useState('');
  const [teamGender, setTeamGender] = useState('');
  
  // Edit form state
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamGrade, setEditTeamGrade] = useState('');
  const [editTeamGender, setEditTeamGender] = useState('');

  const fetchChampionship = useCallback(async () => {
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
  }, [championshipId]);

  const fetchTeams = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/teams?championship_id=${championshipId}&t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Teams fetched:', data.length, 'teams');
        setTeams(data);
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
  }, [championshipId]);

  useEffect(() => {
    if (championshipId) {
      fetchChampionship();
      fetchTeams();
    }
  }, [championshipId, fetchChampionship, fetchTeams]);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !teamGrade || !teamGender) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
          grade: teamGrade,
          gender: teamGender || null,
          championship_id: parseInt(championshipId)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Team created:', data);
        setIsDialogOpen(false);
        setTeamName('');
        setTeamGrade('');
        setTeamGender('');
        
        toast.success('Team created successfully');
        await fetchTeams();
      } else {
        const errorData = await response.json();
        console.error('Error creating team:', errorData);
        toast.error('Failed to create team: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
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
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <IconUsers className="size-5" />
                  Add New Team
                </DialogTitle>
                <DialogDescription>
                  Create a new team for this championship
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamGrade" className="text-right">
                    Grade
                  </Label>
                  <Select value={teamGrade} onValueChange={setTeamGrade}>
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
                  <Label htmlFor="teamGender" className="text-right">
                    Gender
                  </Label>
                  <Select value={teamGender} onValueChange={setTeamGender}>
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
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={!teamName.trim() || !teamGrade || !teamGender || isLoading}
                >
                  {isLoading ? (
                    <>
                      <IconLoader2 className="size-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <IconPlus className="size-4 mr-2" />
                      Create Team
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
            <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Add teams to start building your championship roster
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <IconPlus className="size-4 mr-2" />
              Add First Team
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
                  <span>{team.player_count || 0} players</span>
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
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
