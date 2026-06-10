/**
 * Period statistics + prediction helpers.
 *
 * The store holds `periodLogs` as a flat array. This module derives the
 * useful summary numbers from it without mutating state — last-period,
 * average duration, average cycle length (between consecutive starts),
 * predicted next start.
 *
 * Predictions kick in at >=2 logs (need at least one observed cycle to
 * average). With a single log we still expose `last` but `nextStart` is
 * null and the UI shows a "log a second period for prediction" hint.
 */
import { differenceInDays, addDays, startOfDay, isAfter, isBefore, isSameDay } from 'date-fns';
import type { PeriodLog } from '../store/cycleStore';
// Low-level helpers the mutations below need. Imported directly from the
// split modules (NOT via the barrel re-exports at the bottom) to keep the
// dependency graph acyclic.
import { shiftIntensitiesKeys, pruneIntensitiesToRange } from './periodIntensity';
import { isPeriodOpen } from './periodFlow';

export interface PeriodStats {
  /** Most recent period log by startDate (could be ongoing or closed). */
  last: PeriodLog | null;
  /** True when `last` is still being logged (closed flag is false). */
  latestIsOpen: boolean;
  /** Average duration in days, computed only over logs with an endDate. */
  avgDurationDays: number | null;
  /** Average cycle length in days (start-to-start), needs >=2 logs. */
  avgCycleDays: number | null;
  /** Number of start-to-start deltas observed (= cycles - 1). Used to
   *  show "moyenne sur N cycles" in the UI. */
  observedCycleCount: number;
  /**
   * Predicted next start = last.start + avgCycleDays.
   * - `null` when avgCycleDays is null (not enough history)
   * - `null` while the user's last period is still OPEN — predicting
   *   the cycle AFTER one she's currently still bleeding through is
   *   confusing, so we wait until she closes it
   */
  nextStart: Date | null;
  /**
   * Days from `today` to `nextStart`. Positive = future (J-N before),
   * 0 = today, negative = N days late. Null when `nextStart` is null.
   */
  daysUntilNext: number | null;
  /**
   * True when nextStart is in the past — UI can flip the countdown badge
   * from "blue J-N" to "red retard de N jours". Null when no prediction.
   */
  isLate: boolean | null;
}

// Smoothing window for the cycle-length average. The user's last 6
// start-to-start deltas weigh equally — keeps one anomalous month from
// skewing the prediction for a year, and still adapts within ~6 cycles
// when the underlying biology shifts (new contraceptive, lifestyle, …).
const HISTORY_WINDOW = 6;

function sortByStartAsc(logs: PeriodLog[]): PeriodLog[] {
  return [...logs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

export function getPeriodStats(
  logs: PeriodLog[],
  today: Date = new Date(),
): PeriodStats {
  if (logs.length === 0) {
    return {
      last: null,
      latestIsOpen: false,
      avgDurationDays: null,
      avgCycleDays: null,
      observedCycleCount: 0,
      nextStart: null,
      daysUntilNext: null,
      isLate: null,
    };
  }

  const sorted = sortByStartAsc(logs);
  const last = sorted[sorted.length - 1];

  // ── avgDuration: only logs with an explicit endDate.
  const closedLogs = sorted.filter(l => !!l.endDate);
  let avgDurationDays: number | null = null;
  if (closedLogs.length > 0) {
    const total = closedLogs.reduce(
      (acc, l) => acc + Math.max(1, differenceInDays(new Date(l.endDate!), new Date(l.startDate)) + 1),
      0,
    );
    avgDurationDays = Math.round(total / closedLogs.length);
  }

  // ── avgCycle: deltas between consecutive starts, smoothed over the
  // last HISTORY_WINDOW deltas to keep one anomalous month from skewing
  // the prediction for the next year.
  let avgCycleDays: number | null = null;
  let observedCycleCount = 0;
  if (sorted.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d = differenceInDays(
        startOfDay(new Date(sorted[i].startDate)),
        startOfDay(new Date(sorted[i - 1].startDate)),
      );
      if (d > 0) deltas.push(d);
    }
    const recent = deltas.slice(-HISTORY_WINDOW);
    if (recent.length > 0) {
      const sum = recent.reduce((a, b) => a + b, 0);
      avgCycleDays = Math.round(sum / recent.length);
      observedCycleCount = recent.length;
    }
  }

  // Two prediction-blocking conditions, BOTH motivated by user feedback:
  //   1. avgCycleDays === null → not enough history; pretending with a
  //      28-day default felt magic ("how can it predict from 1 log ?")
  //   2. latestIsOpen → the user is still bleeding through her current
  //      cycle; predicting the NEXT one is confusing, the calendar
  //      already shows what she's logging. The card flips to a
  //      "Période en cours" UI in this case.
  const latestIsOpen = isPeriodOpen(last);
  const nextStart =
    avgCycleDays !== null && !latestIsOpen
      ? addDays(new Date(last.startDate), avgCycleDays)
      : null;

  const daysUntilNext = nextStart
    ? differenceInDays(startOfDay(nextStart), startOfDay(today))
    : null;
  const isLate = daysUntilNext !== null ? daysUntilNext < 0 : null;

  return {
    last,
    latestIsOpen,
    avgDurationDays,
    avgCycleDays,
    observedCycleCount,
    nextStart,
    daysUntilNext,
    isLate,
  };
}

// ─── Period duration & move math ────────────────────────────────────
//
// Pure helpers — they take a log, return a `Partial<PeriodLog>` patch
// describing what should change. Callers (the modal, the screen) feed
// the patch to `updatePeriodLog(id, patch)`. Keeping the math pure and
// out of the components makes them trivial to unit-test and means the
// rules ("can't end before start", "can't extend past today", etc.)
// live in exactly one place instead of being duplicated across handlers.

/**
 * Effective length of the period in days, with `endDate` defaulting to
 * `startDate` when missing (i.e. a still-open log counts as 1 day).
 * Always >= 1 — a log can't be 0 days long.
 */
export function getPeriodDurationDays(log: PeriodLog): number {
  const start = startOfDay(new Date(log.startDate));
  const end = log.endDate ? startOfDay(new Date(log.endDate)) : start;
  return Math.max(1, differenceInDays(end, start) + 1);
}

/**
 * Extend the period by one day. If the log was open-ended (no endDate)
 * the new end is `startDate + 1`. Clamped to `today` so the user can't
 * accidentally log a period that ends in the future.
 *
 * Returns `null` when there's nothing to extend (the period already
 * runs up to today). The caller can use `null` to disable the [+1j]
 * button instead of letting the press silently no-op.
 */
export function extendPeriodEnd(
  log: PeriodLog,
  today: Date = new Date(),
): Partial<PeriodLog> | null {
  const start = startOfDay(new Date(log.startDate));
  const end = log.endDate ? startOfDay(new Date(log.endDate)) : start;
  const todayStart = startOfDay(today);
  if (!isBefore(end, todayStart)) return null;
  const newEnd = addDays(end, 1);
  return { endDate: newEnd.toISOString() };
}

/**
 * Shrink the period by one day. When shrinking would bring `endDate`
 * back to (or before) `startDate` we drop `endDate` entirely — a 1-day
 * period is represented as "no endDate", same shape as a freshly
 * created log, which keeps the data model uniform.
 *
 * Returns `null` when the log is already at minimum length (single day).
 */
export function shrinkPeriodEnd(log: PeriodLog): Partial<PeriodLog> | null {
  if (!log.endDate) return null;
  const start = startOfDay(new Date(log.startDate));
  const end = startOfDay(new Date(log.endDate));
  if (!isAfter(end, start)) return null; // already 1-day
  const newEnd = addDays(end, -1);
  // Drop the per-day intensity entry for the day we're losing so the
  // cell goes back to neutral when re-rendered.
  const prunedIntensities = log.intensities
    ? pruneIntensitiesToRange(log.intensities, start, newEnd)
    : undefined;
  if (isSameDay(newEnd, start)) {
    // Collapsing back to a single-day log — drop endDate so the storage
    // shape mirrors what `addPeriodLog` produces.
    return prunedIntensities
      ? { endDate: undefined, intensities: prunedIntensities }
      : { endDate: undefined };
  }
  return prunedIntensities
    ? { endDate: newEnd.toISOString(), intensities: prunedIntensities }
    : { endDate: newEnd.toISOString() };
}

/**
 * Mark the period as ending today. Sets `closed: true` so the guided
 * flow no longer treats it as in-progress, AND aligns endDate to the
 * appropriate value (drops it for a same-day single-day period, sets
 * it to today otherwise). Rejected when today < startDate.
 */
export function endPeriodToday(
  log: PeriodLog,
  today: Date = new Date(),
): Partial<PeriodLog> | null {
  const start = startOfDay(new Date(log.startDate));
  const todayStart = startOfDay(today);
  if (isBefore(todayStart, start)) return null;
  if (isSameDay(todayStart, start)) {
    return { endDate: undefined, closed: true };
  }
  return { endDate: todayStart.toISOString(), closed: true };
}

/**
 * Re-open a closed period (`closed: false`). The endDate stays where
 * it was so the user keeps her logged days; she can extend further or
 * close again at a different day. No-op if already open.
 */
export function reopenPeriod(log: PeriodLog): Partial<PeriodLog> | null {
  if (isPeriodOpen(log)) return null;
  return { closed: false };
}

/**
 * Shift the whole period so `startDate` becomes `newStart`, preserving
 * the original duration. The endDate moves by the same delta — no other
 * log fields change.
 *
 * Refuses moves that would push `endDate` past `today` (the period
 * can't end in the future) by clamping the move so the new endDate
 * lands at most on today. If the move can't be done at all (start
 * itself in the future) returns `null`.
 *
 * Conflict detection (overlap with another log) is the caller's
 * responsibility — this helper only computes the patch.
 */
export function movePeriodStart(
  log: PeriodLog,
  newStart: Date,
  today: Date = new Date(),
): Partial<PeriodLog> | null {
  const newStartDay = startOfDay(newStart);
  const todayStart = startOfDay(today);
  if (isAfter(newStartDay, todayStart)) return null;

  const oldStart = startOfDay(new Date(log.startDate));
  const deltaDays = differenceInDays(newStartDay, oldStart);
  if (deltaDays === 0) return null;

  const patch: Partial<PeriodLog> = { startDate: newStartDay.toISOString() };
  // Per-day colors travel with the period — a heavy day stays heavy
  // when the user shifts the cycle to a different week.
  if (log.intensities) {
    patch.intensities = shiftIntensitiesKeys(log.intensities, deltaDays);
  }
  if (log.endDate) {
    const oldEnd = startOfDay(new Date(log.endDate));
    let newEnd = addDays(oldEnd, deltaDays);
    if (isAfter(newEnd, todayStart)) newEnd = todayStart;
    if (isBefore(newEnd, newStartDay)) {
      // Period collapsed below 1 day after clamping — drop endDate.
      patch.endDate = undefined;
    } else if (isSameDay(newEnd, newStartDay)) {
      patch.endDate = undefined;
    } else {
      patch.endDate = newEnd.toISOString();
    }
  }
  return patch;
}

/**
 * True when `day` falls inside `[startDate, endDate ?? startDate]` for
 * the given log. Inclusive on both ends, day-aligned.
 */
export function isDayInPeriod(log: PeriodLog, day: Date): boolean {
  const dStart = startOfDay(day);
  const start = startOfDay(new Date(log.startDate));
  const end = log.endDate ? startOfDay(new Date(log.endDate)) : start;
  return !isBefore(dStart, start) && !isAfter(dStart, end);
}

/**
 * True when the log overlaps with `day`, ignoring the log identified by
 * `excludeId`. Used for move-conflict detection: "is there another log
 * already covering the day the user just tapped to move to?"
 */
export function hasLogConflictOnDay(
  logs: PeriodLog[],
  day: Date,
  excludeId: string | null,
): boolean {
  return logs.some(l => l.id !== excludeId && isDayInPeriod(l, day));
}

/**
 * Close an open period AT a specific day (not necessarily today). A
 * single-day period (day === start) drops `endDate`; any later day sets
 * `endDate` to that day. Both mark `closed: true`. Returns `null` when
 * `day` is before the period's start.
 */
export function endPeriodAtDay(log: PeriodLog, day: Date): Partial<PeriodLog> | null {
  const dayStart = startOfDay(day);
  const start = startOfDay(new Date(log.startDate));
  if (isBefore(dayStart, start)) return null;
  if (isSameDay(dayStart, start)) {
    return { endDate: undefined, closed: true };
  }
  return { endDate: dayStart.toISOString(), closed: true };
}

// ─── Barrel re-exports ──────────────────────────────────────────────
//
// `periods.ts` stays the single import surface for the period utilities.
// The per-day intensity helpers and the guided-flow state machine now
// live in dedicated modules; re-export them so every existing
// `import { ... } from '../utils/periods'` keeps resolving unchanged.
export * from './periodIntensity';
export * from './periodFlow';
