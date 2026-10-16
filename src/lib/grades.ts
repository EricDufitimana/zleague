/**
 * Single source of truth for team grades and the families that sit in them.
 *
 * Families are cohorts that move up one grade each year, so at the start of a
 * season every family shifts: ey -> s4 -> s5 -> s6 -> alumni. When that happens,
 * promote `teams.grade` in the database (ongoing championships only, so past
 * results keep the grades they were played at) and move the family lists in
 * FAMILIES_BY_GRADE down one level here. Nothing else should hardcode this map.
 *
 * Last promotion: 2026-10-15 (Zleague-2026).
 */

export const TEAM_GRADES = ['ey', 's4', 's5', 's6', 'alumni'] as const;
export type TeamGrade = (typeof TEAM_GRADES)[number];

export const GRADE_LABELS: Record<TeamGrade, string> = {
  ey: 'EY',
  s4: 'S4',
  s5: 'S5',
  s6: 'S6',
  alumni: 'Alumni',
};

/** The grade a family is promoted into. `alumni` is terminal. */
export const NEXT_GRADE: Record<TeamGrade, TeamGrade | null> = {
  ey: 's4',
  s4: 's5',
  s5: 's6',
  s6: 'alumni',
  alumni: null,
};

/**
 * Families per grade. `ey` is empty until the next intake is enrolled.
 * Names match `teams.name` in the database exactly - do not reformat them.
 */
export const FAMILIES_BY_GRADE: Record<TeamGrade, string[]> = {
  ey: [],
  s4: ['Family_1', 'Family_2', 'Family_3', 'Family_4', 'Family_5', 'Family_6'],
  s5: [
    'Thomas Edison',
    'Rosalie Gicanda',
    'Lance Reddick',
    'Niyitegeka Felestin',
    'Irena Sendler',
    'ADA loveloce',
  ],
  s6: [
    'Pelé (Edson Arantes Do Nascimento)',
    'Ubald Rugirangoga',
    'Alfred Nobel',
    'Toni Morrison',
    'Ruth Bader Ginsberg',
    'Charles Babbage',
  ],
  alumni: [
    'KATHERINE JOHNSON',
    'YVAN BURAVAN',
    'Chinua Achebe',
    'RUGANZU NDOLI 2',
    'AOUA KEITA',
    'Fannie Lou Hamer',
  ],
};

/**
 * Gender is a property of the family, not of the grade, so it survives promotion.
 * Anything not listed here falls back to 'male', matching the previous behaviour.
 */
const FEMALE_FAMILIES = new Set([
  'Family_1',
  'Family_2',
  'Family_5',
  'Family_6',
  'Niyitegeka Felestin',
  'Rosalie Gicanda',
  'Irena Sendler',
  'ADA loveloce',
  'Ubald Rugirangoga',
  'Charles Babbage',
  'Toni Morrison',
  'Ruth Bader Ginsberg',
  'YVAN BURAVAN',
  'KATHERINE JOHNSON',
  'AOUA KEITA',
  'Fannie Lou Hamer',
]);

/** Families that are shown in the team builder - alumni have graduated out. */
export const SELECTABLE_GRADES: TeamGrade[] = ['ey', 's4', 's5', 's6'];

/** Accepts the loose spellings that have accumulated in the data ("Family 1" vs "Family_1"). */
function canonicalFamily(family: string): string {
  const normalized = family.trim().replace(/_/g, ' ').toLowerCase();
  for (const name of Object.values(FAMILIES_BY_GRADE).flat()) {
    if (name.replace(/_/g, ' ').toLowerCase() === normalized) return name;
  }
  return family.trim();
}

export function isTeamGrade(value: string): value is TeamGrade {
  return (TEAM_GRADES as readonly string[]).includes(value.toLowerCase());
}

export function gradeLabel(grade?: string | null): string {
  if (!grade) return 'Unknown';
  const key = grade.toLowerCase();
  return isTeamGrade(key) ? GRADE_LABELS[key] : grade.toUpperCase();
}

/** The grade a family currently belongs to, or null when it is not a known family. */
export function getFamilyGrade(family: string): TeamGrade | null {
  const canonical = canonicalFamily(family);
  for (const grade of TEAM_GRADES) {
    if (FAMILIES_BY_GRADE[grade].includes(canonical)) return grade;
  }
  return null;
}

export function assignGender(family: string): 'male' | 'female' {
  return FEMALE_FAMILIES.has(canonicalFamily(family)) ? 'female' : 'male';
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
