import fs from 'fs';

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

async function run() {
  const sql = fs.readFileSync('supabase/custom_jwt_schema.sql', 'utf-8');
  console.log('Sending SQL migration to Supabase...');

  // Try Supabase Management SQL endpoint
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response:', text);
}

run();
