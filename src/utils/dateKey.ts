import { startOfDay } from 'date-fns';

/**
 * Canonical "YYYY-MM-DD" key for a calendar day.
 *
 * Day-aligned via `startOfDay`, so the same calendar day always maps to the
 * same key regardless of the time component — a log saved at 23h50 keys to
 * its own day, never the next. This is the SINGLE source of truth: it was
 * previously re-implemented in 7 places, only some of which normalised the
 * date first, which could key the same day differently near midnight / DST.
 * Import this everywhere instead of re-writing the template.
 */
export function dateKey(d: Date): string {
  const day = startOfDay(d);
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, '0');
  const dd = String(day.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
