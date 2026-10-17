/**
 * Grade ladder and presentation helpers.
 *
 * Families themselves are NOT listed here any more. They live in the `families`
 * table and are managed from /dashboard/families, so they can be renamed, added
 * and retired without a code change or a Postgres enum migration. Fetch them
 * from /api/families (or `fetchFamilies` below) instead of hardcoding names.
 *
 * The grade ladder stays in code because it is structural: the bracket stages,
 * the promotion order and the badge colours all depend on it.
 */

export const TEAM_GRADES = ['ey', 's4', 's5', 's6', 'alumni'] as const;
export type TeamGrade = (typeof TEAM_GRADES)[number];

export type Gender = 'male' | 'female';

export interface Family {
  id: number;
  name: string;
  grade: TeamGrade;
  gender: Gender;
  is_active: boolean;
  sort_order: number;
}

export const GRADE_LABELS: Record<TeamGrade, string> = {
  ey: 'EY',
  s4: 'S4',
  s5: 'S5',
  s6: 'S6',
  alumni: 'Alumni',
};

/**
 * The grade a family is promoted into at the start of a season. `alumni` is
 * terminal. Promotion is now a single UPDATE over the families table.
 */
export const NEXT_GRADE: Record<TeamGrade, TeamGrade | null> = {
  ey: 's4',
  s4: 's5',
  s5: 's6',
  s6: 'alumni',
  alumni: null,
};

/** Grades offered when building teams - alumni have graduated out. */
export const SELECTABLE_GRADES: TeamGrade[] = ['ey', 's4', 's5', 's6'];

export function isTeamGrade(value: string): value is TeamGrade {
  return (TEAM_GRADES as readonly string[]).includes(value.toLowerCase());
}

export function gradeLabel(grade?: string | null): string {
  if (!grade) return 'Unknown';
  const key = grade.toLowerCase();
  return isTeamGrade(key) ? GRADE_LABELS[key] : grade.toUpperCase();
}

/**
 * EY teams record team-level stats only - no individual player lines.
 * Kept keyed on the grade so it applies automatically to each new intake.
 */
export function isTeamStatsOnlyGrade(grade?: string | null): boolean {
  return grade?.toLowerCase() === 'ey';
}

/** Tailwind classes for a grade badge. */
export function gradeBadgeClasses(grade?: string | null): string {
  switch (grade?.toLowerCase()) {
    case 'ey':
      return 'bg-grade-1/10 text-grade-1 border-grade-1/30';
    case 's4':
      return 'bg-grade-4/10 text-grade-4 border-grade-4/30';
    case 's5':
      return 'bg-grade-2/10 text-grade-2 border-grade-2/30';
    case 's6':
      return 'bg-grade-3/10 text-grade-3 border-grade-3/30';
    case 'alumni':
      return 'bg-violet-50 text-violet-700 border-violet-300';
    default:
      return 'bg-gray-50 text-gray-900 border-gray-300';
  }
}

/** Fetches families from the API. Pass includeInactive for management screens. */
export async function fetchFamilies(options?: {
  includeInactive?: boolean;
  grade?: TeamGrade;
}): Promise<Family[]> {
  const params = new URLSearchParams();
  if (options?.includeInactive) params.set('include_inactive', 'true');
  if (options?.grade) params.set('grade', options.grade);

  const query = params.toString();
  const response = await fetch(`/api/families${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to load families');

  const data = await response.json();
  return (data.families ?? []) as Family[];
}

/** Groups families by grade, in ladder order. */
export function groupByGrade(families: Family[]): Array<[TeamGrade, Family[]]> {
  return TEAM_GRADES.map(
    grade => [grade, families.filter(f => f.grade === grade)] as [TeamGrade, Family[]]
  ).filter(([, list]) => list.length > 0);
}
