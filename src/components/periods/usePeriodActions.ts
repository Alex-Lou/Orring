/**
 * Per-day mutation + reset handlers for the "Mes périodes" screen
 * (app/periods.tsx).
 *
 * Pure relocation of the handler closures that used to live inline in
 * PeriodsScreen. Every closed-over value the handlers relied on
 * (periodLogs, store mutators, today, flowState, selectedLog,
 * selectedDate, openPeriod, moveTargetLogId, the two setters, confirm,
 * and t) is now passed in. The bodies are byte-for-byte the same — same
 * conditions, same store calls, same setState calls, same order — so
 * behavior is identical. The hook just returns the handlers as an object.
 *
 * It is a plain function (no React hooks inside) so call order / rules
 * of hooks are unaffected; the screen calls it once per render exactly
 * where the handlers used to be declared.
 */
import {
  extendPeriodEnd,
  shrinkPeriodEnd,
  endPeriodToday,
  reopenPeriod,
  movePeriodStart,
  hasLogConflictOnDay,
  endPeriodAtDay,
  autoCloseOpenPeriod,
  setIntensityForDay,
  type PeriodFlowState,
} from '../../utils/periods';
import { isAfter, isSameDay } from 'date-fns';
import type { PeriodLog } from '../../store/cycleStore';
import type { useConfirm } from '../../components/ConfirmProvider';
import type { useTranslation } from 'react-i18next';

type ConfirmFn = ReturnType<typeof useConfirm>;
type T = ReturnType<typeof useTranslation>['t'];

export interface PeriodActionsParams {
  periodLogs: PeriodLog[];
  addPeriodLog: (log: Omit<PeriodLog, 'id'>) => void;
  updatePeriodLog: (id: string, updates: Partial<PeriodLog>) => void;
  deletePeriodLog: (id: string) => void;
  today: Date;
  flowState: PeriodFlowState | null;
  selectedDate: Date | null;
  selectedLog: PeriodLog | undefined;
  openPeriod: PeriodLog | null;
  moveTargetLogId: string | null;
  setSelectedDate: (d: Date | null) => void;
  setMoveTargetLogId: (id: string | null) => void;
  confirm: ConfirmFn;
  t: T;
}

export function usePeriodActions({
  periodLogs,
  addPeriodLog,
  updatePeriodLog,
  deletePeriodLog,
  today,
  flowState,
  selectedDate,
  selectedLog,
  openPeriod,
  moveTargetLogId,
  setSelectedDate,
  setMoveTargetLogId,
  confirm,
  t,
}: PeriodActionsParams) {
  const handleDayPress = (d: Date) => {
    // Disallow logging future days — the prediction badge already covers
    // that case, and saving period data dated tomorrow would corrupt the
    // average-cycle math (delta would be negative on the next entry).
    if (isAfter(d, today) && !isSameDay(d, today)) return;

    // ── Move mode: the next tap relocates the active log's start to
    // this day, preserving the duration. We refuse target days that
    // overlap *another* log (would silently merge two periods).
    if (moveTargetLogId) {
      const target = periodLogs.find(l => l.id === moveTargetLogId);
      setMoveTargetLogId(null);
      if (!target) return;
      if (hasLogConflictOnDay(periodLogs, d, target.id)) {
        // Could surface a toast/Alert; for now silently abort the move
        // so the user can re-tap on a free day without extra friction.
        return;
      }
      const patch = movePeriodStart(target, d, today);
      if (patch) updatePeriodLog(target.id, patch);
      return;
    }

    setSelectedDate(d);
  };

  const handleSelectIntensity = (intensity: 'light' | 'normal' | 'heavy') => {
    if (!selectedDate || !flowState) return;
    // Each flow state translates the SAME tap ("user picked X
    // intensity") into a different store mutation. Routing the action
    // through `flowState.kind` keeps the screen logic clean and means
    // adding a new state later (e.g. SKIP_DAY) is one extra case here.
    //
    // v2.6: every state ALSO writes to `intensities[dateKey]` for the
    // tapped day so the calendar cell renders with its own color
    // independent of any other day's intensity.
    switch (flowState.kind) {
      case 'STARTING':
        // Brand-new open period at the tapped day. The store seeds
        // `intensities[startDate]` automatically inside addPeriodLog.
        addPeriodLog({ startDate: selectedDate.toISOString(), intensity });
        break;
      case 'CONTINUING': {
        // Extend the open period one more day AND record this day's
        // specific intensity in the per-day map. Both patches merge.
        const extPatch = extendPeriodEnd(flowState.openLog, today);
        if (extPatch) {
          const intPatch = setIntensityForDay(flowState.openLog, selectedDate, intensity);
          updatePeriodLog(flowState.openLog.id, { ...extPatch, ...intPatch });
        }
        break;
      }
      case 'RESTART': {
        // Auto-close the lingering open period at its last covered
        // day, then start a fresh log at the tapped day.
        const closePatch = autoCloseOpenPeriod(flowState.openLog);
        if (Object.keys(closePatch).length > 0) {
          updatePeriodLog(flowState.openLog.id, closePatch);
        }
        addPeriodLog({ startDate: selectedDate.toISOString(), intensity });
        break;
      }
      case 'EDITING': {
        // Edit ONLY the tapped day's intensity — leave other days of
        // the period untouched. This is the fix for "all days take
        // the last intensity" in v2.5.0.
        const intPatch = setIntensityForDay(flowState.log, flowState.day, intensity);
        updatePeriodLog(flowState.log.id, intPatch);
        break;
      }
    }
    setSelectedDate(null);
  };

  /**
   * "End at this day" action — the heart of the guided flow's
   * retroactive close UX. In CONTINUING the user is saying "yesterday
   * was actually my last day": close the period at the day BEFORE the
   * tap (= the open period's current last day). In EDITING the user is
   * saying "this day was my last": close at the tapped day.
   */
  const handleEndAtDay = () => {
    if (!flowState) return;
    if (flowState.kind === 'CONTINUING') {
      // The open period's current last covered day becomes the end.
      // For a single-day open log, that just sets endDate = startDate
      // semantics (handled by endPeriodAtDay returning {endDate:undefined}).
      const lastCovered = flowState.openLog.endDate
        ? new Date(flowState.openLog.endDate)
        : new Date(flowState.openLog.startDate);
      const patch = endPeriodAtDay(flowState.openLog, lastCovered);
      if (patch) updatePeriodLog(flowState.openLog.id, patch);
    } else if (flowState.kind === 'EDITING') {
      const patch = endPeriodAtDay(flowState.log, flowState.day);
      if (patch) updatePeriodLog(flowState.log.id, patch);
    }
    setSelectedDate(null);
  };

  const handleRemove = () => {
    if (selectedLog) deletePeriodLog(selectedLog.id);
    setSelectedDate(null);
  };

  // ── Duration & move handlers — all delegate to the pure helpers.
  // The helpers return a `Partial<PeriodLog>` patch (or null when the
  // operation isn't applicable), we hand it to the store mutator. No
  // duplicated math here, no silent failures: a `null` patch means we
  // drop the call entirely (the buttons that map to it should be
  // disabled via `canExtend` / `canShrink` anyway, this is just belt
  // and suspenders).
  const handleExtend = () => {
    if (!selectedLog) return;
    const patch = extendPeriodEnd(selectedLog, today);
    if (patch) updatePeriodLog(selectedLog.id, patch);
  };
  const handleShrink = () => {
    if (!selectedLog) return;
    const patch = shrinkPeriodEnd(selectedLog);
    if (patch) updatePeriodLog(selectedLog.id, patch);
  };
  const handleEndToday = () => {
    if (!selectedLog) return;
    const patch = endPeriodToday(selectedLog, today);
    if (patch) updatePeriodLog(selectedLog.id, patch);
  };
  const handleReopen = () => {
    if (!selectedLog) return;
    const patch = reopenPeriod(selectedLog);
    if (patch) updatePeriodLog(selectedLog.id, patch);
  };
  const handleStartMove = () => {
    if (!selectedLog) return;
    setMoveTargetLogId(selectedLog.id);
    setSelectedDate(null);
  };
  const cancelMove = () => setMoveTargetLogId(null);

  // ── Reset actions, both destructive, both gated by Alert.alert.
  // "Annuler la période en cours" only deletes the currently-open
  // log (gives the user a clean out if she tapped a wrong day to
  // start). "Effacer toutes mes périodes" wipes the whole history,
  // useful for testing or when a user wants a clean slate.
  // Reset handlers route through the global useConfirm() hook so the
  // themed dialog is a single component mounted once at the root.
  const handleResetCurrentPeriod = async () => {
    if (!openPeriod) return;
    if (await confirm({
      title: t('periodsResetCurrentTitle', { defaultValue: 'Annuler la période en cours ?' }),
      body: t('periodsResetCurrentBody', {
        defaultValue:
          'Tous les jours déjà loggués pour cette période seront supprimés. Tes périodes précédentes ne sont pas touchées.',
      }),
      confirmLabel: t('periodsResetCurrentConfirm', { defaultValue: 'Supprimer' }),
      destructive: true,
      emoji: '↩',
    })) {
      deletePeriodLog(openPeriod.id);
    }
  };

  const handleResetAllPeriods = async () => {
    if (periodLogs.length === 0) return;
    if (await confirm({
      title: t('periodsResetAllTitle', { defaultValue: 'Effacer toutes mes périodes ?' }),
      body: t('periodsResetAllBody', {
        defaultValue:
          'Toutes tes périodes loggées seront supprimées définitivement. La moyenne et les prédictions seront remises à zéro. Cette action est irréversible.',
      }),
      confirmLabel: t('periodsResetAllConfirm', { defaultValue: 'Tout effacer' }),
      destructive: true,
      emoji: '🗑',
    })) {
      // Sequential deletes — the store re-runs reschedulePeriodNotifs
      // after each call, so the final state has notifs cleanly cancelled.
      for (const log of periodLogs) {
        deletePeriodLog(log.id);
      }
    }
  };

  return {
    handleDayPress,
    handleSelectIntensity,
    handleEndAtDay,
    handleRemove,
    handleExtend,
    handleShrink,
    handleEndToday,
    handleReopen,
    handleStartMove,
    cancelMove,
    handleResetCurrentPeriod,
    handleResetAllPeriods,
  };
}
