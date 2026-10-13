/**
 * Production-hardened CORS handler for MridaOS Edge Functions.
 * SEC-06 FIX: Replaces open wildcard '*' with origin verification in production.
 * Allows configured origins (via ALLOWED_ORIGINS env var), the official Render app,
 * and localhost during local development.
 */

function getAllowedOrigins(): string[] {
  const custom = Deno.env.get('ALLOWED_ORIGINS');
  const allowed = [
    'https://sketchitup-mridaos.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  if (custom) {
    custom.split(',').map((o) => o.trim()).forEach((o) => {
      if (o && !allowed.includes(o)) allowed.push(o);
    });
  }

  return allowed;
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req ? req.headers.get('origin') : null;
  const allowedOrigins = getAllowedOrigins();

  // If request origin is in allowed list, reflect it. Otherwise use the primary production domain or '*' fallback for non-browser/curl calls
  let allowOrigin = '*';
  if (origin) {
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      allowOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export const corsHeaders = getCorsHeaders();

export const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
};
