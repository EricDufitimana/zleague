import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  console.log('🏆 Championship creation request received');
  
  try {
    console.log('📝 Parsing request body...');
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { name } = body;
    console.log('🏷️ Championship name from request:', name);

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Validation failed: Invalid name provided');
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log('✅ Name validation passed');
    console.log('🔧 Creating Supabase admin client...');
    
    const supabase = createAdminClient();
    console.log('✅ Supabase admin client created successfully');

    const championshipData = {
      name: name.trim(),
      status: 'ongoing',
    };
    console.log('📊 Championship data to insert:', championshipData);

    console.log('💾 Inserting championship into database...');
    const { data: championship, error } = await supabase
      .from('championships')
      .insert(championshipData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to create championship', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Championship created successfully:', championship);
    return NextResponse.json(
      { 
        message: 'Championship created successfully',
        championship 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('💥 Unexpected error in championship creation:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to create championship', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch championships with team counts
    const { data: championships, error } = await supabase
      .from('championships')
      .select(`
        *,
        teams:teams(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch championships', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to include team count
    const championshipsWithTeamCount = championships.map(championship => ({
      ...championship,
      team_count: championship.teams?.[0]?.count || 0
    }));

    return NextResponse.json(championshipsWithTeamCount);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch championships', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('✏️ Championship update request received');
  
  try {
    console.log('📝 Parsing request body...');
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { id, name, status } = body;
    console.log('🏷️ Championship update data:', { id, name, status });

    if (!id || typeof id !== 'number') {
      console.log('❌ Validation failed: Invalid ID provided');
      return NextResponse.json(
        { error: 'ID is required and must be a number' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('❌ Validation failed: Invalid name provided');
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (status && !['ongoing', 'ended'].includes(status)) {
      console.log('❌ Validation failed: Invalid status provided');
      return NextResponse.json(
        { error: 'Status must be either "ongoing" or "ended"' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');
    console.log('🔧 Creating Supabase admin client...');
    
    const supabase = createAdminClient();
    console.log('✅ Supabase admin client created successfully');

    const updateData: { name: string; status?: string } = {
      name: name.trim(),
    };

    if (status) {
      updateData.status = status;
    }

    console.log('📊 Championship update data:', updateData);

    console.log('💾 Updating championship in database...');
    const { data: championship, error } = await supabase
      .from('championships')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to update championship', details: error.message },
        { status: 500 }
      );
    }

    if (!championship) {
      console.log('❌ Championship not found');
      return NextResponse.json(
        { error: 'Championship not found' },
        { status: 404 }
      );
    }

    console.log('✅ Championship updated successfully:', championship);
    return NextResponse.json(
      { 
        message: 'Championship updated successfully',
        championship 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Unexpected error in championship update:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to update championship', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ Championship deletion request received');
  
  try {
    console.log('📝 Parsing request body...');
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { id } = body;
    console.log('🏷️ Championship ID to delete:', id);

    if (!id || typeof id !== 'number') {
      console.log('❌ Validation failed: Invalid ID provided');
      return NextResponse.json(
        { error: 'ID is required and must be a number' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');
    console.log('🔧 Creating Supabase admin client...');
    
    const supabase = createAdminClient();
    console.log('✅ Supabase admin client created successfully');

    // First check if championship exists
    const { data: existingChampionship, error: fetchError } = await supabase
      .from('championships')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingChampionship) {
      console.log('❌ Championship not found');
      return NextResponse.json(
        { error: 'Championship not found' },
        { status: 404 }
      );
    }

    console.log('💾 Deleting championship from database...');
    const { error } = await supabase
      .from('championships')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to delete championship', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Championship deleted successfully');
    return NextResponse.json(
      { 
        message: 'Championship deleted successfully',
        deletedChampionship: existingChampionship
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Unexpected error in championship deletion:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to delete championship', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
