// Quick test to verify middleware file structure
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Middleware Setup Verification\n');

// Check if middleware.ts exists in root
const middlewarePath = path.join(__dirname, 'middleware.ts');
const middlewareExists = fs.existsSync(middlewarePath);
console.log('1. Root middleware.ts exists:', middlewareExists ? '✅' : '❌');

// Check if src/utils/supabase/middleware.ts exists
const updateSessionPath = path.join(__dirname, 'src', 'utils', 'supabase', 'middleware.ts');
const updateSessionExists = fs.existsSync(updateSessionPath);
console.log('2. src/utils/supabase/middleware.ts exists:', updateSessionExists ? '✅' : '❌');

// Check .next directory
const nextDir = path.join(__dirname, '.next');
const nextExists = fs.existsSync(nextDir);
console.log('3. .next build directory:', nextExists ? '⚠️  Exists (may need restart)' : '✅ Clean (good)');

// Check if turbopack is being used
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const devScript = packageJson.scripts.dev;
const usesTurbopack = devScript.includes('turbopack');
console.log('4. Using Turbopack:', usesTurbopack ? '⚠️  Yes (may cause middleware issues)' : '✅ No');

// Check environment variables
console.log('\n📋 Environment Variables:');
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL:', envContent.includes('NEXT_PUBLIC_SUPABASE_URL') ? '✅' : '❌');
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? '✅' : '❌');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY:', envContent.includes('SUPABASE_SERVICE_ROLE_KEY') ? '✅' : '❌');
} else {
  console.log('   ❌ .env file not found');
}

console.log('\n🎯 Recommendations:\n');
if (usesTurbopack) {
  console.log('⚠️  ISSUE: Turbopack may prevent middleware from running');
  console.log('   Try: npx next dev (without --turbopack flag)\n');
}
if (nextExists) {
  console.log('⚠️  Old build cache exists');
  console.log('   Restart your dev server after clearing cache\n');
}
console.log('✅ Make sure to:');
console.log('   1. Stop dev server (Ctrl+C)');
console.log('   2. Run: npx next dev');
console.log('   3. Navigate to any page');
console.log('   4. Check terminal for: 🟢 ROOT MIDDLEWARE CALLED\n');

