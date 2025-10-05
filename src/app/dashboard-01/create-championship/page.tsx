'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconTrophy, IconPlus, IconLoader2, IconUsers, IconCalendar, IconArrowRight, IconDots, IconEdit, IconTrash, IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SportsHeader } from "@/components/sports/sports-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { deleteChampionship } from "@/actions/championships/deleteChampionship";
import { updateChampionship } from "@/actions/championships/updateChampionship";

interface Championship {
  id: number;
  name: string;
  status: string;
  created_at: string;
  team_count: number;
}

export default function CreateChampionshipPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [editingChampionshipId, setEditingChampionshipId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchChampionships();
  }, []);

  const handleDeleteChampionship = async (championshipId: number) => {
    if(!championshipId) return;
    
    const deletePromise = deleteChampionship(championshipId);
    
    toast.promise(deletePromise, {
      loading: 'Deleting championship...',
      success: (response) => {
        if(response.success) {
          fetchChampionships();
          return 'Championship deleted successfully';
        } else {
          throw new Error(response.message);
        }
      },
      error: (error) => {
        console.error("Error Deleting Championship:", error);
        return 'Failed to delete championship';
      }
    });
  };

  const handleEditChampionship = (championshipId: number) => {
    const championship = championships.find(c => c.id === championshipId);
    if (championship) {
      setEditingChampionshipId(championshipId);
      setEditName(championship.name);
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateChampionship = async () => {
    if (!editingChampionshipId || !editName.trim()) return;

    setIsEditLoading(true);
    try {
      const response = await updateChampionship(editingChampionshipId, editName);
      if (response.success) {
        toast.success("Championship Updated Successfully");
        setIsEditDialogOpen(false);
        setEditName('');
        setEditingChampionshipId(null);
        fetchChampionships();
      } else {
        toast.error("Failed To Update Championship");
      }
    } catch (error) {
      console.error("Error Updating Championship:", error);
      toast.error("Failed To Update Championship");
    } finally {
      setIsEditLoading(false);
    }
  };

  const fetchChampionships = async () => {
    try {
      const response = await fetch('/api/championships');
      if (response.ok) {
        const data = await response.json();
        setChampionships(data);
      } else {
        console.error('Failed to fetch championships');
      }
    } catch (error) {
      console.error('Error fetching championships:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateChampionship = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/championships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Championship created:', data);
        setIsDialogOpen(false);
        setName('');
        toast.success("Championship Created Successfully")
        // Refresh the championships list
        fetchChampionships();
      } else {
        const errorData = await response.json();
        console.error('Error creating championship:', errorData);
        toast.error("Failed To Create Championship")
      }
    } catch (error) {
      console.error('Error creating championship:', error);
      toast.error("Failed To Create Championship")
    } finally {
      setIsLoading(false);
    }
  };

  const handleChampionshipClick = (championshipId: number) => {
    router.push(`/dashboard-01/create-championship/${championshipId}/teams`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
        <SportsHeader title="Championships" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6 space-y-6">
                {/* Quick Create Section */}
                <div className="flex items-center justify-between">
                    <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Championships</h1>
                    <p className="text-muted-foreground">Create and manage your tournaments</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-blue-600 hover:bg-blue-700'>
                        <IconPlus className="size-4 mr-2" />
                        Create Championship
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconTrophy className="size-5 text-yellow-500" />
                            Create New Championship
                        </DialogTitle>
                        <DialogDescription>
                            Enter the name for your new championship. You can add teams and players later.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                            Name
                            </Label>
                            <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter championship name"
                            className="col-span-3"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                handleCreateChampionship();
                                }
                            }}
                            />
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
                            onClick={handleCreateChampionship}
                            disabled={!name.trim() || isLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? (
                            <>
                                <IconLoader2 className="size-4 mr-2 animate-spin" />
                                Creating...
                            </>
                            ) : (
                            <>
                                <IconPlus className="size-4 mr-2" />
                                Create Championship
                            </>
                            )}
                        </Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>

                    {/* Edit Championship Dialog */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <IconTrophy className="size-5 text-yellow-500" />
                                    Edit Championship
                                </DialogTitle>
                                <DialogDescription>
                                    Update the name of your championship.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="editName" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="editName"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Enter championship name"
                                        className="col-span-3"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleUpdateChampionship();
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditName('');
                                        setEditingChampionshipId(null);
                                    }}
                                    disabled={isEditLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleUpdateChampionship}
                                    disabled={!editName.trim() || isEditLoading}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isEditLoading ? (
                                        <>
                                            <IconLoader2 className="size-4 mr-2 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <IconEdit className="size-4 mr-2" />
                                            Update Championship
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Championships List */}
                {isFetching ? (
                    <div className="flex justify-center items-center py-12">
                    <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : championships.length === 0 ? (
                    <Card className="@container/card">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <IconTrophy className="size-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Championships Yet</h3>
                        <p className="text-muted-foreground text-center mb-6 max-w-sm">
                        Create your first championship to get started with organizing tournaments
                        </p>
                        <Button 
                        onClick={() => setIsDialogOpen(true)}
                        >
                        <IconPlus className="size-4 mr-2" />
                        Create First Championship
                        </Button>
                    </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
                    {championships.map((championship) => (
                        <Card 
                        key={championship.id}
                        className="@container/card cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => handleChampionshipClick(championship.id)}
                        >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {championship.name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                <IconCalendar className="size-4" />
                                {formatDate(championship.created_at)}
                                </CardDescription>
                            </div>
                            <IconArrowRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <IconUsers className="size-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                {championship.team_count === 1 ? '1 team' : `${championship.team_count} teams`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={championship.status === 'ongoing' ? 'default' : 'secondary'}>
                                    {championship.status}
                                </Badge>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 p-0 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconDots className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditChampionship(championship.id);
                                            }}
                                        >
                                            <IconEdit className="size-4 mr-2" />
                                            Update
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            variant="destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChampionship(championship.id);
                                            }}
                                        >
                                            <IconTrash className="size-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}