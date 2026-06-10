import { addDays, differenceInDays, format, isSameDay, startOfDay, isBefore, isAfter } from 'date-fns';
import type { CycleLog, PeriodLog, RingStatus } from '../store/cycleStore';
import i18n from '../i18n';
import { getDateFnsLocale } from '../i18n/dateLocales';

function getLocale() {
  return getDateFnsLocale(i18n.language);
}

export const RING_IN_DAYS = 21;
export const RING_OUT_DAYS = 7;
export const CYCLE_LENGTH = RING_IN_DAYS + RING_OUT_DAYS;

export type DayStatus = 'ring_in' | 'ring_out' | 'insert_day' | 'remove_day' | 'none';

export interface CycleDay {
  date: Date;
  dayInCycle: number;
  status: DayStatus;
  isToday: boolean;
  periodIntensity?: 'light' | 'normal' | 'heavy';
}

export interface CycleInfo {
  currentDay: number;
  status: DayStatus;
  daysUntilChange: number;
  nextAction: 'insert' | 'remove';
  nextActionDate: Date;
  progress: number;
  cycleProgress: number;
  phaseLabel: string;
  ringInsertDate: Date;
  insertionDateTime: Date | null;   // exact datetime from log
  removalDateTime: Date | null;     // calculated: insertion + 21 days same hour
  nextInsertionDateTime: Date | null; // calculated: insertion + 28 days same hour
  isOverdue: boolean;
}

export interface CycleHistoryEntry {
  cycleNumber: number;
  theoreticalInsertDate: Date;
  theoreticalRemoveDate: Date;
  theoreticalPauseEnd: Date;
  actualInsertDate: Date | null;
  actualRemoveDate: Date | null;
  periodDays: PeriodLog[];
  status: 'past' | 'current' | 'future';
}

// ─── Core functions ───

export function getDayInCycle(insertDate: Date, targetDate: Date): number {
  const start = startOfDay(insertDate);
  const target = startOfDay(targetDate);
  const diff = differenceInDays(target, start);
  if (diff < 0) return -1;
  return (diff % CYCLE_LENGTH) + 1;
}

/**
 * Log-aware day-in-cycle for the CALENDAR grid.
 *
 * `getDayInCycle` projects a single fixed `firstInsert + 28×N` schedule, so
 * the moment the user inserts/removes off-schedule the calendar drifts from
 * the (log-aware) home screen — and the offset is permanent, recurring every
 * month forever. This version anchors each day on the insertion that
 * actually governs it: the most recent insert log on or before that day
 * (falling back to `firstInsertDate` before the first log). Past cycles line
 * up with their real insert logs; future months project from the LATEST
 * insert — exactly the anchor the home screen uses for "today".
 */
export function getDayInCycleFromLogs(
  firstInsertDate: Date,
  cycleLogs: CycleLog[],
  targetDate: Date,
): number {
  const target = startOfDay(targetDate);
  const governingInsert = cycleLogs
    .filter(l => l.action === 'insert')
    .map(l => startOfDay(new Date(l.date)))
    .filter(d => !isAfter(d, target))
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?? startOfDay(firstInsertDate);

  const diff = differenceInDays(target, governingInsert);
  if (diff < 0) return -1;
  return (diff % CYCLE_LENGTH) + 1;
}

export function getDayStatus(dayInCycle: number): DayStatus {
  if (dayInCycle < 1 || dayInCycle > CYCLE_LENGTH) return 'none';
  if (dayInCycle === 1) return 'insert_day';
  if (dayInCycle === RING_IN_DAYS + 1) return 'remove_day';
  if (dayInCycle <= RING_IN_DAYS) return 'ring_in';
  return 'ring_out';
}

export function getCurrentCycleStart(firstInsertDate: Date, today: Date): Date {
  const start = startOfDay(firstInsertDate);
  const target = startOfDay(today);
  const diff = differenceInDays(target, start);
  if (diff < 0) return start;
  const cycleNumber = Math.floor(diff / CYCLE_LENGTH);
  return addDays(start, cycleNumber * CYCLE_LENGTH);
}

// ─── Enhanced functions using logs ───

/**
 * Find the effective cycle start based on actual insert logs
 */
export function getEffectiveCycleStart(
  firstInsertDate: Date,
  cycleLogs: CycleLog[],
  today: Date
): Date {
  // Find the most recent insert log on or before today
  const insertLogs = cycleLogs
    .filter(l => l.action === 'insert')
    .map(l => ({ ...l, parsedDate: startOfDay(new Date(l.date)) }))
    .filter(l => !isAfter(l.parsedDate, startOfDay(today)))
    .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

  if (insertLogs.length > 0) {
    return insertLogs[0].parsedDate;
  }

  return getCurrentCycleStart(firstInsertDate, today);
}

/**
 * Enhanced cycle info using real logs
 */
export function getCycleInfoFromLogs(
  firstInsertDate: Date,
  cycleLogs: CycleLog[],
  ringStatus: RingStatus,
  today: Date = new Date()
): CycleInfo {
  const cycleStart = getEffectiveCycleStart(firstInsertDate, cycleLogs, today);
  const daysSinceInsert = differenceInDays(startOfDay(today), startOfDay(cycleStart)) + 1;

  // Clamp to cycle length for display
  const currentDay = Math.min(daysSinceInsert, CYCLE_LENGTH);
  const status = getDayStatus(currentDay);

  let daysUntilChange: number;
  let nextAction: 'insert' | 'remove';
  let nextActionDate: Date;
  let progress: number;
  let phaseLabel: string;
  let isOverdue = false;

  const t = i18n.t.bind(i18n);

  // `daysUntilChange` = whole CALENDAR days from today to the next action's
  // date (ring removal lands on day 22 = cycleStart + 21 ; re-insertion on
  // day 29 = cycleStart + 28). It's derived from `nextActionDate` with
  // startOfDay on BOTH ends, so:
  //   • the big countdown always matches the removal/insertion DATE shown
  //     just below it on the home screen, and the scheduled notifications;
  //   • a log saved late at night (e.g. 23h50) can never shift the count by
  //     a day — we compare day-starts, never raw timestamps.
  const todayStart = startOfDay(today);

  // The ring-free pause lasts RING_OUT_DAYS (7) FROM the actual removal — NOT
  // a fixed insertion+28 schedule. So removing the ring (even early) always
  // gives the correct 7-day countdown to re-insertion, never 28.
  //
  // Only a removal of the CURRENT cycle (on or after cycleStart) may drive the
  // pause. A removal logged for a *previous* cycle — or, while testing, one
  // dated before the current insertion — must never anchor today's countdown,
  // otherwise the screen would contradict itself (e.g. "inserted the 10th" yet
  // a pause computed from a removal on the 8th).
  const lastRemoveLog = [...cycleLogs]
    .filter(l => l.action === 'remove')
    .filter(l => !isBefore(startOfDay(new Date(l.date)), startOfDay(cycleStart)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const lastRemovalDay = lastRemoveLog
    ? startOfDay(new Date(lastRemoveLog.date))
    : addDays(cycleStart, RING_IN_DAYS); // fallback: the scheduled removal day
  const pauseEndDate = addDays(lastRemovalDay, RING_OUT_DAYS); // re-insertion day
  const daysIntoPause = Math.max(0, differenceInDays(todayStart, lastRemovalDay));

  // The next action follows the RING STATE, never the calendar alone:
  //   • ring IN  → you remove it (after 21 days of wear)
  //   • ring OUT → you re-insert it (after the 7-day ring-free pause)
  // so the status pill and the countdown/action label can never contradict.
  if (ringStatus === 'in') {
    nextAction = 'remove';
    nextActionDate = addDays(cycleStart, RING_IN_DAYS);
    daysUntilChange = Math.max(0, differenceInDays(nextActionDate, todayStart));
    progress = Math.min(currentDay / RING_IN_DAYS, 1);
    phaseLabel = currentDay === 1 ? t('insertionDay') : t('ringInPlace');
    if (differenceInDays(todayStart, nextActionDate) > 0) {
      isOverdue = true;            // past the removal day but still wearing it
      phaseLabel = t('phaseStillIn');
    }
  } else {
    nextAction = 'insert';
    nextActionDate = pauseEndDate;
    daysUntilChange = Math.max(0, differenceInDays(nextActionDate, todayStart));
    progress = Math.min(daysIntoPause / RING_OUT_DAYS, 1);
    phaseLabel = t('ringRemoved');
    if (differenceInDays(todayStart, nextActionDate) > 0) {
      isOverdue = true;            // past the re-insertion day but still out
      phaseLabel = t('phaseOverdueInsert');
    }
  }

  const cycleProgress = Math.min(currentDay / CYCLE_LENGTH, 1);

  // Find exact insertion datetime from logs
  const lastInsertLog = [...cycleLogs]
    .filter(l => l.action === 'insert')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const insertionDateTime = lastInsertLog ? new Date(lastInsertLog.date) : null;
  const removalActualDateTime = lastRemoveLog ? new Date(lastRemoveLog.date) : null;

  // "Removal" date shown on screen: the ACTUAL removal once the ring is out,
  // otherwise the scheduled removal (insertion + 21 days, same clock time).
  const removalDateTime = ringStatus === 'out' && removalActualDateTime
    ? removalActualDateTime
    : insertionDateTime
      ? addDays(insertionDateTime, RING_IN_DAYS)
      : null;

  // Next re-insertion: 7 days after the ACTUAL removal while out; otherwise a
  // projection of the next cycle (insertion + 28) while the ring is still in.
  const nextInsertionDateTime = ringStatus === 'out' && removalActualDateTime
    ? addDays(removalActualDateTime, RING_OUT_DAYS)
    : insertionDateTime
      ? addDays(insertionDateTime, CYCLE_LENGTH)
      : null;

  return {
    currentDay,
    status,
    daysUntilChange,
    nextAction,
    nextActionDate,
    progress,
    cycleProgress,
    phaseLabel,
    ringInsertDate: cycleStart,
    insertionDateTime,
    removalDateTime,
    nextInsertionDateTime,
    isOverdue,
  };
}

// ─── Cycle-log mutation helpers (pure — unit-tested) ───

/**
 * Append a cycle log, OR correct the current one in place.
 *
 * A genuine state change (ring in→out or out→in) APPENDS a new event.
 * Re-logging the state you're already in is a CORRECTION of the current
 * insertion/removal date, so we edit the last matching log in place rather
 * than stack a duplicate. Stacking was the root of the "I said inserted 2
 * days ago but it still counts today" breach: a 2nd insert let the picker
 * keep the older, later-dated one and ignore the correction — and spawned a
 * phantom extra cycle in the history.
 *
 * Pure: the id for a freshly-appended log is passed in (`newId`) so callers
 * own id generation and this stays deterministic for tests.
 */
export function upsertCycleLog(
  logs: CycleLog[],
  action: 'insert' | 'remove',
  date: string,
  isCorrection: boolean,
  newId: string,
): CycleLog[] {
  if (isCorrection) {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].action === action) {
        const next = logs.slice();
        next[i] = { ...next[i], date };
        return next;
      }
    }
  }
  return [...logs, { id: newId, date, action }];
}

/**
 * The "reference date" (settings + history fallback) is the EARLIEST
 * insertion on record — stable across cycles, yet it follows a correction
 * of the very first insertion. Falls back to `fallback` when there are no
 * insert logs at all.
 */
export function earliestInsertDate(logs: CycleLog[], fallback: string): string {
  const inserts = logs.filter(l => l.action === 'insert').map(l => l.date);
  return inserts.length
    ? inserts.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b))
    : fallback;
}

/**
 * Self-heal a cycle-log timeline: sort by date and collapse any RUN of the
 * same action into its most recent entry. Two inserts with no removal
 * between them (or two removals with no insert between) can only be
 * duplicate re-logs of the same event — keeping the latest is exactly the
 * "correction in place" rule, applied retroactively.
 *
 * This repairs legacy data written before insert/remove corrected in place,
 * where backdated re-logs stacked up and made the calendar paint
 * overlapping cycles (one long green span instead of 21 + 7). Pure — used
 * by the store's persist `migrate`.
 */
/**
 * Decide whether an incoming insert is a CORRECTION of the current cycle's
 * insertion (→ edit the existing insert log in place) or a genuine NEW-cycle
 * re-insertion (→ append a fresh log).
 *
 *  • Ring currently IN  → you're editing the worn cycle's insertion date.
 *  • Ring currently OUT → only a date STRICTLY AFTER the last removal starts
 *    the next cycle; any earlier-or-equal date (a backdated fix, e.g. "I
 *    actually inserted it on 21 May") edits the cycle you just removed.
 *
 * This is what makes a backdated insertion STICK as the cycle anchor instead
 * of an older same-cycle log winning by virtue of a later calendar date —
 * the exact "Settings says 21 May but Home says J1 today" desync.
 */
export function isInsertCorrection(
  cycleLogs: CycleLog[],
  ringStatus: RingStatus,
  insertDate: string,
): boolean {
  if (ringStatus === 'in') return true;
  const lastRemove = [...cycleLogs]
    .filter(l => l.action === 'remove')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!lastRemove) return true;
  return !isAfter(startOfDay(new Date(insertDate)), startOfDay(new Date(lastRemove.date)));
}

/**
 * A ring can't come out before it went in. Clamp a backdated removal so it
 * never predates the current cycle's insertion — otherwise the 7-day pause
 * would be shown as starting before the ring was ever in, which both
 * contradicts the home screen and, far worse for a contraceptive, misstates
 * how many days of pause have elapsed. The removal picker enforces the same
 * floor in the UI; this guards the quick "N days ago" buttons (and any other
 * caller) that bypass it.
 *
 * Returns `removeDate` untouched when it's already on/after the most recent
 * insertion, or when there is no insertion to anchor to. Pure — unit-tested.
 */
export function clampRemovalToInsertion(cycleLogs: CycleLog[], removeDate: string): string {
  const inserts = cycleLogs.filter(l => l.action === 'insert');
  if (inserts.length === 0) return removeDate;
  const lastInsert = inserts.reduce((a, b) =>
    new Date(a.date).getTime() >= new Date(b.date).getTime() ? a : b,
  );
  return new Date(removeDate).getTime() < new Date(lastInsert.date).getTime()
    ? lastInsert.date
    : removeDate;
}

export function sanitizeCycleLogs(logs: CycleLog[]): CycleLog[] {
  if (!Array.isArray(logs) || logs.length < 2) return Array.isArray(logs) ? logs : [];
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const out: CycleLog[] = [];
  for (const log of sorted) {
    const last = out[out.length - 1];
    if (last && last.action === log.action) {
      out[out.length - 1] = log; // collapse the run → keep the later event
    } else {
      out.push(log);
    }
  }
  return out;
}

// ─── History generation ───

export function generateCycleHistory(
  firstInsertDate: Date,
  cycleLogs: CycleLog[],
  periodLogs: PeriodLog[],
  count: number = 12
): CycleHistoryEntry[] {
  const today = startOfDay(new Date());
  const entries: CycleHistoryEntry[] = [];

  // PAST/CURRENT: built from actual insert logs (source of truth)
  const insertLogs = cycleLogs
    .filter(l => l.action === 'insert')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  insertLogs.forEach((log, idx) => {
    const insertDate = new Date(log.date);
    const insertDay = startOfDay(insertDate);
    const theoreticalRemove = addDays(insertDay, RING_IN_DAYS);
    const theoreticalPauseEnd = addDays(insertDay, CYCLE_LENGTH - 1);

    // Find matching remove log
    const removeLog = cycleLogs.find(l =>
      l.action === 'remove' &&
      !isBefore(startOfDay(new Date(l.date)), insertDay) &&
      !isAfter(startOfDay(new Date(l.date)), addDays(theoreticalPauseEnd, 3))
    );

    const periodDays = periodLogs.filter(p => {
      const d = startOfDay(new Date(p.startDate));
      return !isBefore(d, theoreticalRemove) && !isAfter(d, theoreticalPauseEnd);
    });

    const isCurrent = !isAfter(insertDay, today) && !isBefore(theoreticalPauseEnd, today);
    const isPast = isBefore(theoreticalPauseEnd, today) && !isCurrent;

    entries.push({
      cycleNumber: idx + 1,
      theoreticalInsertDate: insertDay,
      theoreticalRemoveDate: theoreticalRemove,
      theoreticalPauseEnd,
      actualInsertDate: insertDate,
      actualRemoveDate: removeLog ? new Date(removeLog.date) : null,
      periodDays,
      status: isCurrent ? 'current' : isPast ? 'past' : 'future',
    });
  });

  // FUTURE: predicted from last insert (or firstInsertDate if no logs)
  const lastInsert = insertLogs.length > 0
    ? startOfDay(new Date(insertLogs[insertLogs.length - 1].date))
    : startOfDay(firstInsertDate);

  for (let i = 1; i <= 6; i++) {
    const futureInsert = addDays(lastInsert, i * CYCLE_LENGTH);
    if (isBefore(futureInsert, today)) continue; // skip past dates
    entries.push({
      cycleNumber: (insertLogs.length || 1) + i,
      theoreticalInsertDate: futureInsert,
      theoreticalRemoveDate: addDays(futureInsert, RING_IN_DAYS),
      theoreticalPauseEnd: addDays(futureInsert, CYCLE_LENGTH - 1),
      actualInsertDate: null,
      actualRemoveDate: null,
      periodDays: [],
      status: 'future',
    });
  }

  return entries;
}

// ─── Calendar with periods ───

export function getMonthDaysWithPeriods(
  year: number,
  month: number,
  firstInsertDate: Date | null,
  periodLogs: PeriodLog[],
  cycleLogs: CycleLog[] = []
): CycleDay[] {
  const today = startOfDay(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CycleDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStart = startOfDay(date);
    // Log-aware: each day is anchored on the insertion that actually governs
    // it, so the grid matches the home screen after off-schedule changes
    // instead of drifting on the fixed firstInsert+28×N schedule. With no
    // cycleLogs this naturally falls back to the firstInsertDate anchor.
    const dayInCycle = firstInsertDate
      ? getDayInCycleFromLogs(firstInsertDate, cycleLogs, date)
      : -1;

    // Check for period log on this day
    const periodLog = periodLogs.find(p => isSameDay(startOfDay(new Date(p.startDate)), dateStart));

    days.push({
      date,
      dayInCycle,
      status: dayInCycle > 0 ? getDayStatus(dayInCycle) : 'none',
      isToday: isSameDay(date, today),
      periodIntensity: periodLog?.intensity,
    });
  }

  return days;
}

// ─── Formatting helpers (dynamic locale) ───

export function formatDateFr(date: Date, fmt: string = 'dd MMMM yyyy'): string {
  return format(date, fmt, { locale: getLocale() });
}

export function formatDateTimeFr(date: Date): string {
  const locale = getLocale();
  // Use locale-appropriate format
  const lang = i18n.language;
  if (lang === 'en') return format(date, 'EEE dd MMM, hh:mm a', { locale });
  if (lang === 'de') return format(date, "EEE dd MMM 'um' HH:mm", { locale });
  if (lang === 'zh' || lang === 'ja') return format(date, 'EEE MM/dd HH:mm', { locale });
  if (lang === 'ar') return format(date, 'EEE dd MMM HH:mm', { locale });
  return format(date, "EEE dd MMM 'à' HH'h'mm", { locale });
}

// ─── Status helpers (inlined to avoid circular dep with statusConfig) ───

export function getStatusLabel(status: DayStatus): string {
  const t = i18n.t.bind(i18n);
  switch (status) {
    case 'insert_day': return t('insert');
    case 'remove_day': return t('remove');
    case 'ring_in': return t('ringInPlace');
    case 'ring_out': return t('pause');
    default: return '';
  }
}

export function getStatusEmoji(status: DayStatus): string {
  switch (status) {
    case 'insert_day': return '⭕';
    case 'remove_day': return '✋';
    case 'ring_in': return '✅';
    case 'ring_out': return '🩸';
    default: return '';
  }
}
