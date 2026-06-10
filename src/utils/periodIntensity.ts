/**
 * Per-day intensity helpers for period logs.
 *
 * A period log carries a `intensities` map keyed by "YYYY-MM-DD" dateKey
 * plus a period-level dominant `intensity`. These helpers read, patch,
 * shift and prune that map without mutating state — callers feed the
 * returned patches to `updatePeriodLog(id, patch)`.
 */
import { addDays, startOfDay, isAfter, isBefore } from 'date-fns';
import type { PeriodLog } from '../store/cycleStore';
import { dateKey } from './dateKey';

type Intensity = PeriodLog['intensity'];

/**
 * Stable "YYYY-MM-DD" key for a date, day-aligned and timezone-safe.
 * Same shape as the dateKey used in `app/periods.tsx` so the two
 * sides agree on the lookup namespace.
 */
export function dateKeyOf(d: Date): string {
  return dateKey(d);
}

/**
 * Read this day's intensity from the per-day map; fall back to the
 * period-level dominant intensity for legacy logs (or days the user
 * tapped before v2.6, which won't have an explicit per-day entry).
 */
export function getIntensityForDay(log: PeriodLog, day: Date): Intensity {
  const k = dateKeyOf(day);
  return log.intensities?.[k] ?? log.intensity;
}

/**
 * Returns a patch that sets `intensities[dateKey(day)] = intensity`
 * while preserving the rest of the map. The caller hands the patch
 * to `updatePeriodLog(log.id, patch)` — keeps mutation in the store.
 */
export function setIntensityForDay(
  log: PeriodLog,
  day: Date,
  intensity: Intensity,
): Partial<PeriodLog> {
  const next = { ...(log.intensities ?? {}), [dateKeyOf(day)]: intensity };
  return { intensities: next };
}

/**
 * Re-key the per-day intensity map by shifting every key by `deltaDays`.
 * Used by `movePeriodStart` so colored days follow the period when it
 * relocates. No-op when the map is empty / undefined.
 */
export function shiftIntensitiesKeys(
  intensities: PeriodLog['intensities'],
  deltaDays: number,
): PeriodLog['intensities'] {
  if (!intensities || deltaDays === 0) return intensities;
  const result: Record<string, Intensity> = {};
  for (const [key, value] of Object.entries(intensities)) {
    const [y, m, d] = key.split('-').map(Number);
    if (!y || !m || !d) continue; // skip malformed keys defensively
    const shifted = addDays(new Date(y, m - 1, d), deltaDays);
    result[dateKeyOf(shifted)] = value;
  }
  return result;
}

/**
 * Drop per-day entries that fall outside the new range [start, end].
 * Used by `shrinkPeriodEnd` so a -1j press also removes the orphaned
 * intensity color from the formerly-included day.
 */
export function pruneIntensitiesToRange(
  intensities: PeriodLog['intensities'],
  start: Date,
  end: Date,
): PeriodLog['intensities'] {
  if (!intensities) return intensities;
  const startStart = startOfDay(start);
  const endEnd = startOfDay(end);
  const result: Record<string, Intensity> = {};
  for (const [key, value] of Object.entries(intensities)) {
    const [y, m, d] = key.split('-').map(Number);
    if (!y || !m || !d) continue;
    const day = new Date(y, m - 1, d);
    if (!isBefore(day, startStart) && !isAfter(day, endEnd)) {
      result[key] = value;
    }
  }
  return result;
}
