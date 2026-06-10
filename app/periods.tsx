/**
 * "Mes périodes" — dedicated period-tracking screen.
 *
 * Distinct from the home screen's pause-week tracker: this view is about
 * the *menstrual* periods themselves, with a full month-by-month editing
 * grid, a prediction badge for the next expected start, and rolling stats
 * (avg cycle, avg duration). Notification reminders (J-2 / J0 / J+3) are
 * scheduled by the store on every period mutation, so the UI just needs
 * to stay in sync via the periodLogs subscription.
 *
 * Visual language stays close to the rest of the app — surfaces, soft
 * shadows, primary cranberry accent for period intensity. Day cells in
 * the month grid are big enough to tap reliably on phones.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isAfter,
} from 'date-fns';
import { getDateFnsLocale } from '../src/i18n/dateLocales';
import { dateKey } from '../src/utils/dateKey';
import { useTheme } from '../src/theme/useTheme';
import { useCycleStore, type PeriodLog } from '../src/store/cycleStore';
import { PeriodLogModal } from '../src/components/PeriodLogModal';
import { useConfirm } from '../src/components/ConfirmProvider';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
import {
  getPeriodStats,
  extendPeriodEnd,
  shrinkPeriodEnd,
  computePeriodFlowState,
  getIntensityForDay,
  findOpenPeriod,
  type PeriodFlowState,
} from '../src/utils/periods';
import { styles } from './periods.styles';
import { buildSummaryCard } from '../src/components/periods/buildSummaryCard';
import { IndependenceCard, HowItWorksCard } from '../src/components/periods/PeriodsHelpCards';
import { usePeriodActions } from '../src/components/periods/usePeriodActions';
import { PeriodCalendar } from '../src/components/periods/PeriodCalendar';
import { SummarySection, StatsRow, PeriodLegend } from '../src/components/periods/PeriodSummarySections';


const COLS = 7;

export default function PeriodsScreen() {
  const { periodLogs, addPeriodLog, updatePeriodLog, deletePeriodLog } = useCycleStore();
  const { t, i18n } = useTranslation();
  const isRTL = useIsRTL();
  const theme = useTheme();
  const locale = getDateFnsLocale(i18n.language);

  const [monthCursor, setMonthCursor] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Move mode: when set, the next calendar tap relocates the start of
  // the targeted log instead of opening the modal. A small banner at
  // the top is the only chrome that signals the mode.
  const [moveTargetLogId, setMoveTargetLogId] = useState<string | null>(null);
  // Themed confirm dialog provided globally via `useConfirm()` —
  // we no longer need local state for the dialog itself, just await
  // the user's choice in the handlers below.
  const confirm = useConfirm();

  const today = new Date();
  const stats = useMemo(() => getPeriodStats(periodLogs, today), [periodLogs]);
  // Currently in-progress (open) log, used by the "Annuler la période
  // en cours" reset button. Memoised so we don't rescan on every render.
  const openPeriod = useMemo(() => findOpenPeriod(periodLogs), [periodLogs]);

  // Map every day covered by a log to that day's specific render data.
  // Per-day intensity (v2.6+) means each cell uses its OWN color from
  // `log.intensities[dateKey]`, falling back to `log.intensity` for
  // legacy logs without a per-day map.
  const logsByDate = useMemo(() => {
    const map = new Map<
      string,
      { log: PeriodLog; isStart: boolean; intensity: PeriodLog['intensity'] }
    >();
    for (const log of periodLogs) {
      const startDay = new Date(log.startDate);
      let endDay = log.endDate ? new Date(log.endDate) : startDay;
      // Guard against stale data where endDate ended up before
      // startDate (shouldn't happen with the new helpers, but a v2.4.0
      // log written before these guards existed could be malformed).
      // eachDayOfInterval throws on a reversed range, which would crash
      // the whole screen — clamp to a single-day log instead.
      if (isAfter(startDay, endDay)) endDay = startDay;
      for (const d of eachDayOfInterval({ start: startDay, end: endDay })) {
        map.set(dateKey(d), {
          log,
          isStart: isSameDay(d, startDay),
          intensity: getIntensityForDay(log, d),
        });
      }
    }
    return map;
  }, [periodLogs]);

  const selectedEntry = selectedDate ? logsByDate.get(dateKey(selectedDate)) : undefined;
  const selectedLog = selectedEntry?.log;

  // ── Live capability flags for the modal's [+1j] / [-1j] buttons.
  // These are pure derivations from the live log via the helpers,
  // so the buttons grey out the instant the period reaches a boundary.
  const canExtend = !!selectedLog && extendPeriodEnd(selectedLog) !== null;
  const canShrink = !!selectedLog && shrinkPeriodEnd(selectedLog) !== null;

  // ── Guided flow state — recomputed from periodLogs every time the
  // selectedDate changes. Pure derivation, no extra state to keep in
  // sync. Drives the modal's title, sub-copy, and which actions show.
  const flowState: PeriodFlowState | null = useMemo(
    () => (selectedDate ? computePeriodFlowState(periodLogs, selectedDate) : null),
    [selectedDate, periodLogs],
  );

  // Month navigation — guard so we never go more than 24 months in the
  // future (no point predicting the prediction of the prediction) but
  // allow free backward scrubbing for history entry.
  const canGoForward = monthCursor < addMonths(today, 24);

  // Build the month grid. Standard ISO-week layout (Monday first), with
  // leading blanks padded so the first row starts on the right weekday.
  const grid = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = endOfMonth(monthCursor);
    const days = eachDayOfInterval({ start, end });
    // getDay returns 0=Sunday..6=Saturday; convert to 0=Monday..6=Sunday.
    const firstWeekday = (getDay(start) + 6) % 7;
    const padded: (Date | null)[] = [...Array(firstWeekday).fill(null), ...days];
    while (padded.length % COLS !== 0) padded.push(null);
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < padded.length; i += COLS) {
      rows.push(padded.slice(i, i + COLS));
    }
    return rows;
  }, [monthCursor]);

  // ── Per-day mutation + reset handlers — extracted to a pure hook
  // (src/components/periods/usePeriodActions.ts). It receives every
  // value the handlers close over and returns the handler functions
  // unchanged. Behavior is identical to the previous inline closures.
  const {
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
  } = usePeriodActions({
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
  });

  // The log currently being moved — used by the cell renderer to show
  // a pulsing outline so the user can locate the period being moved.
  const movingLog = moveTargetLogId
    ? periodLogs.find(l => l.id === moveTargetLogId) ?? null
    : null;

  // ── Summary card state machine ─────────────────────────────────────
  // The card at the top of the screen has 5 mutually-exclusive variants
  // depending on the user's current situation. Computing them in one
  // place makes the JSX trivial (one Animated.View, content driven by
  // `summaryCard`) and ensures the visual + copy + emoji always stay
  // in sync — no mismatch between "title says today, body says J-3".
  // The branch-by-branch logic lives in the pure `buildSummaryCard`
  // helper (src/components/periods/buildSummaryCard.ts).
  const summaryCard = buildSummaryCard(stats, today, locale, t, theme);

  // Subtle infinite pulse on the predicted-day cell. UI-thread driven
  // via Reanimated so it doesn't burn JS frames. Only used when the
  // prediction is in the future or today — past-prediction cells use
  // the static dashed border instead (the late banner draws attention).
  const predictedPulse = useSharedValue(0.4);
  React.useEffect(() => {
    if (summaryCard.variant === 'predFuture' || summaryCard.variant === 'predToday') {
      predictedPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      predictedPulse.value = withTiming(0.6, { duration: 200 });
    }
  }, [summaryCard.variant]);
  const predictedPulseStyle = useAnimatedStyle(() => ({ opacity: predictedPulse.value }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Move-mode banner — non-intrusive, sticky-feel at the top of
            the scroll. Hidden when no move is active. The dashed
            border + arrow icon match the cell highlight on the active
            log so the visual link is obvious. */}
        {moveTargetLogId && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.moveBanner, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]}
          >
            <Text style={[styles.moveBannerLabel, { color: theme.primaryDark }]}>
              {t('periodsMoveBanner', {
                defaultValue: '↔ Tape le nouveau jour de début',
              })}
            </Text>
            <Pressable onPress={cancelMove} hitSlop={8}>
              <Text style={[styles.moveBannerCancel, { color: theme.primaryDark }]}>
                {t('cancel', { defaultValue: 'Annuler' })}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Title row — saluting bird sits beside the title (mirrored
            in RTL languages so it always points "into" the title). */}
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
            <Image
              source={require('../assets/OrringBluePetNoBgSalute.png')}
              style={[styles.titlePet, isRTL && { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }, isRTL && styles.rtlText]}>
              {t('periodsTitle', { defaultValue: 'Mes périodes' })}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
            {t('periodsSubtitle', {
              defaultValue: 'Suivi serein, prédictions douces, rappels au bon moment.',
            })}
          </Text>
          {/* "Indépendant" explanation — collapsible to free vertical
              space once the user gets it. Owns its own open-state now
              (see PeriodsHelpCards). */}
          <IndependenceCard theme={theme} isRTL={isRTL} t={t} />
        </Animated.View>

        {/* Summary card + stats row — presentational blocks extracted
            to PeriodSummarySections. The summary card keeps its
            `key={variant}` remount-on-change behavior inside the
            component; the stats row hides itself when there's no data. */}
        <SummarySection summaryCard={summaryCard} />

        <StatsRow theme={theme} t={t} locale={locale} stats={stats} />

        {/* Calendar — month bar + grid extracted to PeriodCalendar.
            The predicted-day pulse style is forwarded so the animation
            stays wired to the summary card variant. */}
        <PeriodCalendar
          theme={theme}
          t={t}
          locale={locale}
          monthCursor={monthCursor}
          setMonthCursor={setMonthCursor}
          canGoForward={canGoForward}
          grid={grid}
          logsByDate={logsByDate}
          today={today}
          stats={stats}
          movingLog={movingLog}
          handleDayPress={handleDayPress}
          predictedPulseStyle={predictedPulseStyle}
        />

        {/* Legend — extracted to PeriodLegend (see
            PeriodSummarySections). */}
        <PeriodLegend theme={theme} t={t} />

        {/* How it works — compact illustrated steps. Owns its own
            open-state now (see PeriodsHelpCards). */}
        <HowItWorksCard theme={theme} isRTL={isRTL} t={t} />

        {/* Reset section — destructive, kept at the very bottom so it
            doesn't compete for attention. Each button triggers an
            Alert.alert confirm so accidental taps don't lose data.
            "Annuler la période en cours" only renders when there's
            something to cancel (live `openPeriod` derived from the
            store), keeping the section clean otherwise. */}
        {periodLogs.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(650).duration(500)}
            style={styles.resetSection}
          >
            {openPeriod && (
              <Pressable
                onPress={handleResetCurrentPeriod}
                style={({ pressed }) => [
                  styles.resetBtn,
                  styles.resetBtnSecondary,
                  pressed && { opacity: 0.55 },
                ]}
              >
                <Text style={[styles.resetBtnSecondaryLabel, { color: theme.textSecondary }]}>
                  ↩ {t('periodsResetCurrentBtn', { defaultValue: 'Annuler la période en cours' })}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleResetAllPeriods}
              style={({ pressed }) => [
                styles.resetBtn,
                styles.resetBtnDanger,
                pressed && { opacity: 0.55 },
              ]}
            >
              <Text style={styles.resetBtnDangerLabel}>
                🗑 {t('periodsResetAllBtn', { defaultValue: 'Effacer toutes mes périodes' })}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <PeriodLogModal
        visible={!!selectedDate}
        // The modal's "date" prop drives the headline date strip. In
        // EDITING we want the period's actual start (so the +1j / -1j
        // controls feel anchored), in every other state we show the
        // tapped day (= what the user is acting on right now).
        date={
          flowState?.kind === 'EDITING'
            ? new Date(flowState.log.startDate)
            : selectedDate
        }
        currentLog={selectedLog}
        currentIntensity={selectedLog?.intensity}
        flowState={flowState ?? undefined}
        onSelect={handleSelectIntensity}
        onRemove={handleRemove}
        onClose={() => setSelectedDate(null)}
        onExtendEnd={handleExtend}
        onShrinkEnd={handleShrink}
        onEndToday={handleEndToday}
        onReopen={handleReopen}
        onMove={handleStartMove}
        onEndAtDay={handleEndAtDay}
        canExtend={canExtend}
        canShrink={canShrink}
      />

      {/* Confirm dialog rendered globally by ConfirmProvider in
          _layout.tsx — handlers above call `confirm({...})` and
          await the user's choice. */}
    </SafeAreaView>
  );
}
