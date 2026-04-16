import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInRight } from 'react-native-reanimated';
import { addDays, isSameDay, startOfDay } from 'date-fns';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';
import { CycleRing } from '../src/components/CycleRing';
import { PeriodDayCell } from '../src/components/PeriodDayCell';
import { PeriodLogModal } from '../src/components/PeriodLogModal';
import { ActionButton } from '../src/components/ActionButton';
import { ConfirmActionModal } from '../src/components/ConfirmActionModal';
import { Onboarding } from '../src/components/Onboarding';
import { TempRemovalCountdown } from '../src/components/TempRemovalCountdown';
import {
  getCycleInfoFromLogs, formatDateFr, formatDateTimeFr,
  RING_IN_DAYS, RING_OUT_DAYS,
} from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';

// Time-based greeting
function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'greetingMorning';
  if (h >= 12 && h < 18) return 'greetingAfternoon';
  if (h >= 18 && h < 22) return 'greetingEvening';
  return 'greetingNight';
}

function getGreetingEmoji(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return '☀️';
  if (h >= 12 && h < 18) return '🌤️';
  if (h >= 18 && h < 22) return '🌇';
  return '🌙';
}

export default function MyCycleScreen() {
  const {
    firstInsertDate, ringStatus, cycleLogs, periodLogs,
    insertRing, removeRing, resetAll, userName, darkMode, startTempRemoval,
    addPeriodLog, updatePeriodLog, deletePeriodLog,
  } = useCycleStore();
  const { width } = useWindowDimensions();
  const [confirmAction, setConfirmAction] = useState<'insert' | 'remove' | null>(null);
  const [selectedPeriodDate, setSelectedPeriodDate] = useState<Date | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();

  const info = useMemo(
    () => firstInsertDate
      ? getCycleInfoFromLogs(new Date(firstInsertDate), cycleLogs, ringStatus)
      : null,
    [firstInsertDate, cycleLogs, ringStatus]
  );

  const isRingIn = ringStatus === 'in';
  const cycleStartKey = info?.ringInsertDate?.toISOString() ?? '';

  const pauseDays = useMemo(() => {
    if (!info) return [];
    const cycleStart = info.ringInsertDate;
    const today = startOfDay(new Date());
    return Array.from({ length: RING_OUT_DAYS }).map((_, i) => {
      const date = addDays(cycleStart, RING_IN_DAYS + i);
      const periodLog = periodLogs.find(p =>
        isSameDay(startOfDay(new Date(p.startDate)), startOfDay(date))
      );
      return {
        dayNumber: RING_IN_DAYS + i + 1,
        date,
        isToday: isSameDay(date, today),
        intensity: periodLog?.intensity,
        logId: periodLog?.id,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleStartKey, periodLogs]);

  const selectedPeriodInfo = selectedPeriodDate
    ? pauseDays.find(d => isSameDay(d.date, selectedPeriodDate))
    : null;

  // Show onboarding if no insert date (covers new users + reset users)
  if (!firstInsertDate || !info) {
    return <Onboarding onComplete={() => { /* state will re-render from store */ }} />;
  }

  const ringSize = Math.min(width - 60, 300);
  const nextActionLabel = info.nextAction === 'remove' ? t('removalAction') : t('insertionAction');

  const handleConfirmAction = (date: Date, options?: { temporary?: boolean; notify?: boolean }) => {
    if (confirmAction === 'insert') {
      insertRing(date.toISOString());
    } else if (confirmAction === 'remove') {
      if (options?.temporary) {
        startTempRemoval(options.notify ?? true);
      } else {
        removeRing(date.toISOString());
      }
    }
    setConfirmAction(null);
  };

  const handlePeriodSelect = (intensity: 'light' | 'normal' | 'heavy') => {
    if (!selectedPeriodDate) return;
    if (selectedPeriodInfo?.logId) {
      updatePeriodLog(selectedPeriodInfo.logId, { intensity });
    } else {
      addPeriodLog({ startDate: selectedPeriodDate.toISOString(), intensity });
    }
    setSelectedPeriodDate(null);
  };

  const handlePeriodRemove = () => {
    if (selectedPeriodInfo?.logId) deletePeriodLog(selectedPeriodInfo.logId);
    setSelectedPeriodDate(null);
  };

  const handleReset = () => {
    Alert.alert(
      t('resetTitle'),
      t('resetMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('restart'), style: 'destructive', onPress: resetAll },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: theme.primaryDark }]}>
                {getGreetingEmoji()} {t(getGreetingKey())}{userName ? `, ${userName}` : ''}
              </Text>
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                {formatDateFr(new Date(), 'EEEE dd MMMM')}
              </Text>
              <Text style={[styles.since, { color: theme.textLight }]}>
                {t('since', { date: formatDateFr(info.ringInsertDate, 'dd MMMM') })}
              </Text>
            </View>
            <TempRemovalCountdown />
          </View>
        </Animated.View>

        {/* Big cycle ring */}
        <Animated.View entering={FadeIn.delay(300).duration(1000)} style={styles.ringWrapper}>
          <CycleRing
            currentDay={info.currentDay}
            size={ringSize}
            isRingIn={isRingIn}
            phaseLabel={isRingIn ? t('ringInPlace') : t('pause')}
            daysLeft={info.daysUntilChange}
            nextAction={nextActionLabel}
          />
        </Animated.View>

        {/* Status pills */}
        <Animated.View entering={SlideInRight.delay(500).duration(500).springify()} style={styles.pillsRow}>
          <View style={[
            styles.pill,
            isRingIn
              ? { backgroundColor: darkMode ? 'rgba(158,198,164,0.18)' : colors.ringInLight }
              : { backgroundColor: darkMode ? 'rgba(181,165,226,0.18)' : colors.ringOutLight },
          ]}>
            <Text style={styles.pillEmoji}>{isRingIn ? '⭕' : '✋'}</Text>
            <Text style={[
              styles.pillText,
              { color: isRingIn
                  ? (darkMode ? '#9EC6A4' : '#4A6A4E')
                  : (darkMode ? '#C9BCEC' : '#8E5A77') },
            ]}>
              {isRingIn ? t('ringInPlace') : t('ringRemoved')}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: darkMode ? 'rgba(181,165,226,0.22)' : theme.primaryLight }]}>
            <Text style={styles.pillEmoji}>📅</Text>
            <Text style={[styles.pillText, { color: theme.primaryDark }]}>
              {t('dayXOf28', { day: info.currentDay })}
            </Text>
          </View>
        </Animated.View>

        {/* Action button — main interaction */}
        <Animated.View entering={FadeInUp.delay(600).duration(600).springify()}>
          <View style={styles.actionRow}>
            {isRingIn ? (
              <ActionButton
                icon="♻️"
                label={t('removedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={() => setConfirmAction('remove')}
              />
            ) : (
              <ActionButton
                icon="⭕"
                label={t('insertedRing')}
                color={darkMode ? theme.primary : theme.primaryDark}
                bgColor={darkMode ? 'rgba(181,165,226,0.18)' : theme.primarySoft}
                onPress={() => setConfirmAction('insert')}
              />
            )}
          </View>
        </Animated.View>

        {/* Explanation + key dates */}
        <Animated.View entering={FadeInUp.delay(800).duration(600).springify()} style={[styles.explainCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.explainTitle, { color: theme.text }]}>
            {isRingIn ? t('ringInPlaceExplain') : t('pauseExplain')}
          </Text>
          <Text style={[styles.explainBody, { color: theme.textSecondary }]}>
            {isRingIn
              ? t('ringInExplainBody', { day: info.currentDay, days: info.daysUntilChange })
              : t('pauseInProgressBody', { days: info.daysUntilChange })
            }
          </Text>
          {info.insertionDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }]}>
              ⭕ {t('insertedOn', { date: formatDateTimeFr(info.insertionDateTime) })}
            </Text>
          )}
          {info.removalDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }]}>
              ♻️ {t('removalShort')} : {formatDateTimeFr(info.removalDateTime)}
            </Text>
          )}
          {info.nextInsertionDateTime && (
            <Text style={[styles.dateDetail, { color: theme.text }]}>
              🔄 {t('nextCycle')} : {formatDateTimeFr(info.nextInsertionDateTime)}
            </Text>
          )}
        </Animated.View>

        {/* Period tracking */}
        <Animated.View entering={FadeInUp.delay(1000).duration(600).springify()} style={[styles.periodCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('periodTracking')}</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            {t('periodTrackingSub')}
          </Text>
          <View style={styles.periodGrid}>
            {pauseDays.map((day, i) => (
              <Animated.View key={day.dayNumber} entering={FadeInUp.delay(1100 + i * 60).duration(400).springify()}>
                <PeriodDayCell
                  dayNumber={day.dayNumber}
                  date={day.date}
                  intensity={day.intensity}
                  isToday={day.isToday}
                  onPress={() => setSelectedPeriodDate(day.date)}
                />
              </Animated.View>
            ))}
          </View>
          <View style={[styles.periodLegend, { borderTopColor: theme.border }]}>
            <LegendDot color="#FCDCE6" label={t('light')} textColor={theme.textSecondary} />
            <LegendDot color="#F4A0A0" label={t('normal')} textColor={theme.textSecondary} />
            <LegendDot color="#E87070" label={t('heavy')} textColor={theme.textSecondary} />
          </View>
        </Animated.View>

        {/* Reset link */}
        <Animated.View entering={FadeIn.delay(1200).duration(400)}>
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: theme.textLight }]}>
              🔄 {t('restartFromBeginning')}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <ConfirmActionModal
        visible={!!confirmAction}
        action={confirmAction || 'insert'}
        isEarly={confirmAction === 'remove' && info.currentDay < 21}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmAction(null)}
      />

      <PeriodLogModal
        visible={!!selectedPeriodDate}
        date={selectedPeriodDate}
        currentIntensity={selectedPeriodInfo?.intensity}
        onSelect={handlePeriodSelect}
        onRemove={handlePeriodRemove}
        onClose={() => setSelectedPeriodDate(null)}
      />
    </SafeAreaView>
  );
}

function LegendDot({ color, label, textColor }: { color: string; label: string; textColor?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, textColor ? { color: textColor } : undefined]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md },

  header: { marginBottom: spacing.sm },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  date: { fontSize: fontSize.md, marginTop: 2, textTransform: 'capitalize' },
  since: { fontSize: fontSize.sm, marginTop: 2, textTransform: 'capitalize' },

  ringWrapper: { marginVertical: spacing.lg, alignItems: 'center' },

  pillsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: borderRadius.full, gap: 6,
  },
  pillEmoji: { fontSize: 16 },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },

  explainCard: {
    borderRadius: borderRadius.xl, padding: spacing.lg,
    ...shadows.medium, marginBottom: spacing.lg,
  },
  explainTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 6 },
  explainBody: { fontSize: fontSize.md, lineHeight: 24 },
  dateDetail: { fontSize: fontSize.sm, marginTop: 6, textTransform: 'capitalize' },

  periodCard: {
    borderRadius: borderRadius.xl, padding: spacing.lg,
    ...shadows.medium,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sectionSub: { fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.md },
  periodGrid: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },

  periodLegend: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSize.xs },

  resetBtn: { alignItems: 'center', paddingVertical: spacing.md },
  resetText: { fontSize: fontSize.sm },
});
