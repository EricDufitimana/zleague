import { createClient } from '@supabase/supabase-js'

// Regular client (respects RLS) - for client-side and user operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) 