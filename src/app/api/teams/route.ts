import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TEAM_GRADES, isTeamGrade } from '@/lib/grades';

/**
 * Looks up the families table, which replaced the hardcoded family lists and
 * the family_type enum. Returns a name -> { grade, gender } map so a caller can
 * fill in whatever the request left out.
 */
async function loadFamilies() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase.from('families').select('name, grade, gender');
  if (error) {
    console.error('Failed to load families:', error);
    return new Map<string, { grade: string; gender: string }>();
  }
  // Compare loosely so 'Family_1' and 'Family 1' resolve to the same family.
  const key = (name: string) => name.trim().replace(/_/g, ' ').toLowerCase();
  return new Map<string, { grade: string; gender: string }>(
    (data ?? []).map(f => [key(f.name), { grade: f.grade, gender: f.gender }])
  );
}

const familyKey = (name: string) => name.trim().replace(/_/g, ' ').toLowerCase();

// Helper function to normalize gender values (boys/girls -> male/female)
function normalizeGender(gender: string | undefined | null): string | null {
  if (!gender) return null;
  
  const lowerGender = gender.toLowerCase();
  if (lowerGender === 'boys' || lowerGender === 'male') return 'male';
  if (lowerGender === 'girls' || lowerGender === 'female') return 'female';
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏈 Teams API POST request received');
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { name, grade, gender, championship_id, teams } = body;
    console.log('🔍 Extracted parameters:', { 
      name: name ? `${name.substring(0, 20)}...` : 'undefined', 
      grade, 
      gender, 
      championship_id, 
      teamsCount: teams ? teams.length : 'undefined' 
    });

    console.log('🔧 Creating Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('✅ Supabase client created successfully');

    // Families drive the default grade/gender for a team when the request does
    // not spell them out. Loaded once per request rather than per team.
    const families = await loadFamilies();

    // Check if this is a bulk creation request
    if (teams && Array.isArray(teams)) {
      console.log('📊 BULK TEAM CREATION detected');
      console.log(`📈 Processing ${teams.length} teams for championship ${championship_id}`);
      
      // Bulk team creation
      if (!championship_id || typeof championship_id !== 'number') {
        console.log('❌ Validation failed: Championship ID missing or invalid');
        return NextResponse.json(
          { error: 'Championship ID is required and must be a number' },
          { status: 400 }
        );
      }

      if (teams.length === 0) {
        console.log('❌ Validation failed: No teams provided');
        return NextResponse.json(
          { error: 'At least one team is required' },
          { status: 400 }
        );
      }

      // Helper function to convert family names with underscores to spaces for database compatibility
      const normalizeFamilyName = (familyName: string): string => {
        return familyName.replace(/_/g, ' ');
      };


      // Validate and prepare teams for insertion
      console.log('🔍 Starting team validation and preparation...');
      const teamsToInsert = [];
      
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        console.log(`📝 Processing team ${i + 1}/${teams.length}: ${team.name} (${team.grade})`);
        
        if (!team.name || typeof team.name !== 'string' || team.name.trim().length === 0) {
          console.log(`❌ Team ${i + 1} validation failed: Invalid name`);
          return NextResponse.json(
            { error: `Team name is required and must be a non-empty string` },
            { status: 400 }
          );
        }
        
        const known = families.get(familyKey(String(team.name)));

        if (!team.grade && known) team.grade = known.grade;

        if (!team.grade || !isTeamGrade(team.grade)) {
          console.log(`❌ Team ${i + 1} validation failed: Invalid grade ${team.grade}`);
          return NextResponse.json(
            { error: `Grade must be one of: ${TEAM_GRADES.join(', ')} for team ${team.name}` },
            { status: 400 }
          );
        }

        // Normalize family name (convert underscores to spaces for database compatibility)
        const normalizedFamilyName = normalizeFamilyName(team.name);
        console.log(`📝 Team ${i + 1} name normalization: ${team.name} → ${normalizedFamilyName}`);

        const assignedGender = team.gender || known?.gender;
        const normalizedGender = normalizeGender(assignedGender);
        console.log(`🎭 Team ${i + 1} gender: ${team.gender || 'auto'} → ${assignedGender} → ${normalizedGender}`);

        if (!normalizedGender) {
          console.log(`❌ Team ${i + 1} validation failed: Invalid gender ${assignedGender}`);
          return NextResponse.json(
            { error: `Invalid gender value for team ${team.name}. Must be male/female or boys/girls` },
            { status: 400 }
          );
        }

        const teamData = {
          name: normalizedFamilyName.trim(),
          grade: team.grade,
          gender: normalizedGender,
          championship_id
        };
        
        teamsToInsert.push(teamData);
        console.log(`✅ Team ${i + 1} prepared:`, teamData);
      }
      
      console.log(`🎯 All ${teamsToInsert.length} teams validated and prepared for insertion`);

      // Insert all teams
      console.log('💾 Inserting teams into database...');
      console.log('📊 Teams to insert:', teamsToInsert);
      
      const { data: insertedTeams, error } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select();

      if (error) {
        console.error('❌ Database error during bulk insert:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return NextResponse.json(
          { error: 'Failed to create teams', details: error.message },
          { status: 500 }
        );
      }

      console.log('✅ Teams inserted successfully!');
      console.log(`🎉 Created ${insertedTeams.length} teams:`, insertedTeams.map(t => `${t.name} (${t.grade}, ${t.gender})`));

      return NextResponse.json(
        { 
          message: 'Teams created successfully',
          count: insertedTeams.length,
          teams: insertedTeams
        },
        { status: 201 }
      );
    } else {
      console.log('👤 SINGLE TEAM CREATION detected');
      console.log(`📝 Processing single team: ${name} (${grade}) for championship ${championship_id}`);
      
      // Single team creation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        console.log('❌ Single team validation failed: Invalid name');
        return NextResponse.json(
          { error: 'Name is required and must be a non-empty string' },
          { status: 400 }
        );
      }

      if (!grade || !isTeamGrade(grade)) {
        console.log('❌ Single team validation failed: Invalid grade', grade);
        return NextResponse.json(
          { error: `Grade is required and must be one of: ${TEAM_GRADES.join(', ')}` },
          { status: 400 }
        );
      }

      if (!championship_id || typeof championship_id !== 'number') {
        console.log('❌ Single team validation failed: Invalid championship ID', championship_id);
        return NextResponse.json(
          { error: 'Championship ID is required and must be a number' },
          { status: 400 }
        );
      }

      // Auto-assign gender based on family name and grade, or use provided gender
      const assignedGender = gender || families.get(familyKey(String(name)))?.gender;
      const normalizedGender = normalizeGender(assignedGender);
      console.log(`🎭 Single team gender: ${gender || 'auto'} → ${assignedGender} → ${normalizedGender}`);
      
      if (!normalizedGender) {
        console.log('❌ Single team validation failed: Invalid gender', assignedGender);
        return NextResponse.json(
          { error: 'Invalid gender value. Must be male/female or boys/girls' },
          { status: 400 }
        );
      }

      const teamData = {
        name: name.trim(),
        grade,
        gender: normalizedGender,
        championship_id,
      };
      
      console.log('💾 Inserting single team into database...');
      console.log('📊 Team data:', teamData);
      
      const { data: team, error } = await supabase
        .from('teams')
        .insert(teamData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error during single team insert:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return NextResponse.json(
          { error: 'Failed to create team', details: error.message },
          { status: 500 }
        );
      }

      console.log('✅ Single team inserted successfully!');
      console.log('🎉 Created team:', `${team.name} (${team.grade}, ${team.gender})`);

      return NextResponse.json(
        { 
          message: 'Team created successfully',
          team 
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { 
        error: 'Failed to create team(s)', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Teams API GET request received');
    const { searchParams } = new URL(request.url);
    const championship_id = searchParams.get('championship_id');
    const gender = searchParams.get('gender');
    const grade = searchParams.get('grade');
    
    console.log('🔍 GET parameters:', { championship_id, gender, grade });

    if (!championship_id) {
      console.log('❌ GET validation failed: Championship ID missing');
      return NextResponse.json(
        { error: 'Championship ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Creating Supabase client for GET...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('✅ Supabase client created successfully for GET');

    console.log(`🔍 Fetching teams for championship ${championship_id}...`);
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('championship_id', championship_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error during teams fetch:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${teams.length} teams for championship ${championship_id}`);
    console.log('📊 Teams found:', teams.map(t => `${t.name} (${t.grade}, ${t.gender})`));

    // Get player counts for each team
    console.log('👥 Fetching player counts for each team...');
    const teamsWithPlayerCounts = await Promise.all(
      teams.map(async (team) => {
        const { count } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);
        
        return {
          ...team,
          player_count: count || 0
        };
      })
    );

    console.log('✅ Player counts fetched successfully');
    console.log('📊 Final teams with player counts:', teamsWithPlayerCounts.map(t => `${t.name} (${t.player_count} players)`));

    return NextResponse.json(teamsWithPlayerCounts);
  } catch (error) {
    console.error('💥 Error in GET /api/teams:', error);
    console.error('💥 Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch teams', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
