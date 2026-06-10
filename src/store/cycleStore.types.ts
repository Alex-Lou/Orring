import type { BackupPayload } from '../utils/backup';

// ─── Types ───

export interface CycleLog {
  id: string;
  date: string;
  action: 'insert' | 'remove';
  notes?: string;
}

export interface PeriodLog {
  id: string;
  startDate: string;
  /**
   * Last calendar day covered by this log. Always set as the user logs
   * day-by-day during the period (CONTINUING flow keeps this in sync
   * with "today's" tap), but its presence does NOT mean the period is
   * finalized — that's `closed` below.
   */
  endDate?: string;
  /**
   * Period-level "dominant" intensity — kept for back-compat with logs
   * written before v2.6 (which only stored a single intensity for the
   * whole period) and used as the fallback in `getIntensityForDay`
   * when a specific day isn't in the per-day map below.
   */
  intensity: 'light' | 'normal' | 'heavy';
  /**
   * Per-day intensities, keyed by "YYYY-MM-DD" dateKey. Sparse: only
   * days the user has explicitly tapped get an entry. The renderer
   * looks up `intensities[dateKey(day)] ?? log.intensity` so legacy
   * logs (no map) still color every day with the dominant value, and
   * v2.6+ logs get true per-day color variety on the calendar.
   */
  intensities?: Record<string, 'light' | 'normal' | 'heavy'>;
  /**
   * `false` (or `undefined` for legacy-imported logs without endDate)
   * means the period is still being logged — the user can keep tapping
   * subsequent days to extend it. `true` means the user explicitly
   * ended it (via "Marquer comme dernier jour", "Terminer aujourd'hui",
   * or RESTART auto-close), at which point cycle stats include this
   * period's start as a clean reference for the next prediction.
   *
   * Defaulting `undefined` to "closed" for legacy logs that already had
   * an `endDate` preserves pre-v2.4.2 semantics (endDate-defined ↔
   * closed) without a destructive migration. The check lives in
   * `isPeriodOpen` so every consumer reads it consistently.
   */
  closed?: boolean;
}

export type RingStatus = 'in' | 'out';

export type DayMark = '💧' | '❤️' | '😊' | '😩' | '💊' | '🏥' | '⭐' | '🔥';

export interface DayNote {
  id: string;
  dateKey: string;
  text: string;
  marks: DayMark[];
}

// ─── State shape (data only, no actions — keeps persist clean) ───

export interface CycleData {
  firstInsertDate: string | null;
  ringStatus: RingStatus;
  cycleLogs: CycleLog[];
  periodLogs: PeriodLog[];
  dayNotes: DayNote[];
  notificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  darkMode: boolean;
  language: string;
  userName: string | null;
  hasOnboarded: boolean;
  // Timer retrait temporaire (<3h)
  tempRemovalStart: string | null; // ISO timestamp
  tempRemovalNotify: boolean;      // notif à +3h activée ou non
}

export interface CycleActions {
  setFirstInsertDate: (date: string) => void;
  insertRing: (date?: string) => void;
  removeRing: (date?: string) => void;
  addPeriodLog: (log: Omit<PeriodLog, 'id'>) => void;
  updatePeriodLog: (id: string, updates: Partial<PeriodLog>) => void;
  deletePeriodLog: (id: string) => void;
  setRingStatus: (status: RingStatus) => void;
  saveDayNote: (dateKey: string, text: string, marks: DayMark[]) => void;
  deleteDayNote: (dateKey: string) => void;
  getDayNote: (dateKey: string) => DayNote | undefined;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  toggleDarkMode: () => void;
  setDarkMode: (v: boolean) => void;
  setLanguage: (lang: string) => void;
  setUserName: (name: string | null) => void;
  completeOnboarding: () => void;
  startTempRemoval: (notify: boolean) => void;
  cancelTempRemoval: () => void;
  setTempRemovalNotify: (v: boolean) => void;
  /**
   * Reschedules J-7 / J-1 / J notifications from the latest `insert` log,
   * using the store's current reminder hour/minute. Safe to call anytime —
   * no-op when notifications are disabled or no insert has ever occurred.
   * Called on app boot to recover from rescheduling gaps (e.g. user denied
   * then later granted permission, or OS dropped queued notifs).
   */
  rescheduleNotifications: () => void;
  clearHistory: () => void;
  deleteCycleLog: (id: string) => void;
  deleteCycleLogsBetween: (startMs: number, endMs: number) => void;
  resetAll: () => void;
  /** Snapshot of the persisted slice of state — fed to `serializeBackup`. */
  exportData: () => BackupPayload;
  /** Replace the persisted slice with `payload` — used by Restore. */
  importData: (payload: BackupPayload) => void;
  _hasHydrated: boolean;
}

export type CycleState = CycleData & CycleActions;
