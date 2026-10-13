/**
 * COMP-02 FIX: Indian Standard Time (IST, UTC+05:30) Date Utilities
 * Ensures dates and timestamps for sales, GST invoices, and FCO registers
 * are calculated based on Asia/Kolkata timezone, avoiding date shift bugs
 * across UTC midnight boundaries (e.g., 11:30 PM IST = 6:00 PM UTC previous day).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date formatted as YYYY-MM-DD in Indian Standard Time
 */
export function getTodayISTDateString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

/**
 * Returns current time formatted as "hh:mm A" in Indian Standard Time (e.g. "04:30 PM")
 */
export function getCurrentISTTimeString(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

/**
 * Converts any ISO or timestamp date into an IST formatted date (DD/MM/YYYY)
 */
export function formatToISTDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Converts any ISO or timestamp date into full IST formatted datetime (DD MMM YYYY, hh:mm A)
 */
export function formatToISTDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
