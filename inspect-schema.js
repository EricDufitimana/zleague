const { createClient } = require('@supabase/supabase-js');

// Use the working service role key
const supabaseUrl = 'https://ssrcldkfcveolxhbmnqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcmNsZGtmY3Zlb2x4aGJtbnFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY0MjM4MiwiZXhwIjoyMDcxMjE4MzgyfQ.vvpiPFKONc7eYvae09-5JOz01roUjAnCxAEjV73OL_I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  try {
    console.log('🔍 Inspecting database schema...\n');
    
    const tables = ['championships', 'matches', 'players', 'teams'];
    
    for (const tableName of tables) {
      try {
        console.log(`\n📋 Table: ${tableName}`);
        
        // Try to get table structure by attempting to insert a dummy record
        // This will fail but give us column information
        const { error } = await supabase
          .from(tableName)
          .insert({ dummy: 'test' });
        
        if (error) {
          // Parse the error message to extract column information
          const errorMsg = error.message;
          console.log('Error details:', errorMsg);
          
          // Try to get column info by selecting specific columns
          const { data: sampleData, error: selectError } = await supabase
            .from(tableName)
            .select('*')
            .limit(0); // This should give us column info without data
            
          if (!selectError) {
            console.log('✅ Table accessible');
            
            // Try to get a single record to see structure
            const { data: singleRecord, error: singleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!singleError && singleRecord !== null) {
              if (singleRecord.length > 0) {
                const sample = singleRecord[0];
                console.log('Columns (from data):');
                Object.entries(sample).forEach(([key, value]) => {
                  const type = typeof value;
                  const nullable = value === null ? 'nullable' : 'required';
                  console.log(`  - ${key}: ${type} (${nullable})`);
                });
              } else {
                console.log('  (Table is empty)');
                
                // Try to get column info by attempting different field selections
                const commonFields = ['id', 'name', 'title', 'created_at', 'updated_at'];
                const foundFields = [];
                
                for (const field of commonFields) {
                  try {
                    const { error: fieldError } = await supabase
                      .from(tableName)
                      .select(field)
                      .limit(1);
                    
                    if (!fieldError) {
                      foundFields.push(field);
                    }
                  } catch (err) {
                    // Field doesn't exist
                  }
                }
                
                if (foundFields.length > 0) {
                  console.log('  Found fields:', foundFields.join(', '));
                }
              }
            }
          } else {
            console.log('❌ Error accessing table:', selectError.message);
          }
        }
        
      } catch (err) {
        console.log(`💥 Error with ${tableName}: ${err.message}`);
      }
    }
    
    // Try to get schema information using a different approach
    console.log('\n🔄 Trying to get schema info...');
    
    // Try to create a temporary record to see what fields are required
    for (const tableName of tables) {
      try {
        console.log(`\n🔍 Testing ${tableName} structure...`);
        
        // Try minimal insert with just an ID
        const { error: idError } = await supabase
          .from(tableName)
          .insert({ id: 999999 });
        
        if (idError) {
          const errorMsg = idError.message;
          console.log(`  Error: ${errorMsg}`);
          
          // Look for column names in the error message
          if (errorMsg.includes('column') || errorMsg.includes('field')) {
            console.log(`  Column info from error: ${errorMsg}`);
          }
        }
        
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Run the inspection
inspectSchema();
