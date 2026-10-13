import { corsHeaders } from './cors.ts';

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: any;
}

export const successResponse = (
  data: any,
  meta: ApiResponseMeta | null = null,
  status = 200
): Response => {
  return new Response(
    JSON.stringify({
      data,
      error: null,
      meta,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
};

/**
 * API-02 FIX: Sanitize internal database errors.
 * Never leak raw PostgreSQL error messages, table names, constraint details, or query fragments to the client.
 */
function sanitizeErrorMessage(code: string, message: string, status: number): string {
  if (status >= 500 || code.includes('DB') || code.includes('DATABASE')) {
    const isLeakPattern = /relation|column|foreign key|constraint|syntax error|pg_|auth\.|public\./i.test(message);
    if (isLeakPattern) {
      console.error(`[EdgeFunction Internal DB Error] Code: ${code}, Raw: ${message}`);
      return 'A database operation could not be completed. Please try again or contact your administrator.';
    }
  }
  return message;
}

export const errorResponse = (
  code: string,
  message: string,
  status = 400,
  details: any = null
): Response => {
  const safeMessage = sanitizeErrorMessage(code, message, status);
  const safeDetails = status >= 500 ? null : details;

  return new Response(
    JSON.stringify({
      data: null,
      error: {
        code,
        message: safeMessage,
        details: safeDetails,
      },
      meta: null,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
};
