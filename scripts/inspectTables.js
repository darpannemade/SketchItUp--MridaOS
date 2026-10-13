import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const candidateTables = [
  'user_profiles',
  'users',
  'inventory',
  'sales',
  'khata_ledger',
  'purchase_orders',
  'compliance_licenses',
  'plant_care_tasks',
  'user_sessions',
  'sessions',
  'branches',
];

async function inspect() {
  for (const t of candidateTables) {
    const { data, error } = await adminSupabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table '${t}': [MISSING/ERROR] ${error.message}`);
    } else {
      console.log(`Table '${t}': [EXISTS] with ${data?.length} row(s). Sample keys:`, data[0] ? Object.keys(data[0]) : 'empty');
    }
  }
}

inspect();
