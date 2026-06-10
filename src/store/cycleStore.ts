import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleRingNotifications,
  cancelAllNotifications,
  scheduleTempRemovalNotif,
  cancelTempRemovalNotif,
  schedulePeriodNotifications,
  cancelPeriodNotifications,
  scheduleOpenPeriodReminder,
} from '../utils/notifications';
import { getPeriodStats, findOpenPeriod, getLastCoveredDay } from '../utils/periods';
import { upsertCycleLog, earliestInsertDate, sanitizeCycleLogs, isInsertCorrection, clampRemovalToInsertion } from '../utils/cycle';
import { dateKey } from '../utils/dateKey';
import type { BackupPayload } from '../utils/backup';
import type {
  CycleData,
  CycleActions,
  CycleState,
  CycleLog,
  PeriodLog,
  RingStatus,
  DayMark,
  DayNote,
} from './cycleStore.types';

// Re-export the types so external consumers keep importing them from
// '../store/cycleStore' (they now live in './cycleStore.types').
export type {
  CycleLog,
  PeriodLog,
  RingStatus,
  DayMark,
  DayNote,
  CycleData,
  CycleActions,
  CycleState,
} from './cycleStore.types';

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
};

// Single source of truth for the persisted slice. `exportData` and
// `partialize` both derive from it, so adding a persisted field is a
// one-line change here instead of three hand-synced lists.
const PERSISTED_KEYS = [
  'firstInsertDate', 'ringStatus', 'cycleLogs', 'periodLogs', 'dayNotes',
  'notificationsEnabled', 'reminderHour', 'reminderMinute', 'darkMode',
  'language', 'userName', 'hasOnboarded', 'tempRemovalStart', 'tempRemovalNotify',
] as const;

function pickPersisted(state: CycleData): BackupPayload {
  const out = {} as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = state[k];
  return out as unknown as BackupPayload;
}

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
        // Phase-aware: the scheduler lays down ONLY the current phase's
        // reminders (remove vs re-insert) + its J+1/J+3 overdue nudges, so
        // nothing fires for an action already done. Re-insertion reminders
        // are anchored on the ACTUAL last removal (removal + 7).
        const lastRemoval = logs
          .filter(l => l.action === 'remove')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        scheduleRingNotifications(
          new Date(lastInsert.date),
          get().ringStatus,
          lastRemoval ? new Date(lastRemoval.date) : null,
          get().reminderHour,
          get().reminderMinute,
        ).catch(() => {});
      };

      /**
       * Recomputes the predicted next-period date from `periodLogs` (or
       * the optional `extraLogs` for not-yet-committed mutations) and
       * schedules / cancels the J-2 / J0 / J+3 reminders accordingly.
       *
       * Called on every period mutation + on boot, so the queue stays in
       * sync with the latest log without needing the user to re-open the
       * "Mes périodes" tab.
       */
      const reschedulePeriodNotifs = (extraLogs: PeriodLog[] = []) => {
        if (!get().notificationsEnabled) {
          cancelPeriodNotifications().catch(() => {});
          return;
        }
        const logs = [...get().periodLogs, ...extraLogs];
        const stats = getPeriodStats(logs);
        const hour = get().reminderHour;
        const minute = get().reminderMinute;

        // Two independent reminder tracks running off the period data:
        //   1. Prediction trio (J-2 / J0 / J+3) anchored on stats.nextStart
        //   2. Stale-open-period nudge (lastCovered + 2 days) when the
        //      user has left a period open without a closing day.
        // Both share the PERIOD_PREFIX namespace so a "disable
        // notifications" cleanly nukes them together via cancelByPrefix.
        schedulePeriodNotifications(stats.nextStart, hour, minute).catch(() => {});

        const openLog = findOpenPeriod(logs);
        const lastCovered = openLog ? getLastCoveredDay(openLog) : null;
        scheduleOpenPeriodReminder(lastCovered, hour, minute).catch(() => {});
      };

      return ({
      ...INITIAL_DATA,
      _hasHydrated: false,

      setFirstInsertDate: (date) => set({ firstInsertDate: date }),

      insertRing: (date?: string) => {
        const insertDate = date || new Date().toISOString();
        // Correcting the current cycle's insertion (edit in place) vs starting
        // a new cycle (append) — see isInsertCorrection. This is what makes a
        // backdated date (e.g. "inserted 21 May") actually anchor the cycle
        // instead of a stale later-dated log winning.
        const isCorrection = isInsertCorrection(get().cycleLogs, get().ringStatus, insertDate);
        const newLogs = upsertCycleLog(get().cycleLogs, 'insert', insertDate, isCorrection, generateId());
        set({
          cycleLogs: newLogs,
          ringStatus: 'in',
          firstInsertDate: earliestInsertDate(newLogs, insertDate),
          // Auto-annule le timer temporaire quand on remet l'anneau
          tempRemovalStart: null,
        });
        // Annule la notif du timer si elle était prévue
        cancelTempRemovalNotif().catch(() => {});
        // Ring is now IN → schedule this phase's reminders (removal J-7/J-1/J0
        // + overdue J+1/J+3) from the freshly-set state, via the shared
        // phase-aware rescheduler. No-op if notifications are disabled.
        rescheduleFromLastInsert();
      },

      removeRing: (date?: string) => {
        // Clamp a backdated removal so it can never predate the current
        // insertion — a ring can't come out before it went in. Keeps the
        // 7-day pause honest (no "removed before inserted" J1 glitch).
        const removeDate = clampRemovalToInsertion(get().cycleLogs, date || new Date().toISOString());
        // Re-logging a remove while the ring is already 'out' = correcting
        // the current removal date → edit in place rather than stack.
        const isCorrection = get().ringStatus === 'out';
        const newLogs = upsertCycleLog(get().cycleLogs, 'remove', removeDate, isCorrection, generateId());
        set({
          cycleLogs: newLogs,
          ringStatus: 'out',
        });
        // Reschedule from the actual last insertion (NOT the removal date),
        // otherwise the next cycle's J-7/J-1 reminders would be offset.
        rescheduleFromLastInsert();
      },

      addPeriodLog: (log) => {
        // New logs default to OPEN — the guided flow keeps appending
        // days to this log until the user explicitly closes it. We
        // also seed `intensities[dateKey(startDate)]` with the chosen
        // intensity so the start day renders its own color even
        // before the user adds further per-day entries.
        const startKey = dateKey(new Date(log.startDate));
        const newLog: PeriodLog = {
          closed: false,
          intensities: { [startKey]: log.intensity },
          ...log, // caller's explicit fields win — useful for the home
                  // screen which passes `closed: true` and may pre-fill
                  // a richer intensities map in the future.
          id: generateId(),
        };
        set({ periodLogs: [...get().periodLogs, newLog] });
        // Re-derive the next-period prediction with the new log included.
        reschedulePeriodNotifs([newLog]);
      },

      updatePeriodLog: (id, updates) => {
        set({ periodLogs: get().periodLogs.map(l => l.id === id ? { ...l, ...updates } : l) });
        reschedulePeriodNotifs();
      },

      deletePeriodLog: (id) => {
        set({ periodLogs: get().periodLogs.filter(l => l.id !== id) });
        reschedulePeriodNotifs();
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
          reschedulePeriodNotifs();
        }
      },

      setReminderTime: (hour, minute) => {
        set({ reminderHour: hour, reminderMinute: minute });
        // Reschedule with new hour/minute (helper reads them back from state).
        rescheduleFromLastInsert();
        reschedulePeriodNotifs();
      },

      rescheduleNotifications: () => {
        rescheduleFromLastInsert();
        reschedulePeriodNotifs();
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

      clearHistory: () => set({
        cycleLogs: [],
        firstInsertDate: null,
        ringStatus: 'out',
        // periodLogs intentionally PRESERVED. The period history is a separate
        // dataset with its own reset ("Effacer toutes mes périodes" in the
        // périodes tab); wiping the ring cycle must never nuke the user's
        // règles. (Independent reset per section — explicit user request.)
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

      // ── Backup parachute ─────────────────────────────────────────
      // exportData snapshots the persisted slice (see PERSISTED_KEYS) so
      // the user can save it elsewhere before a phone wipe / uninstall;
      // importData replays it back.
      exportData: (): BackupPayload => pickPersisted(get()),

      importData: (payload: BackupPayload) => {
        // Replace persisted slice; keep `_hasHydrated` and any non-
        // persisted runtime flags. After the swap, kick off a notif
        // reschedule so reminders snap back to the imported timeline.
        set({
          firstInsertDate: payload.firstInsertDate ?? null,
          ringStatus: payload.ringStatus,
          cycleLogs: payload.cycleLogs ?? [],
          periodLogs: payload.periodLogs ?? [],
          dayNotes: payload.dayNotes ?? [],
          notificationsEnabled: payload.notificationsEnabled ?? true,
          reminderHour: payload.reminderHour ?? 9,
          reminderMinute: payload.reminderMinute ?? 0,
          darkMode: payload.darkMode ?? false,
          language: payload.language ?? 'fr',
          userName: payload.userName ?? null,
          hasOnboarded: payload.hasOnboarded ?? true,
          tempRemovalStart: payload.tempRemovalStart ?? null,
          tempRemovalNotify: payload.tempRemovalNotify ?? true,
        });
        // Reschedule from the freshly-imported state.
        rescheduleFromLastInsert();
        reschedulePeriodNotifs();
      },
      });
    },
    {
      // Key bumped to force-discard any data written by pre-v2.1.2 builds.
      // The old schema is incompatible and not recoverable, so fresh install it is.
      name: 'orring-storage-v2',
      // v2: one-time self-heal of duplicate cycle logs (see migrate).
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data (see PERSISTED_KEYS), not actions or the
      // hydration flag.
      partialize: (state) => pickPersisted(state),
      migrate: (persisted, _version) => {
        // Preserve the user's persisted slice across any future version
        // bump and only backfill newly-added fields from INITIAL_DATA.
        // Returning a clean slate here would silently wipe the user's
        // entire cycle / period history the moment `version` is bumped.
        const merged = { ...INITIAL_DATA, ...((persisted as Partial<CycleData>) ?? {}) } as CycleData;
        // ── v2 self-heal ─────────────────────────────────────────────
        // Collapse duplicate consecutive insert/remove logs left by the
        // pre-correction-in-place builds (backdated re-logs that stacked
        // up and made the calendar paint overlapping cycles). Then re-derive
        // the reference date + ring state from the cleaned timeline so the
        // three stay consistent — no manual "Recommencer tout" needed.
        const cleaned = sanitizeCycleLogs(merged.cycleLogs ?? []);
        merged.cycleLogs = cleaned;
        if (cleaned.length > 0) {
          const inserts = cleaned.filter(l => l.action === 'insert');
          if (inserts.length > 0) {
            merged.firstInsertDate = inserts
              .reduce((a, b) => (new Date(a.date) <= new Date(b.date) ? a : b)).date;
          }
          merged.ringStatus = cleaned[cleaned.length - 1].action === 'insert' ? 'in' : 'out';
        }
        return merged;
      },
      onRehydrateStorage: () => () => {
        AsyncStorage.removeItem('orrniapp-storage').catch(() => {});
        useCycleStore.setState({ _hasHydrated: true });
      },
    }
  )
);
