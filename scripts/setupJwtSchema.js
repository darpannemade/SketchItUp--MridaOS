import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setup() {
  console.log('Setting up custom JWT tables in Supabase...');

  // 1. Check if user_accounts table exists by querying it
  const { error: checkErr } = await adminSupabase.from('user_accounts').select('id').limit(1);
  if (checkErr) {
    console.log('user_accounts does not exist yet or needs schema initialization:', checkErr.message);
  } else {
    console.log('user_accounts table exists!');
  }
}

setup();
