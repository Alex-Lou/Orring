import {
  getDayInCycle,
  getDayInCycleFromLogs,
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
  upsertCycleLog,
  earliestInsertDate,
  sanitizeCycleLogs,
  isInsertCorrection,
  clampRemovalToInsertion,
} from '../utils/cycle';
import { addDays, startOfDay } from 'date-fns';
import i18n from '../i18n';
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

  // `daysUntilChange` counts whole calendar days to the next action's DATE
  // (removal on day 22), so it matches the date shown on screen + the
  // notifications. Day 15 → removal day 22 is 7 calendar days away.
  test('day 15 - ring in, 7 days until removal', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'in', new Date(2026, 3, 11));
    expect(info.currentDay).toBe(15);
    expect(info.nextAction).toBe('remove');
    expect(info.daysUntilChange).toBe(7);
    expect(info.progress).toBeCloseTo(15 / 21, 1);
  });

  test('day 25 - ring out phase, 4 days until re-insertion', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'out', new Date(2026, 3, 21));
    expect(info.currentDay).toBe(25);
    expect(info.nextAction).toBe('insert');
    // Re-insertion lands on day 29 → 4 calendar days from day 25.
    expect(info.daysUntilChange).toBe(4);
  });

  test('detects overdue when ring should be out but is in', () => {
    const info = getCycleInfoFromLogs(firstInsert, [], 'in', new Date(2026, 3, 21));
    expect(info.isOverdue).toBe(true);
  });

  test('ring removed → 7-day pause from the removal, next action is insert', () => {
    // Inserted Mar 28, removed early on Apr 5. The ring-free pause is 7 days
    // FROM the removal, so re-insertion is Apr 12 → exactly 7 days away.
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 2, 28).toISOString(), action: 'insert' },
      { id: '2', date: new Date(2026, 3, 5).toISOString(), action: 'remove' },
    ];
    const info = getCycleInfoFromLogs(firstInsert, logs, 'out', new Date(2026, 3, 5));
    // A ring that's OUT can only be re-inserted next — never "removed" again.
    expect(info.nextAction).toBe('insert');
    expect(info.daysUntilChange).toBe(7);
    expect(info.isOverdue).toBe(false);
  });
});

// ─── generateCycleHistory ───

describe('generateCycleHistory', () => {
  const firstInsert = new Date(2026, 0, 1);

  // History is built from real insert logs (past/current) plus predicted
  // future cycles. With no logs and an old firstInsert almost everything is
  // in the past, so we drive these with logs to test the real contract.
  test('generates one entry per insert log', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 0, 1).toISOString(), action: 'insert' },
      { id: '2', date: new Date(2026, 0, 29).toISOString(), action: 'insert' },
    ];
    const history = generateCycleHistory(firstInsert, logs, []);
    const fromLogs = history.filter(h => h.actualInsertDate !== null);
    expect(fromLogs.length).toBe(2);
    expect(fromLogs[0].cycleNumber).toBe(1);
  });

  test('marks the cycle containing today as current', () => {
    // An insertion 5 days ago → today sits inside that cycle's 28-day window.
    const today = startOfDay(new Date());
    const logs: CycleLog[] = [
      { id: '1', date: addDays(today, -5).toISOString(), action: 'insert' },
    ];
    const history = generateCycleHistory(today, logs, []);
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

// getStatusLabel maps a day-status to an i18n key, so assert against the
// resolved translation (robust to copy changes) rather than a hardcoded
// French substring, which was the cause of the previous failures.
describe('getStatusLabel', () => {
  test('insert_day → insert label', () => expect(getStatusLabel('insert_day')).toBe(i18n.t('insert')));
  test('remove_day → remove label', () => expect(getStatusLabel('remove_day')).toBe(i18n.t('remove')));
  test('ring_in → ringInPlace label', () => expect(getStatusLabel('ring_in')).toBe(i18n.t('ringInPlace')));
  test('ring_out → pause label', () => expect(getStatusLabel('ring_out')).toBe(i18n.t('pause')));
  test('none label is empty', () => expect(getStatusLabel('none')).toBe(''));
  test('known statuses produce a non-empty label', () => {
    for (const s of ['insert_day', 'remove_day', 'ring_in', 'ring_out'] as const) {
      expect(getStatusLabel(s).length).toBeGreaterThan(0);
    }
  });
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

// ─── upsertCycleLog : append vs correct-in-place ───

describe('upsertCycleLog', () => {
  const base: CycleLog[] = [{ id: 'a', date: '2026-03-28T08:00:00.000Z', action: 'insert' }];

  test('a genuine state change appends a new log', () => {
    const out = upsertCycleLog(base, 'remove', '2026-04-18T08:00:00.000Z', false, 'new1');
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: 'new1', action: 'remove', date: '2026-04-18T08:00:00.000Z' });
  });

  test('a correction edits the last matching log in place (no duplicate)', () => {
    const out = upsertCycleLog(base, 'insert', '2026-03-26T08:00:00.000Z', true, 'unused');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');                       // same log…
    expect(out[0].date).toBe('2026-03-26T08:00:00.000Z'); // …only the date moved
  });

  test('correction with no prior matching log still appends', () => {
    const out = upsertCycleLog([], 'insert', '2026-03-26T08:00:00.000Z', true, 'new2');
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('new2');
  });

  test('correction only touches the LAST insert, earlier cycles untouched', () => {
    const logs: CycleLog[] = [
      { id: '1', date: '2026-01-01T08:00:00.000Z', action: 'insert' },
      { id: '2', date: '2026-01-29T08:00:00.000Z', action: 'insert' },
    ];
    const out = upsertCycleLog(logs, 'insert', '2026-01-30T08:00:00.000Z', true, 'x');
    expect(out[0].date).toBe('2026-01-01T08:00:00.000Z');
    expect(out[1].date).toBe('2026-01-30T08:00:00.000Z');
  });
});

describe('isInsertCorrection', () => {
  const removeJun10: CycleLog = { id: 'r', date: new Date(2026, 5, 10).toISOString(), action: 'remove' };

  test('ring in → always a correction (edit the worn cycle in place)', () => {
    expect(isInsertCorrection([removeJun10], 'in', new Date(2026, 5, 1).toISOString())).toBe(true);
  });
  test('ring out with no removals → correction', () => {
    expect(isInsertCorrection([], 'out', new Date(2026, 5, 1).toISOString())).toBe(true);
  });
  test('ring out, date strictly AFTER last removal → new cycle (append)', () => {
    expect(isInsertCorrection([removeJun10], 'out', new Date(2026, 5, 17).toISOString())).toBe(false);
  });
  test('ring out, BACKDATED before the removal → correction (the 21 May case)', () => {
    expect(isInsertCorrection([removeJun10], 'out', new Date(2026, 4, 21).toISOString())).toBe(true);
  });
  test('ring out, same day as the removal → correction', () => {
    expect(isInsertCorrection([removeJun10], 'out', new Date(2026, 5, 10).toISOString())).toBe(true);
  });
});

describe('backdated insertion sticks as the anchor (Settings/Home desync)', () => {
  test('removed today, then "inserted 21 May" → anchor is 21 May, single insert log', () => {
    const today = new Date(2026, 5, 10); // Jun 10
    // onboard insert Jun 10, then remove Jun 10 → ring out
    let logs = upsertCycleLog([], 'insert', new Date(2026, 5, 10).toISOString(), false, 'i1');
    logs = upsertCycleLog(logs, 'remove', new Date(2026, 5, 10).toISOString(), false, 'r1');
    // user sets insertion to 21 May while out → it's a correction, not a new cycle
    const corr = isInsertCorrection(logs, 'out', new Date(2026, 4, 21).toISOString());
    expect(corr).toBe(true);
    logs = upsertCycleLog(logs, 'insert', new Date(2026, 4, 21).toISOString(), corr, 'i2');
    expect(logs.filter(l => l.action === 'insert')).toHaveLength(1); // no stale duplicate
    const anchor = getEffectiveCycleStart(new Date(2026, 4, 21), logs, today);
    expect(anchor.getMonth()).toBe(4); // May, not June
    expect(anchor.getDate()).toBe(21);
  });
});

describe('sanitizeCycleLogs (legacy self-heal)', () => {
  test('empty / single log is returned unchanged', () => {
    expect(sanitizeCycleLogs([])).toEqual([]);
    const one: CycleLog[] = [{ id: 'a', date: '2026-03-28T08:00:00.000Z', action: 'insert' }];
    expect(sanitizeCycleLogs(one)).toEqual(one);
  });

  test('two stacked inserts collapse to the later one', () => {
    const logs: CycleLog[] = [
      { id: '1', date: '2026-06-03T08:00:00.000Z', action: 'insert' },
      { id: '2', date: '2026-06-10T08:00:00.000Z', action: 'insert' },
    ];
    const out = sanitizeCycleLogs(logs);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-06-10T08:00:00.000Z');
  });

  test('alternating insert/remove is preserved', () => {
    const logs: CycleLog[] = [
      { id: '1', date: '2026-01-01T08:00:00.000Z', action: 'insert' },
      { id: '2', date: '2026-01-22T08:00:00.000Z', action: 'remove' },
      { id: '3', date: '2026-01-29T08:00:00.000Z', action: 'insert' },
    ];
    expect(sanitizeCycleLogs(logs)).toHaveLength(3);
  });

  test('sorts by date, then collapses runs (the corrupt-calendar case)', () => {
    // Logged out of order with a duplicate insert run — exactly what backdated
    // testing produced: insert/insert with no removal between → one cycle.
    const logs: CycleLog[] = [
      { id: '2', date: '2026-06-10T08:00:00.000Z', action: 'insert' },
      { id: '1', date: '2026-06-03T08:00:00.000Z', action: 'insert' },
      { id: '3', date: '2026-06-17T08:00:00.000Z', action: 'remove' },
    ];
    const out = sanitizeCycleLogs(logs);
    expect(out.map(l => l.action)).toEqual(['insert', 'remove']);
    expect(out[0].date).toBe('2026-06-10T08:00:00.000Z'); // later of the two inserts
  });
});

describe('earliestInsertDate', () => {
  test('returns the earliest insertion, ignoring removals & order', () => {
    const logs: CycleLog[] = [
      { id: '2', date: '2026-01-29T08:00:00.000Z', action: 'insert' },
      { id: 'r', date: '2026-01-22T08:00:00.000Z', action: 'remove' },
      { id: '1', date: '2026-01-01T08:00:00.000Z', action: 'insert' },
    ];
    expect(earliestInsertDate(logs, 'fallback')).toBe('2026-01-01T08:00:00.000Z');
  });
  test('no inserts → fallback', () => {
    expect(earliestInsertDate([], 'fallback')).toBe('fallback');
  });
});

// ─── #6 regression: a backdated correction reflects immediately ───

describe('correcting the current insertion (#6 breach)', () => {
  test('onboard "today" then correct to 2 days ago → currentDay 3, single log', () => {
    const today = new Date(2026, 5, 12); // Jun 12
    // 1) onboarding insert "today" (ring was 'out' → genuine append)
    let logs = upsertCycleLog([], 'insert', new Date(2026, 5, 12, 9).toISOString(), false, 'a');
    // 2) "actually I inserted it 2 days ago" while ring is already 'in' → correction
    logs = upsertCycleLog(logs, 'insert', new Date(2026, 5, 10, 9).toISOString(), true, 'b');
    expect(logs).toHaveLength(1); // no phantom duplicate cycle

    const info = getCycleInfoFromLogs(new Date(logs[0].date), logs, 'in', today);
    expect(info.currentDay).toBe(3);          // Jun 10 → Jun 12 = day 3, not day 1
    expect(info.nextAction).toBe('remove');
  });
});

// ─── getDayInCycleFromLogs : log-aware calendar coloring (C1 regression) ───

describe('getDayInCycleFromLogs', () => {
  const firstInsert = new Date(2026, 0, 1); // Jan 1

  test('no logs → identical to the fixed 28-day schedule', () => {
    expect(getDayInCycleFromLogs(firstInsert, [], new Date(2026, 0, 1))).toBe(1);
    expect(getDayInCycleFromLogs(firstInsert, [], new Date(2026, 0, 21))).toBe(21);
    expect(getDayInCycleFromLogs(firstInsert, [], new Date(2026, 0, 29))).toBe(1); // next cycle
  });

  test('days before the first insertion return -1', () => {
    expect(getDayInCycleFromLogs(firstInsert, [], new Date(2025, 11, 31))).toBe(-1);
  });

  test('an off-schedule re-insertion governs the days after it (no permanent drift)', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 0, 1).toISOString(), action: 'insert' },
      { id: '2', date: new Date(2026, 0, 25).toISOString(), action: 'insert' }, // off-schedule re-insert
    ];
    // Anchored on the Jan-25 re-insertion, not the fixed Jan-1 + 24 schedule:
    expect(getDayInCycleFromLogs(firstInsert, logs, new Date(2026, 0, 25))).toBe(1);
    expect(getDayInCycleFromLogs(firstInsert, logs, new Date(2026, 0, 26))).toBe(2);
    // …and this matches what the home screen shows for that same anchor.
  });

  test('days before a re-insertion keep using the earlier governing insert', () => {
    const logs: CycleLog[] = [
      { id: '1', date: new Date(2026, 0, 1).toISOString(), action: 'insert' },
      { id: '2', date: new Date(2026, 0, 25).toISOString(), action: 'insert' },
    ];
    expect(getDayInCycleFromLogs(firstInsert, logs, new Date(2026, 0, 10))).toBe(10);
  });
});

// ─── #7 safety: a removal before the current insertion can't drive the pause ───

describe('pause ignores removals dated before the current insertion', () => {
  test('stray earlier removal does not become the shown removal date', () => {
    const firstInsert = new Date(2026, 2, 28); // Mar 28
    const logs: CycleLog[] = [
      { id: 'i', date: new Date(2026, 2, 28).toISOString(), action: 'insert' },
      { id: 'r', date: new Date(2026, 2, 20).toISOString(), action: 'remove' }, // before insert
    ];
    const info = getCycleInfoFromLogs(firstInsert, logs, 'out', new Date(2026, 2, 28));
    // Falls back to the SCHEDULED removal (insertion + 21 = Apr 18), never the
    // contradictory Mar-20 stray.
    expect(info.removalDateTime).not.toBeNull();
    expect(info.removalDateTime!.getMonth()).toBe(3); // April, not March
    expect(info.removalDateTime!.getDate()).toBe(18);
  });
});

// ─── 7.2: a ring can't come out before it went in (clamp) ───

describe('clampRemovalToInsertion', () => {
  test('no insert logs → removal returned unchanged', () => {
    const d = new Date(2026, 5, 10).toISOString();
    expect(clampRemovalToInsertion([], d)).toBe(d);
  });

  test('removal after insertion → unchanged', () => {
    const logs: CycleLog[] = [{ id: 'i', date: new Date(2026, 5, 2, 9).toISOString(), action: 'insert' }];
    const remove = new Date(2026, 5, 10, 9).toISOString();
    expect(clampRemovalToInsertion(logs, remove)).toBe(remove);
  });

  test('removal backdated BEFORE insertion → clamped up to the insertion datetime', () => {
    const insert = new Date(2026, 5, 12, 9).toISOString();
    const logs: CycleLog[] = [{ id: 'i', date: insert, action: 'insert' }];
    const remove = new Date(2026, 5, 10, 9).toISOString(); // 2 days before insert
    expect(clampRemovalToInsertion(logs, remove)).toBe(insert);
  });

  test('removal exactly at insertion → unchanged (pause J1)', () => {
    const insert = new Date(2026, 5, 12, 9).toISOString();
    const logs: CycleLog[] = [{ id: 'i', date: insert, action: 'insert' }];
    expect(clampRemovalToInsertion(logs, insert)).toBe(insert);
  });

  test('anchors on the MOST RECENT insertion across cycles', () => {
    const logs: CycleLog[] = [
      { id: 'i1', date: new Date(2026, 4, 1, 9).toISOString(), action: 'insert' },
      { id: 'r1', date: new Date(2026, 4, 22, 9).toISOString(), action: 'remove' },
      { id: 'i2', date: new Date(2026, 4, 29, 9).toISOString(), action: 'insert' },
    ];
    const remove = new Date(2026, 4, 25, 9).toISOString(); // before the 2nd insert
    expect(clampRemovalToInsertion(logs, remove)).toBe(new Date(2026, 4, 29, 9).toISOString());
  });
});

// ─── 7.2: a backdated removal stays reactive when it's physically valid ───

describe('backdated removal reactivity (the J3 case)', () => {
  test('inserted 10 days ago, removal corrected to 2 days ago → pause J3, 5 days to re-insertion', () => {
    const today = new Date(2026, 5, 12); // Jun 12
    // insert Jun 2 (append), remove today (append), then correct removal back
    // to Jun 10 — still ≥ insertion, so the clamp leaves it untouched.
    let logs = upsertCycleLog([], 'insert', new Date(2026, 5, 2, 9).toISOString(), false, 'i');
    logs = upsertCycleLog(logs, 'remove', new Date(2026, 5, 12, 9).toISOString(), false, 'r');
    const corrected = clampRemovalToInsertion(logs, new Date(2026, 5, 10, 9).toISOString());
    expect(corrected).toBe(new Date(2026, 5, 10, 9).toISOString()); // not clamped
    logs = upsertCycleLog(logs, 'remove', corrected, true, 'unused');

    const info = getCycleInfoFromLogs(new Date(logs[0].date), logs, 'out', today);
    expect(info.nextAction).toBe('insert');
    expect(info.daysUntilChange).toBe(5);                       // Jun 10 + 7 = Jun 17
    expect(RING_OUT_DAYS - info.daysUntilChange + 1).toBe(3);   // home-screen pauseDay = J3
  });

  test('impossible case (inserted today, removal "2 days ago") clamps → pause J1', () => {
    const today = new Date(2026, 5, 12); // Jun 12
    let logs = upsertCycleLog([], 'insert', new Date(2026, 5, 12, 9).toISOString(), false, 'i');
    logs = upsertCycleLog(logs, 'remove', new Date(2026, 5, 12, 9).toISOString(), false, 'r');
    const corrected = clampRemovalToInsertion(logs, new Date(2026, 5, 10, 9).toISOString());
    expect(corrected).toBe(new Date(2026, 5, 12, 9).toISOString()); // clamped to insertion
    logs = upsertCycleLog(logs, 'remove', corrected, true, 'unused');

    const info = getCycleInfoFromLogs(new Date(logs[0].date), logs, 'out', today);
    expect(info.daysUntilChange).toBe(7);                      // removed today → full pause ahead
    expect(RING_OUT_DAYS - info.daysUntilChange + 1).toBe(1);  // pause J1
  });
});
