import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('❌ Missing env:', missing.join(', '));
  process.exit(1);
}

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  options
);

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  options
);

console.log('🔗 Supabase:', process.env.SUPABASE_URL);