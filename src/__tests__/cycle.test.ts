import {
  getDayInCycle,
  getDayStatus,
  getCurrentCycleStart,
  getCycleInfoFromLogs,
  getEffectiveCycleStart,
  generateCycleHistory,
  getMonthDaysWithPeriods,
  RING_IN_DAYS,
  RING_OUT_DAYS,
  CYCLE_LENGTH,
  formatDateFr,
  getStatusLabel,
  getStatusEmoji,
} from '../utils/cycle';
import type { CycleLog, PeriodLog } from '../store/cycleStore';

// ─── Constants ───

describe('Cycle constants', () => {
  test('ring in = 21 days', () => expect(RING_IN_DAYS).toBe(21));
  test('ring out = 7 days', () => expect(RING_OUT_DAYS).toBe(7));
  test('cycle length = 28 days', () => expect(CYCLE_LENGTH).toBe(28));
  test('21 + 7 = 28', () => expect(RING_IN_DAYS + RING_OUT_DAYS).toBe(CYCLE_LENGTH));
});

// ─── getDayInCycle ───

describe('getDayInCycle', () => {
  const insertDate = new Date(2026, 2, 28); // March 28

  test('insert day = day 1', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 2, 28))).toBe(1);
  });

  test('next day = day 2', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 2, 29))).toBe(2);
  });

  test('day 21 = last ring-in day', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 3, 17))).toBe(21);
  });

  test('day 22 = first ring-out day (remove day)', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 3, 18))).toBe(22);
  });

  test('day 28 = last day of cycle', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 3, 24))).toBe(28);
  });

  test('day 29 = wraps to day 1 of next cycle', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 3, 25))).toBe(1);
  });

  test('before insert date returns -1', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 2, 27))).toBe(-1);
  });

  test('56 days later = day 1 (2 full cycles)', () => {
    expect(getDayInCycle(insertDate, new Date(2026, 4, 23))).toBe(1);
  });
});

// ─── getDayStatus ───

describe('getDayStatus', () => {
  test('day 1 = insert_day', () => expect(getDayStatus(1)).toBe('insert_day'));
  test('day 2-21 = ring_in', () => {
    for (let d = 2; d <= 21; d++) expect(getDayStatus(d)).toBe('ring_in');
  });
  test('day 22 = remove_day', () => expect(getDayStatus(22)).toBe('remove_day'));
  test('day 23-28 = ring_out', () => {
    for (let d = 23; d <= 28; d++) expect(getDayStatus(d)).toBe('ring_out');
  });
  test('day 0 = none', () => expect(getDayStatus(0)).toBe('none'));
  test('day 29 = none', () => expect(getDayStatus(29)).toBe('none'));
  test('negative = none', () => expect(getDayStatus(-1)).toBe('none'));
});

// ─── getCurrentCycleStart ───

describe('getCurrentCycleStart', () => {
  const firstInsert = new Date(2026, 0, 1); // Jan 1

  test('same day returns same day', () => {
    const result = getCurrentCycleStart(firstInsert, new Date(2026, 0, 1));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  test('day 28 still in first cycle', () => {
    const result = getCurrentCycleStart(firstInsert, new Date(2026, 0, 28));
    expect(result.getDate()).toBe(1);
  });

  test('day 29 starts second cycle', () => {
    const result = getCurrentCycleStart(firstInsert, new Date(2026, 0, 29));
    expect(result.getDate()).toBe(29);
  });

  test('before insert returns insert date', () => {
    const result = getCurrentCycleStart(firstInsert, new Date(2025, 11, 25));
    expect(result.getDate()).toBe(1);
  });
});

// ─── getEffectiveCycleStart ───

describe('getEffectiveCycleStart', () => {
  const firstInsert = new Date(2026, 0, 1);

  test('no logs = falls back to theoretical', () => {
    const result = getEffectiveCycleStart(firstInsert, [], new Date(2026, 1, 5));
    expect(result.getDate()).toBe(29); // Jan 29 = second cycle start
  });

  test('uses most recent insert log', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 1, 2).toISOString(), action: 'insert' },
    ];
    const result = getEffectiveCycleStart(firstInsert, logs, new Date(2026, 1, 10));
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(1);
  });

  test('ignores future insert logs', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 2, 1).toISOString(), action: 'insert' },
    ];
    const result = getEffectiveCycleStart(firstInsert, logs, new Date(2026, 1, 10));
    // Should not use the March 1 log since today is Feb 10
    expect(result.getMonth()).not.toBe(2);
  });
});

// ─── getCycleInfoFromLogs ───

describe('getCycleInfoFromLogs', () => {
  const firstInsert = new Date(2026, 2, 28); // March 28

  test('day 1 - correct phase info', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'in', new Date(2026, 2, 28));
    expect(info.currentDay).toBe(1);
    expect(info.status).toBe('insert_day');
    expect(info.nextAction).toBe('remove');
    expect(info.isOverdue).toBe(false);
  });

  test('day 15 - ring in, 7 days until remove', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'in', new Date(2026, 3, 11));
    expect(info.currentDay).toBe(15);
    expect(info.nextAction).toBe('remove');
    expect(info.daysUntilChange).toBe(7);
    expect(info.progress).toBeCloseTo(15 / 21, 1);
  });

  test('day 25 - ring out phase, 4 days until insert', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'out', new Date(2026, 3, 21));
    expect(info.currentDay).toBe(25);
    expect(info.nextAction).toBe('insert');
    expect(info.daysUntilChange).toBe(4);
  });

  test('detects overdue when ring should be out but is in', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'in', new Date(2026, 3, 21));
    expect(info.isOverdue).toBe(true);
  });

  test('detects overdue when ring should be in but is out', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'out', new Date(2026, 3, 5));
    expect(info.currentDay).toBe(9);
    expect(info.isOverdue).toBe(true);
  });
});

// ─── generateCycleHistory ───

describe('generateCycleHistory', () => {
  const firstInsert = new Date(2026, 0, 1);

  test('generates correct number of cycles', () => {
    const history = generateCycleHistory(firstInsert, [], [], 6);
    expect(history.length).toBe(6);
  });

  test('marks current cycle correctly', () => {
    const today = new Date();
    const recentInsert = new Date(today);
    recentInsert.setDate(today.getDate() - 5); // 5 days ago
    const history = generateCycleHistory(recentInsert, [], [], 6);
    const current = history.find(h => h.status === 'current');
    expect(current).toBeDefined();
  });

  test('includes actual dates from logs', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 0, 2).toISOString(), action: 'insert' },
    ];
    const history = generateCycleHistory(firstInsert, logs, [], 6);
    const first = history.find(h => h.cycleNumber === 1);
    expect(first?.actualInsertDate).toBeDefined();
  });
});

// ─── getMonthDaysWithPeriods ───

describe('getMonthDaysWithPeriods', () => {
  test('generates correct number of days for April', () => {
    const days = getMonthDaysWithPeriods(2026, 3, new Date(2026, 2, 28), []);
    expect(days.length).toBe(30); // April has 30 days
  });

  test('marks today correctly', () => {
    const today = new Date();
    const days = getMonthDaysWithPeriods(
      today.getFullYear(), today.getMonth(), new Date(2026, 2, 28), []
    );
    const todayDay = days.find(d => d.isToday);
    expect(todayDay).toBeDefined();
  });

  test('includes period intensity', () => {
    const periodLogs: PeriodLog[] = [
      { id: '1', startDate: new Date(2026, 3, 20).toISOString(), intensity: 'heavy' },
    ];
    const days = getMonthDaysWithPeriods(2026, 3, new Date(2026, 2, 28), periodLogs);
    const day20 = days.find(d => d.date.getDate() === 20);
    expect(day20?.periodIntensity).toBe('heavy');
  });
});

// ─── Helpers ───

describe('formatDateFr', () => {
  test('formats date in French', () => {
    const result = formatDateFr(new Date(2026, 3, 11), 'dd MMMM yyyy');
    expect(result).toContain('avril');
    expect(result).toContain('2026');
  });
});

describe('getStatusLabel', () => {
  test('insert_day label', () => expect(getStatusLabel('insert_day')).toContain('anneau'));
  test('remove_day label', () => expect(getStatusLabel('remove_day')).toContain('anneau'));
  test('ring_in label', () => expect(getStatusLabel('ring_in')).toContain('place'));
  test('ring_out label', () => expect(getStatusLabel('ring_out')).toContain('ause'));
  test('none label', () => expect(getStatusLabel('none')).toBe(''));
});

describe('getStatusEmoji', () => {
  test('each status has an emoji', () => {
    expect(getStatusEmoji('insert_day').length).toBeGreaterThan(0);
    expect(getStatusEmoji('remove_day').length).toBeGreaterThan(0);
    expect(getStatusEmoji('ring_in').length).toBeGreaterThan(0);
    expect(getStatusEmoji('ring_out').length).toBeGreaterThan(0);
  });
  test('none has no emoji', () => expect(getStatusEmoji('none')).toBe(''));
});
