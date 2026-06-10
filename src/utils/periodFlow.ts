/**
 * Guided flow state machine for the "Mes périodes" screen.
 *
 * The screen drives the modal's content from a single derived state, so
 * the UI stays consistent and the rules live here instead of being
 * re-implemented inline in handlers. Also hosts the open/closed period
 * predicates the rest of the period code reads consistently.
 */
import { differenceInDays, addDays, startOfDay, isAfter, isBefore, isSameDay } from 'date-fns';
import type { PeriodLog } from '../store/cycleStore';

/**
 * True when `day` falls inside `[startDate, endDate ?? startDate]` for
 * the given log. Inclusive on both ends, day-aligned. Inlined here (the
 * canonical export lives in `./periods`) to avoid a circular import:
 * `periods.ts` re-exports this module via `export * from './periodFlow'`.
 */
function dayInPeriodRange(log: PeriodLog, day: Date): boolean {
  const dStart = startOfDay(day);
  const start = startOfDay(new Date(log.startDate));
  const end = log.endDate ? startOfDay(new Date(log.endDate)) : start;
  return !isBefore(dStart, start) && !isAfter(dStart, end);
}

export type PeriodFlowState =
  /** Tapped day is empty and no open period is in flight. New period
   *  starts here. */
  | { kind: 'STARTING'; day: Date }
  /** Tapped day is the day right after the open period's last day —
   *  user is logging today's bleeding to extend the period. */
  | { kind: 'CONTINUING'; day: Date; openLog: PeriodLog; dayInPeriod: number }
  /** Tapped day is empty but an open period exists from a few days
   *  ago — treat as a fresh cycle, the open one auto-closes. */
  | { kind: 'RESTART'; day: Date; openLog: PeriodLog }
  /** Tapped day already has a log — user is editing (intensity,
   *  end-at-this-day, delete-this-day). */
  | { kind: 'EDITING'; day: Date; log: PeriodLog; isStart: boolean; isEnd: boolean; dayInPeriod: number };

/**
 * Whether the user is still actively logging this period (i.e. the
 * "Mes périodes" guided flow can append the next contiguous day to it).
 *
 * Source of truth: the `closed` flag. We need a fallback for legacy
 * logs written before v2.4.2 — those don't have the field, so we use
 * the old "endDate present ↔ closed" rule to avoid wrongly re-opening
 * historical periods on first launch after the upgrade.
 */
export function isPeriodOpen(log: PeriodLog): boolean {
  if (typeof log.closed === 'boolean') return !log.closed;
  // Legacy fallback: pre-v2.4.2 logs treated endDate-defined as closed.
  return !log.endDate;
}

/**
 * Returns the currently-open period log if any. There can be at most
 * one in normal use — the flow auto-closes any prior open log on
 * RESTART. If multiple open logs sneak in (older builds, manual edit)
 * we pick the most recent so the user keeps editing the one they
 * actually care about.
 */
export function findOpenPeriod(logs: PeriodLog[]): PeriodLog | null {
  const open = logs.filter(isPeriodOpen);
  if (open.length === 0) return null;
  return open.reduce((latest, l) =>
    new Date(l.startDate) > new Date(latest.startDate) ? l : latest,
  open[0]);
}

/**
 * Last calendar day actually covered by the log (= endDate when set,
 * = startDate otherwise). Day-aligned to dodge timezone surprises.
 */
export function getLastCoveredDay(log: PeriodLog): Date {
  return startOfDay(new Date(log.endDate ?? log.startDate));
}

/**
 * True when `day` is exactly one day after the log's last covered day.
 * Used to distinguish "continue today's period" from "start a new one".
 */
export function isContiguousAfter(log: PeriodLog, day: Date): boolean {
  const next = addDays(getLastCoveredDay(log), 1);
  return isSameDay(next, startOfDay(day));
}

/**
 * Used by RESTART to silently close an open period that's been
 * lingering. Doesn't change the dates — just sets `closed: true` so
 * subsequent flow calls don't treat it as in-progress. Returns an
 * empty patch (no-op) when the period is already closed.
 */
export function autoCloseOpenPeriod(log: PeriodLog): Partial<PeriodLog> {
  if (!isPeriodOpen(log)) return {};
  return { closed: true };
}

/**
 * Derive the flow state for a tap on `day`, given the current logs.
 * Pure function — no side effects, easy to unit-test.
 */
export function computePeriodFlowState(
  logs: PeriodLog[],
  day: Date,
): PeriodFlowState {
  // 1. Is the tapped day already inside any logged period?
  const hostingLog = logs.find(l => dayInPeriodRange(l, day));
  if (hostingLog) {
    const start = startOfDay(new Date(hostingLog.startDate));
    const lastDay = getLastCoveredDay(hostingLog);
    const dayStart = startOfDay(day);
    const dayInPeriod = differenceInDays(dayStart, start) + 1;
    return {
      kind: 'EDITING',
      day,
      log: hostingLog,
      isStart: isSameDay(dayStart, start),
      isEnd: isSameDay(dayStart, lastDay),
      dayInPeriod,
    };
  }

  // 2. Empty day. Is there an open period somewhere?
  const open = findOpenPeriod(logs);
  if (open) {
    if (isContiguousAfter(open, day)) {
      const start = startOfDay(new Date(open.startDate));
      const dayInPeriod = differenceInDays(startOfDay(day), start) + 1;
      return { kind: 'CONTINUING', day, openLog: open, dayInPeriod };
    }
    return { kind: 'RESTART', day, openLog: open };
  }

  // 3. No open period, no log on this day → fresh start.
  return { kind: 'STARTING', day };
}
