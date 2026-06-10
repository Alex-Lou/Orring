import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { formatDateFr } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import type { PeriodLog } from '../store/cycleStore';
import { getPeriodDurationDays, isPeriodOpen, type PeriodFlowState } from '../utils/periods';
import { styles } from './PeriodLogModal.styles';
import { buildHeaderCopy } from './periodLogHeaderCopy';

/**
 * The modal supports two interaction levels:
 *
 *  1. **Quick log** — the legacy contract. Caller passes
 *     `currentIntensity` and the three callbacks `onSelect`, `onRemove`,
 *     `onClose`. Only the intensity selector + delete + close are
 *     rendered. Used by the home-screen pause tracker.
 *
 *  2. **Full log editor** — the new "Mes périodes" contract. Caller
 *     passes the actual `currentLog` plus the optional duration /
 *     move callbacks. The modal shows the duration row (`-1j` / `+1j`
 *     / "end today" / "reopen") and the "move period" button.
 *
 * Backward compatibility matters because two screens consume this
 * component — the new fields are all optional and the legacy
 * `currentIntensity` path is preserved when `currentLog` is absent.
 */
type Intensity = PeriodLog['intensity'];

interface PeriodLogModalProps {
  visible: boolean;
  date: Date | null;
  /** Legacy: callers that don't have the full log can still pass just intensity. */
  currentIntensity?: Intensity;
  /** Full editor mode — when present, the duration row and move button render. */
  currentLog?: PeriodLog;
  onSelect: (intensity: Intensity) => void;
  onRemove: () => void;
  onClose: () => void;
  /** Called with [+1j], [-1j], "end today", "reopen" — full-editor only. */
  onExtendEnd?: () => void;
  onShrinkEnd?: () => void;
  onEndToday?: () => void;
  onReopen?: () => void;
  /** Triggers the parent's "move mode" — full-editor only. */
  onMove?: () => void;
  /** Disables the [+1j] button when the period already runs up to today. */
  canExtend?: boolean;
  /** Disables the [-1j] button when the period is already a single day. */
  canShrink?: boolean;
  /**
   * When provided, the modal renders the guided "Mes périodes" flow:
   * the title + helper copy adapt to the state (STARTING / CONTINUING
   * / RESTART / EDITING) and the action set is curated for that step.
   *
   * When absent, the modal falls back to the legacy layout — the home
   * screen still gets the simple intensity-only quick-log.
   */
  flowState?: PeriodFlowState;
  /** Guided flow: "Marquer ce jour comme dernier" (works on any day in
   *  the period, not just today). Required for EDITING when the user
   *  wants to retroactively close at the tapped day. */
  onEndAtDay?: () => void;
}

const INTENSITIES: { key: Intensity; i18nKey: string; emoji: string; color: string }[] = [
  { key: 'light', i18nKey: 'light', emoji: '🩸', color: '#FCDCE6' },
  { key: 'normal', i18nKey: 'normal', emoji: '🩸🩸', color: '#F4A0A0' },
  { key: 'heavy', i18nKey: 'heavy', emoji: '🩸🩸🩸', color: '#E87070' },
];

export function PeriodLogModal({
  visible,
  date,
  currentIntensity,
  currentLog,
  onSelect,
  onRemove,
  onClose,
  onExtendEnd,
  onShrinkEnd,
  onEndToday,
  onReopen,
  onMove,
  canExtend = true,
  canShrink = true,
  flowState,
  onEndAtDay,
}: PeriodLogModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // Resolve the intensity to highlight: prefer the full log when present,
  // fall back to the legacy `currentIntensity` prop.
  const activeIntensity: Intensity | undefined = currentLog?.intensity ?? currentIntensity;
  // Three rendering modes:
  //  - guided:    flowState present → render the contextual STARTING/
  //               CONTINUING/RESTART/EDITING UI (Mes périodes screen)
  //  - fullEditor: legacy currentLog without flowState → duration row
  //               + move button (early v2.4.x periods.tsx, also used
  //               as a fallback if a caller forgets flowState)
  //  - quick:     neither → home screen pause-day quick log
  const guided = !!flowState;
  // The "duration controls + delete" block shows whenever we have an
  // existing log to edit — that means either legacy `currentLog` (no
  // flowState) OR guided EDITING. STARTING is truly empty (no log
  // exists yet) so it stays compact.
  const isEditingExistingLog = guided
    ? flowState?.kind === 'EDITING'
    : !!currentLog;
  // CONTINUING + RESTART reference an EXISTING open period; we want
  // the same duration card shown in EDITING but read-only (no
  // +/-1j buttons, no end/reopen toggle) so the user always sees
  // the current state of her in-progress period regardless of
  // which day she taps.
  const showDurationReadOnly =
    guided && (flowState?.kind === 'CONTINUING' || flowState?.kind === 'RESTART');

  // Pre-compute duration display once. Reads from the live log so an
  // [-1j] / [+1j] press that mutates state-then-rerenders shows the
  // updated number on the next frame without us caching anything.
  // Resolve the log we're rendering duration info FOR. EDITING uses
  // the tapped log directly; CONTINUING/RESTART borrow the open
  // period since that's the relevant in-progress one.
  const editingLog =
    guided && flowState?.kind === 'EDITING'
      ? flowState.log
      : guided && (flowState?.kind === 'CONTINUING' || flowState?.kind === 'RESTART')
        ? flowState.openLog
        : currentLog;
  const durationDays = editingLog ? getPeriodDurationDays(editingLog) : 0;
  const endDate = editingLog?.endDate ? new Date(editingLog.endDate) : null;

  // ── Guided-mode header copy (title + subtitle) — keyed off
  // `flowState.kind` so when the state changes (e.g. user picks an
  // intensity in CONTINUING and the modal closes/reopens on the next
  // tap), the FadeInDown re-fires and the new copy slides in.
  const headerCopy = buildHeaderCopy(flowState, t);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Inner Pressable swallows backdrop taps so a press inside the
            modal doesn't bubble up to the overlay's onClose. We also
            wrap it in an Animated.View whose `entering` runs ZoomIn +
            springify — gives a gentle "bloom" rise instead of a hard
            cut. The small overshoot reads as alive without bouncy. */}
        <Animated.View
          entering={ZoomIn.duration(320).springify().damping(18).mass(0.85)}
        >
          <Pressable
            onPress={() => {}}
            style={[styles.content, { backgroundColor: theme.surface }]}
          >
          <Animated.View entering={FadeIn.duration(200)}>
            {/* ── Header — guided (state-aware) or legacy ── */}
            {guided && headerCopy ? (
              // `key` cross-fades title/sub on state transitions.
              <Animated.View
                key={flowState!.kind}
                entering={FadeInDown.duration(280).springify().damping(18)}
              >
                <Text style={[styles.titleGuided, { color: theme.text }]}>
                  {headerCopy.title}
                </Text>
                {date && (
                  <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {formatDateFr(date, 'EEEE dd MMMM')}
                  </Text>
                )}
                <Text style={[styles.subGuided, { color: theme.textSecondary }]}>
                  {headerCopy.sub}
                </Text>
              </Animated.View>
            ) : (
              <>
                <Text style={[styles.title, { color: theme.text }]}>{t('periodTitle')}</Text>
                {date && (
                  <Text style={[styles.date, { color: theme.textSecondary }]}>
                    {formatDateFr(date, 'EEEE dd MMMM')}
                  </Text>
                )}
              </>
            )}

            {/* ── Intensity picker ── */}
            <View style={styles.options}>
              {INTENSITIES.map(({ key, i18nKey, emoji, color }) => (
                <Pressable
                  key={key}
                  style={[
                    styles.option,
                    { backgroundColor: color },
                    activeIntensity === key && styles.optionActive,
                  ]}
                  onPress={() => onSelect(key)}
                >
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                  <Text style={styles.optionLabel}>{t(i18nKey)}</Text>
                  {activeIntensity === key && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}
            </View>

            {/* ── Guided-mode "end at this day" action — visible only
                in EDITING + CONTINUING states. CONTINUING shows it as
                "Hier était mon dernier jour", EDITING as
                "Marquer ce jour comme dernier". Both call onEndAtDay. */}
            {guided && onEndAtDay && (flowState!.kind === 'EDITING' || flowState!.kind === 'CONTINUING') && (
              <Pressable
                onPress={onEndAtDay}
                style={({ pressed }) => [
                  styles.endAtDayBtn,
                  { borderColor: theme.primary },
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Text style={[styles.endAtDayLabel, { color: theme.primaryDark }]}>
                  {flowState!.kind === 'CONTINUING'
                    ? t('periodsFlowEndYesterday', {
                        defaultValue: 'Hier était mon dernier jour',
                      })
                    : t('periodsFlowEndAtThisDay', {
                        defaultValue: 'Marquer ce jour comme dernier',
                      })}
                </Text>
              </Pressable>
            )}

            {/* ── Duration card — visible in EDITING (full controls)
                AND in CONTINUING / RESTART (read-only summary). The
                user always sees her current period state regardless
                of which day she taps, which fixes the v2.6.3 issue
                where day-2 / day-3 modal dropped most of the layout. ── */}
            {(isEditingExistingLog || showDurationReadOnly) && editingLog && (
              <View style={[styles.durationCard, { backgroundColor: theme.background }]}>
                <View style={styles.durationHeader}>
                  <Text style={[styles.durationLabel, { color: theme.textSecondary }]}>
                    {t('periodModalDurationLabel', { defaultValue: 'Durée' })}
                  </Text>
                  <Text style={[styles.durationValue, { color: theme.text }]}>
                    {t('periodModalDurationDays', {
                      count: durationDays,
                      defaultValue: `${durationDays} j`,
                    })}
                  </Text>
                </View>
                <Text style={[styles.durationSub, { color: theme.textLight }]}>
                  {/* Sub-line tells the story: closed periods show
                      "Finit le X", open periods show "En cours · jour
                      X" so the user immediately reads "still being
                      logged" rather than "ended at endDate". */}
                  {editingLog && !isPeriodOpen(editingLog) && endDate
                    ? t('periodModalEndsOn', {
                        date: formatDateFr(endDate, 'EEE dd MMM'),
                        defaultValue: `Finit le ${formatDateFr(endDate, 'EEE dd MMM')}`,
                      })
                    : t('periodModalOngoing', { defaultValue: 'En cours' })}
                </Text>

                {/* Interactive controls only in EDITING — CONTINUING /
                    RESTART are read-only (the in-progress period has
                    its OWN editing path: tap a logged day → EDITING). */}
                {isEditingExistingLog && (
                <>
                <View style={styles.durationButtonsRow}>
                  <Pressable
                    onPress={onShrinkEnd}
                    disabled={!canShrink}
                    style={({ pressed }) => [
                      styles.durationBtn,
                      { backgroundColor: theme.primarySoft },
                      !canShrink && styles.durationBtnDisabled,
                      pressed && canShrink && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.durationBtnLabel, { color: theme.primaryDark }]}>
                      {t('periodModalShrink', { defaultValue: '− 1 jour' })}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onExtendEnd}
                    disabled={!canExtend}
                    style={({ pressed }) => [
                      styles.durationBtn,
                      { backgroundColor: theme.primarySoft },
                      !canExtend && styles.durationBtnDisabled,
                      pressed && canExtend && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.durationBtnLabel, { color: theme.primaryDark }]}>
                      {t('periodModalExtend', { defaultValue: '+ 1 jour' })}
                    </Text>
                  </Pressable>
                </View>

                {/* Toggle: end today ↔ reopen.
                    Keyed on the new `closed` flag (via isPeriodOpen)
                    instead of endDate — a multi-day OPEN period has
                    endDate set but is still "in progress", so we want
                    to show "Terminer" not "Marquer en cours" there. */}
                {editingLog && !isPeriodOpen(editingLog) ? (
                  <Pressable
                    onPress={onReopen}
                    style={({ pressed }) => [styles.durationLink, pressed && { opacity: 0.5 }]}
                  >
                    <Text style={[styles.durationLinkText, { color: theme.primaryDark }]}>
                      {t('periodModalReopen', { defaultValue: '↩ Marquer en cours' })}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={onEndToday}
                    style={({ pressed }) => [styles.durationLink, pressed && { opacity: 0.5 }]}
                  >
                    <Text style={[styles.durationLinkText, { color: theme.primaryDark }]}>
                      {t('periodModalEndToday', { defaultValue: "✓ Terminer aujourd'hui" })}
                    </Text>
                  </Pressable>
                )}
                </>
                )}
              </View>
            )}

            {/* "Déplacer cette période" button removed in v2.6.4 —
                feature was confusing without enough payoff (users
                preferred to delete + re-create rather than move).
                The implementation in periods.tsx + helper still
                exists if we ever want to re-introduce it via a
                "advanced" toggle. */}

            {/* ── Delete (only when there's something to delete) ── */}
            {activeIntensity && (
              <Pressable style={styles.removeBtn} onPress={onRemove}>
                <Text style={styles.removeText}>{t('delete')}</Text>
              </Pressable>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>{t('close')}</Text>
            </Pressable>
          </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
