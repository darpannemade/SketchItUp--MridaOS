/**
 * API-03 FIX: Query Timeout Guard for Edge Functions
 * Prevents requests from hanging indefinitely if a Supabase connection or upstream
 * network blip occurs. Returns 504 Gateway Timeout if the operation exceeds the threshold.
 */

import { errorResponse } from './response.ts';

const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  errorMessage = 'Request timed out waiting for database. Please try again.'
): Promise<{ data: T | null; error: Response | null }> {
  let timer: number | undefined;

  const timeoutPromise = new Promise<{ data: null; error: Response }>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        data: null,
        error: errorResponse('GATEWAY_TIMEOUT', errorMessage, 504),
      });
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      promise.then((res) => ({ data: res, error: null })),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
