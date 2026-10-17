'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2, Users, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  GRADE_LABELS,
  TEAM_GRADES,
  gradeBadgeClasses,
  gradeLabel,
  type Family,
  type TeamGrade,
} from '@/lib/grades';

type Draft = {
  id?: number;
  name: string;
  grade: TeamGrade;
  gender: 'male' | 'female';
  is_active: boolean;
};

const EMPTY_DRAFT: Draft = { name: '', grade: 's4', gender: 'female', is_active: true };

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Family | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      // Inactive families are shown here so they can be brought back.
      const response = await fetch('/api/families?include_inactive=true');
      if (!response.ok) throw new Error('Failed to load families');
      const data = await response.json();
      setFamilies(data.families ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load families.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return families;
    return families.filter(
      f => f.name.toLowerCase().includes(term) || gradeLabel(f.grade).toLowerCase().includes(term)
    );
  }, [families, search]);

  const byGrade = useMemo(() => {
    const counts: Record<string, number> = {};
    families.forEach(f => {
      if (f.is_active) counts[f.grade] = (counts[f.grade] ?? 0) + 1;
    });
    return counts;
  }, [families]);

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error('Give the family a name.');
      return;
    }

    setIsSaving(true);
    const isEdit = draft.id != null;
    const previous = isEdit ? families.find(f => f.id === draft.id) : undefined;

    try {
      const response = await fetch('/api/families', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: draft.id } : {}),
          name,
          grade: draft.grade,
          gender: draft.gender,
          is_active: draft.is_active,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');

      if (isEdit && previous && previous.name !== name) {
        toast.success(
          `Renamed to "${name}". Every team and player that used "${previous.name}" was updated.`
        );
      } else {
        toast.success(isEdit ? 'Family updated.' : `"${name}" added.`);
      }

      setDraft(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/families?id=${pendingDelete.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`"${pendingDelete.name}" deleted.`);
      setPendingDelete(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (family: Family) => {
    try {
      const response = await fetch('/api/families', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: family.id, is_active: !family.is_active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      toast.success(`"${family.name}" ${family.is_active ? 'deactivated' : 'reactivated'}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Families</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rename, add or retire families. Renaming one updates every team and player that
            references it.
          </p>
        </div>
        <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          <Plus className="w-4 h-4 mr-2" />
          Add family
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TEAM_GRADES.map(grade => (
          <Card key={grade}>
            <CardHeader className="p-4">
              <CardDescription className="text-xs">{GRADE_LABELS[grade]}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{byGrade[grade] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {isLoading ? 'Loading…' : `${filtered.length} of ${families.length}`}
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search families…"
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">
                {families.length === 0 ? 'No families yet' : 'Nothing matches that search'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {families.length === 0
                  ? 'Add your first family to start building teams.'
                  : 'Try a different name or grade.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(family => (
                    <TableRow key={family.id} className={family.is_active ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">{family.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={gradeBadgeClasses(family.grade)}>
                          {gradeLabel(family.grade)}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{family.gender}</TableCell>
                      <TableCell>
                        <Badge variant={family.is_active ? 'secondary' : 'outline'}>
                          {family.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDraft({
                                id: family.id,
                                name: family.name,
                                grade: family.grade,
                                gender: family.gender,
                                is_active: family.is_active,
                              })
                            }
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="sr-only">Edit {family.name}</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(family)}>
                            {family.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setPendingDelete(family)}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete {family.name}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / edit */}
      <Dialog open={draft !== null} onOpenChange={open => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id != null ? 'Edit family' : 'Add family'}</DialogTitle>
            <DialogDescription>
              {draft?.id != null
                ? 'Renaming updates every team and player that uses this family.'
                : 'The name is how this family appears on teams, brackets and score sheets.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family-name">Name</Label>
              <Input
                id="family-name"
                value={draft?.name ?? ''}
                onChange={e => setDraft(d => (d ? { ...d, name: e.target.value } : d))}
                placeholder="e.g. Wangari Maathai"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select
                  value={draft?.grade}
                  onValueChange={value =>
                    setDraft(d => (d ? { ...d, grade: value as TeamGrade } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_GRADES.map(grade => (
                      <SelectItem key={grade} value={grade}>
                        {GRADE_LABELS[grade]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={draft?.gender}
                  onValueChange={value =>
                    setDraft(d => (d ? { ...d, gender: value as 'male' | 'female' } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {draft?.id != null ? 'Save changes' : 'Add family'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete family</DialogTitle>
            <DialogDescription>
              Delete &quot;{pendingDelete?.name}&quot;? This only works if no team or player uses it
              — otherwise deactivate it instead, which keeps past results intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
