import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleRingNotifications, cancelAllNotifications, scheduleTempRemovalNotif, cancelTempRemovalNotif } from '../utils/notifications';

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
  endDate?: string;
  intensity: 'light' | 'normal' | 'heavy';
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

interface CycleData {
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
  // DEBUG: force a specific greeting icon for testing. `null` = auto (by
  // current time). Intentionally excluded from the persist partialize so it
  // resets to null on every app boot.
  debugIconOverride: 'morning' | 'sun' | 'sunset' | 'night' | null;
}

interface CycleActions {
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
  setDebugIconOverride: (v: CycleData['debugIconOverride']) => void;
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
  _hasHydrated: boolean;
}

type CycleState = CycleData & CycleActions;

// ─── Helpers ───

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const INITIAL_DATA: CycleData = {
  firstInsertDate: null,
  ringStatus: 'out',
  cycleLogs: [],
  periodLogs: [],
  dayNotes: [],
  notificationsEnabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  darkMode: false,
  language: 'fr',
  userName: null,
  hasOnboarded: false,
  tempRemovalStart: null,
  tempRemovalNotify: true,
  debugIconOverride: null,
};

// ─── Store with persist middleware (AsyncStorage) ───

export const useCycleStore = create<CycleState>()(
  persist(
    (set, get) => {
      /**
       * Finds the most recent `insert` log and reschedules the 6 cycle
       * notifications from it. No-op if notifications are disabled or no
       * insert exists. Centralizes what was duplicated across removeRing,
       * setNotificationsEnabled, setReminderTime, and boot.
       *
       * `extraLogs` lets callers pass a log they've just computed but not
       * yet committed to state (e.g. the new `remove` log in removeRing)
       * so we don't miss it due to zustand's async set.
       */
      const rescheduleFromLastInsert = (extraLogs: CycleLog[] = []) => {
        if (!get().notificationsEnabled) return;
        const logs = [...get().cycleLogs, ...extraLogs];
        const lastInsert = logs.filter(l => l.action === 'insert').pop();
        if (!lastInsert) return;
        scheduleRingNotifications(
          new Date(lastInsert.date),
          get().reminderHour,
          get().reminderMinute,
        ).catch(() => {});
      };

      return ({
      ...INITIAL_DATA,
      _hasHydrated: false,

      setFirstInsertDate: (date) => set({ firstInsertDate: date }),

      insertRing: (date?: string) => {
        const insertDate = date || new Date().toISOString();
        const newLog: CycleLog = { id: generateId(), date: insertDate, action: 'insert' };
        const firstInsert = get().firstInsertDate || insertDate;
        set({
          cycleLogs: [...get().cycleLogs, newLog],
          ringStatus: 'in',
          firstInsertDate: firstInsert,
          // Auto-annule le timer temporaire quand on remet l'anneau
          tempRemovalStart: null,
        });
        // Annule la notif du timer si elle était prévue
        cancelTempRemovalNotif().catch(() => {});
        // Schedule notifications for this cycle from the fresh insert date.
        if (get().notificationsEnabled) {
          scheduleRingNotifications(new Date(insertDate), get().reminderHour, get().reminderMinute).catch(() => {});
        }
      },

      removeRing: (date?: string) => {
        const removeDate = date || new Date().toISOString();
        const newLog: CycleLog = { id: generateId(), date: removeDate, action: 'remove' };
        set({
          cycleLogs: [...get().cycleLogs, newLog],
          ringStatus: 'out',
        });
        // Reschedule from the actual last insertion (NOT the removal date),
        // otherwise the next cycle's J-7/J-1 reminders would be offset.
        rescheduleFromLastInsert([newLog]);
      },

      addPeriodLog: (log) => {
        set({ periodLogs: [...get().periodLogs, { ...log, id: generateId() }] });
      },

      updatePeriodLog: (id, updates) => {
        set({ periodLogs: get().periodLogs.map(l => l.id === id ? { ...l, ...updates } : l) });
      },

      deletePeriodLog: (id) => {
        set({ periodLogs: get().periodLogs.filter(l => l.id !== id) });
      },

      setRingStatus: (status) => set({ ringStatus: status }),

      saveDayNote: (dateKey, text, marks) => {
        const filtered = get().dayNotes.filter(n => n.dateKey !== dateKey);
        if (text.trim() || marks.length > 0) {
          filtered.push({ id: generateId(), dateKey, text: text.trim(), marks });
        }
        set({ dayNotes: filtered });
      },

      deleteDayNote: (dateKey) => {
        set({ dayNotes: get().dayNotes.filter(n => n.dateKey !== dateKey) });
      },

      getDayNote: (dateKey) => get().dayNotes.find(n => n.dateKey === dateKey),

      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        if (!enabled) {
          cancelAllNotifications().catch(() => {});
        } else {
          rescheduleFromLastInsert();
        }
      },

      setReminderTime: (hour, minute) => {
        set({ reminderHour: hour, reminderMinute: minute });
        // Reschedule with new hour/minute (helper reads them back from state).
        rescheduleFromLastInsert();
      },

      rescheduleNotifications: () => {
        rescheduleFromLastInsert();
      },

      toggleDarkMode: () => set({ darkMode: !get().darkMode }),
      setDarkMode: (v) => set({ darkMode: v }),

      setLanguage: (lang) => set({ language: lang }),

      setUserName: (name) => set({ userName: name }),

      completeOnboarding: () => set({ hasOnboarded: true }),

      startTempRemoval: (notify) => {
        const now = new Date().toISOString();
        set({ tempRemovalStart: now, tempRemovalNotify: notify });
        if (notify) {
          scheduleTempRemovalNotif(new Date(now)).catch(() => {});
        }
      },

      cancelTempRemoval: () => {
        set({ tempRemovalStart: null });
        cancelTempRemovalNotif().catch(() => {});
      },

      setTempRemovalNotify: (v) => {
        set({ tempRemovalNotify: v });
        const start = get().tempRemovalStart;
        if (start && v) {
          scheduleTempRemovalNotif(new Date(start)).catch(() => {});
        } else {
          cancelTempRemovalNotif().catch(() => {});
        }
      },

      setDebugIconOverride: (v) => set({ debugIconOverride: v }),

      clearHistory: () => set({
        cycleLogs: [],
        periodLogs: [],
        firstInsertDate: null,
        ringStatus: 'out',
      }),

      deleteCycleLog: (id) => {
        set({ cycleLogs: get().cycleLogs.filter(l => l.id !== id) });
      },

      deleteCycleLogsBetween: (startMs, endMs) => {
        set({
          cycleLogs: get().cycleLogs.filter(l => {
            const t = new Date(l.date).getTime();
            return t < startMs || t > endMs;
          }),
          periodLogs: get().periodLogs.filter(p => {
            const t = new Date(p.startDate).getTime();
            return t < startMs || t > endMs;
          }),
        });
      },

      resetAll: () => {
        cancelAllNotifications().catch(() => {});
        // Garde les préférences utilisateur (langue, dark mode, nom)
        // mais reset toutes les données de cycle pour revenir à l'onboarding
        set({
          ...INITIAL_DATA,
          language: get().language,
          darkMode: get().darkMode,
          // userName est reset pour retriggerer la demande dans l'onboarding
        });
      },
      });
    },
    {
      // Key bumped to force-discard any data written by pre-v2.1.2 builds.
      // The old schema is incompatible and not recoverable, so fresh install it is.
      name: 'orring-storage-v2',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist data, not actions or hydration flag
        firstInsertDate: state.firstInsertDate,
        ringStatus: state.ringStatus,
        cycleLogs: state.cycleLogs,
        periodLogs: state.periodLogs,
        dayNotes: state.dayNotes,
        notificationsEnabled: state.notificationsEnabled,
        reminderHour: state.reminderHour,
        reminderMinute: state.reminderMinute,
        darkMode: state.darkMode,
        language: state.language,
        userName: state.userName,
        hasOnboarded: state.hasOnboarded,
        tempRemovalStart: state.tempRemovalStart,
        tempRemovalNotify: state.tempRemovalNotify,
      }),
      migrate: (_persisted, _version) => {
        // No migration path from older builds — always return a clean slate.
        return { ...INITIAL_DATA };
      },
      onRehydrateStorage: () => () => {
        AsyncStorage.removeItem('orrniapp-storage').catch(() => {});
        useCycleStore.setState({ _hasHydrated: true });
      },
    }
  )
);
