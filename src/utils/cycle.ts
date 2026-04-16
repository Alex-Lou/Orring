import { addDays, differenceInDays, format, isSameDay, startOfDay, isBefore, isAfter } from 'date-fns';
import { fr, enUS, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';
import type { CycleLog, PeriodLog, RingStatus } from '../store/cycleStore';
import i18n from '../i18n';

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, pt, de, ar, zh: zhCN, ja };

function getLocale() {
  return DATE_LOCALES[i18n.language] || fr;
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

  if (currentDay <= RING_IN_DAYS) {
    daysUntilChange = RING_IN_DAYS - currentDay;
    nextAction = 'remove';
    nextActionDate = addDays(cycleStart, RING_IN_DAYS);
    progress = currentDay / RING_IN_DAYS;
    phaseLabel = currentDay === 1 ? t('insertionDay') : t('ringInPlace');

    if (ringStatus === 'out' && currentDay > 1) {
      isOverdue = true;
      phaseLabel = t('phaseRemovedEarly');
    }
  } else {
    const dayInPause = currentDay - RING_IN_DAYS;
    daysUntilChange = RING_OUT_DAYS - dayInPause;
    nextAction = 'insert';
    nextActionDate = addDays(cycleStart, CYCLE_LENGTH);
    progress = dayInPause / RING_OUT_DAYS;
    phaseLabel = currentDay === RING_IN_DAYS + 1 ? t('removalDay') : t('ringRemoved');

    if (ringStatus === 'in') {
      isOverdue = true;
      phaseLabel = t('phaseStillIn');
    }
  }

  // Handle days beyond cycle (overdue situation)
  if (daysSinceInsert > CYCLE_LENGTH) {
    isOverdue = true;
    daysUntilChange = 0;
    progress = 1;
    if (ringStatus === 'out') {
      nextAction = 'insert';
      phaseLabel = t('phaseOverdueInsert');
    } else {
      nextAction = 'remove';
      phaseLabel = t('phaseOverdueRemove');
    }
    nextActionDate = today;
  }

  const cycleProgress = Math.min(currentDay / CYCLE_LENGTH, 1);

  // Find exact insertion datetime from logs
  const lastInsertLog = [...cycleLogs]
    .filter(l => l.action === 'insert')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const insertionDateTime = lastInsertLog ? new Date(lastInsertLog.date) : null;

  // Calculate exact removal and next insertion datetimes (same hour as insertion)
  const removalDateTime = insertionDateTime
    ? addDays(insertionDateTime, RING_IN_DAYS)
    : null;

  const nextInsertionDateTime = insertionDateTime
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
  periodLogs: PeriodLog[]
): CycleDay[] {
  const today = startOfDay(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CycleDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStart = startOfDay(date);
    const dayInCycle = firstInsertDate ? getDayInCycle(firstInsertDate, date) : -1;

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

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
