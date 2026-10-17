import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TEAM_GRADES, isTeamGrade } from '@/lib/grades';

/**
 * Families are editable data rather than a Postgres enum.
 *
 * teams.name and players.family are foreign keys onto families.name with
 * ON UPDATE CASCADE, so renaming a family here rewrites every team and player
 * that referenced it in the same statement. Deleting one that is still in use
 * is refused by the database (FK 23503); deactivate it instead.
 */

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GENDERS = ['male', 'female'] as const;

type FamilyPayload = {
  name?: unknown;
  grade?: unknown;
  gender?: unknown;
  is_active?: unknown;
  sort_order?: unknown;
};

function validate(body: FamilyPayload, { partial }: { partial: boolean }) {
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.push('Name is required.');
    else if (name.length > 120) errors.push('Name must be 120 characters or fewer.');
    else patch.name = name;
  } else if (!partial) {
    errors.push('Name is required.');
  }

  if (body.grade !== undefined) {
    const grade = String(body.grade).toLowerCase();
    if (!isTeamGrade(grade)) errors.push(`Grade must be one of: ${TEAM_GRADES.join(', ')}.`);
    else patch.grade = grade;
  } else if (!partial) {
    errors.push('Grade is required.');
  }

  if (body.gender !== undefined) {
    const gender = String(body.gender).toLowerCase();
    if (!GENDERS.includes(gender as (typeof GENDERS)[number])) {
      errors.push('Gender must be male or female.');
    } else {
      patch.gender = gender;
    }
  } else if (!partial) {
    errors.push('Gender is required.');
  }

  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

  if (body.sort_order !== undefined) {
    const order = Number(body.sort_order);
    if (!Number.isFinite(order)) errors.push('Sort order must be a number.');
    else patch.sort_order = Math.trunc(order);
  }

  return { errors, patch };
}

/** Turns a Postgres error into something a user can act on. */
function describe(error: { code?: string; message?: string }, name?: string) {
  if (error.code === '23505') {
    return { status: 409, message: `A family named "${name}" already exists.` };
  }
  if (error.code === '23503') {
    return {
      status: 409,
      message:
        'This family is still used by existing teams or players, so it cannot be deleted. Mark it inactive instead.',
    };
  }
  return { status: 500, message: error.message || 'Unexpected database error.' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = admin().from('families').select('*');
    if (!includeInactive) query = query.eq('is_active', true);
    if (grade && isTeamGrade(grade)) query = query.eq('grade', grade.toLowerCase());

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching families:', error);
      return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
    }

    return NextResponse.json({ families: data ?? [] });
  } catch (error) {
    console.error('Error in GET /api/families:', error);
    return NextResponse.json({ error: 'Failed to fetch families' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FamilyPayload;
    const { errors, patch } = validate(body, { partial: false });
    if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

    const { data, error } = await admin().from('families').insert(patch).select().single();

    if (error) {
      const { status, message } = describe(error, String(patch.name));
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ family: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/families:', error);
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as FamilyPayload & { id?: unknown };
    const id = Number(body.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'A family id is required.' }, { status: 400 });
    }

    const { errors, patch } = validate(body, { partial: true });
    if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    patch.updated_at = new Date().toISOString();

    // A rename cascades to teams.name and players.family through the foreign
    // keys, so no follow-up writes are needed here.
    const { data, error } = await admin()
      .from('families')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const { status, message } = describe(error, patch.name ? String(patch.name) : undefined);
      return NextResponse.json({ error: message }, { status });
    }
    if (!data) return NextResponse.json({ error: 'Family not found.' }, { status: 404 });

    return NextResponse.json({ family: data });
  } catch (error) {
    console.error('Error in PATCH /api/families:', error);
    return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'A family id is required.' }, { status: 400 });
    }

    const supabase = admin();
    const { data: family } = await supabase
      .from('families')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (!family) return NextResponse.json({ error: 'Family not found.' }, { status: 404 });

    // Report usage up front rather than letting the FK error be the only signal.
    const [{ count: teamCount }, { count: playerCount }] = await Promise.all([
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('name', family.name),
      supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('family', family.name),
    ]);

    if ((teamCount ?? 0) > 0 || (playerCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `"${family.name}" is used by ${teamCount ?? 0} team(s) and ${playerCount ?? 0} player(s). Mark it inactive instead of deleting it.`,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('families').delete().eq('id', id);
    if (error) {
      const { status, message } = describe(error, family.name);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/families:', error);
    return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
  }
}
