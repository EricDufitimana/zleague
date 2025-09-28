const { createClient } = require('@supabase/supabase-js');

// Correct Supabase project configuration from CLI
const configs = [
  {
    name: 'ZLeague Project (Anon Key)',
    url: 'https://ssrcldkfcveolxhbmnqb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcmNsZGtmY3Zlb2x4aGJtbnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDIzODIsImV4cCI6MjA3MTIxODM4Mn0.LtWKcXuPkt7KsgPpkUecQyPBKVl3I_UiI2QcmYV-IO0'
  },
  {
    name: 'ZLeague Project (Service Role)',
    url: 'https://ssrcldkfcveolxhbmnqb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcmNsZGtmY3Zlb2x4aGJtbnFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY0MjM4MiwiZXhwIjoyMDcxMjE4MzgyfQ.vvpiPFKONc7eYvae09-5JOz01roUjAnCxAEjV73OL_I'
  }
];

async function testConnection(config) {
  try {
    console.log(`\n🔌 Testing: ${config.name}`);
    console.log(`URL: ${config.url}`);
    console.log(`Key: ${config.key.substring(0, 20)}...`);
    
    const supabase = createClient(config.url, config.key);
    
    // Test basic connection by trying to list tables
    console.log('📊 Testing connection...');
    
    // Try to get some basic info first
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log(`❌ Auth failed: ${authError.message}`);
    } else {
      console.log('✅ Auth connection successful!');
    }
    
    // Try to query some common table names that might exist
    const possibleTables = [
      'championships', 'championship', 'tournaments', 'tournament',
      'matches', 'match', 'players', 'player', 'teams', 'team',
      'users', 'user', 'profiles', 'profile'
    ];
    
    console.log('\n🔍 Exploring available tables...');
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data !== null) {
          console.log(`✅ Table '${tableName}' exists and accessible`);
          
          // Try to get count
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          console.log(`   📊 Records: ${count}`);
          
          // Show sample data structure
          if (data.length > 0) {
            console.log(`   📋 Sample columns: ${Object.keys(data[0]).join(', ')}`);
          }
          
          // If it's a championship table, show more details
          if (tableName.includes('championship') || tableName.includes('tournament')) {
            console.log(`\n🏆 Found championship/tournament table: ${tableName}`);
            
            const { data: championshipData } = await supabase
              .from(tableName)
              .select('*')
              .limit(3);
            
            console.log('📋 Sample championship data:');
            championshipData.forEach((item, index) => {
              console.log(`  ${index + 1}. ${JSON.stringify(item, null, 2)}`);
            });
          }
          
        } else if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' does not exist`);
        } else if (error) {
          console.log(`⚠️  Table '${tableName}' error: ${error.message}`);
        }
        
      } catch (err) {
        console.log(`💥 Error checking table '${tableName}': ${err.message}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`💥 Connection error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase connection tests...\n');
  
  let successCount = 0;
  
  for (const config of configs) {
    const success = await testConnection(config);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Test Results: ${successCount}/${configs.length} configurations successful`);
  
  if (successCount === 0) {
    console.log('\n❌ All configurations failed. Please check:');
    console.log('   - Project reference in MCP configuration');
    console.log('   - API keys validity');
    console.log('   - Project URL format');
  } else {
    console.log('\n🎉 At least one configuration is working!');
  }
}

// Run all tests
runAllTests();
