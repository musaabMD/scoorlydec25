import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_F_8FT5YH9MQZy30DPy9i5Q_73xmQVHK'

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.error('⚠️ Supabase URL not configured! Please set NEXT_PUBLIC_SUPABASE_URL in .env.local')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey)

