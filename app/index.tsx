import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';
import { RingProgress } from '../src/components/RingProgress';
import { StatusBadge } from '../src/components/StatusBadge';
import { ActionButton } from '../src/components/ActionButton';
import { ConfirmActionModal } from '../src/components/ConfirmActionModal';
import { Onboarding } from '../src/components/Onboarding';
import { TempRemovalCountdown } from '../src/components/TempRemovalCountdown';
import { getCycleInfoFromLogs, formatDateFr, formatDateTimeFr, getStatusLabel, getStatusEmoji } from '../src/utils/cycle';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export default function HomeScreen() {
  const { firstInsertDate, ringStatus, cycleLogs, insertRing, removeRing, resetAll, userName, darkMode, startTempRemoval } = useCycleStore();
  const { width } = useWindowDimensions();
  const [confirmAction, setConfirmAction] = useState<'insert' | 'remove' | null>(null);
  const { t } = useTranslation();

  const info = useMemo(
    () => firstInsertDate
      ? getCycleInfoFromLogs(new Date(firstInsertDate), cycleLogs, ringStatus)
      : null,
    [firstInsertDate, cycleLogs, ringStatus]
  );

  const theme = useTheme();

  // Show onboarding if no insert date (covers new users + reset users)
  if (!firstInsertDate || !info) {
    return <Onboarding onComplete={() => { /* state will re-render from store */ }} />;
  }

  const isRingIn = ringStatus === 'in';
  const ringSize = Math.min(width - 80, 260);

  const handleConfirmAction = (date: Date, options?: { temporary?: boolean; notify?: boolean }) => {
    if (confirmAction === 'insert') {
      insertRing(date.toISOString());
    } else if (confirmAction === 'remove') {
      if (options?.temporary) {
        // Retrait temporaire (<3h) : démarre le timer 3h, éventuellement avec notif
        startTempRemoval(options.notify ?? true);
      } else {
        removeRing(date.toISOString());
      }
    }
    setConfirmAction(null);
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
                {t(getGreetingKey())}{userName ? `, ${userName}` : ''}
              </Text>
              <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDateFr(new Date(), 'EEEE dd MMMM')}</Text>
            </View>
            <TempRemovalCountdown />
          </View>
        </Animated.View>

        {/* Status Badge — always show ring status, not day-specific action */}
        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <StatusBadge
            status={isRingIn ? 'ring_in' : 'ring_out'}
            label={isRingIn ? `✅ ${t('ringInPlace')}` : `🩸 ${t('ringRemoved')}`}
          />
        </Animated.View>

        {/* Ring Progress */}
        <Animated.View entering={FadeIn.delay(400).duration(1000)} style={styles.ringContainer}>
          <RingProgress
            progress={info.progress}
            size={ringSize}
            isRingIn={isRingIn}
            centerText={`J${info.currentDay}`}
            subText={isRingIn ? t('onDayOf21') : t('onDayOf7')}
            daysLeft={info.daysUntilChange}
            actionLabel={t('daysBeforeActionLabel', {
              action: info.nextAction === 'remove' ? t('removalAction') : t('insertionAction'),
            })}
          />
        </Animated.View>

        {/* Action Button */}
        <Animated.View entering={FadeInUp.delay(600).duration(600).springify()}>
          <View style={styles.actionRow}>
            {ringStatus === 'in' ? (
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

        {/* Dates info */}
        <Animated.View entering={FadeIn.delay(800).duration(400)} style={[styles.datesCard, { backgroundColor: theme.surface }]}>
          {info.insertionDateTime && (
            <Text style={[styles.dateInfoText, { color: theme.text }]}>
              ⭕ {t('insertedOn', { date: formatDateTimeFr(info.insertionDateTime) })}
            </Text>
          )}
          {info.removalDateTime && isRingIn && (
            <Text style={[styles.dateInfoText, { color: theme.text }]}>
              ♻️ {t('removalPlannedOn', { date: formatDateTimeFr(info.removalDateTime) })}
            </Text>
          )}
          {info.nextInsertionDateTime && !isRingIn && (
            <Text style={[styles.dateInfoText, { color: theme.text }]}>
              ⭕ {t('nextInsertionOn', { date: formatDateTimeFr(info.nextInsertionDateTime) })}
            </Text>
          )}
        </Animated.View>

        {/* Reset button */}
        <Animated.View entering={FadeIn.delay(1000).duration(400)}>
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: theme.textLight }]}>🔄 {t('restartFromBeginning')}</Text>
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
    </SafeAreaView>
  );
}

function OnboardingPrompt() {
  const { insertRing } = useCycleStore();
  const { t } = useTranslation();
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedHour, setSelectedHour] = useState(9);

  const year = pickerDate.getFullYear();
  const month = pickerDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startPad = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const today = new Date();

  const monthLabel = formatDateFr(pickerDate, 'MMMM yyyy');

  const handleConfirmInsertion = () => {
    let d: Date;
    if (selectedDay === null || selectedDay === -1) {
      // "Aujourd'hui"
      d = new Date();
    } else {
      d = new Date(year, month, selectedDay);
    }
    d.setHours(selectedHour, 0, 0, 0);
    insertRing(d.toISOString());
  };

  const prevMonth = () => setPickerDate(new Date(year, month - 1, 1));
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (next <= today) setPickerDate(next);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.onboarding, { backgroundColor: theme.background }]}>
        <Animated.View entering={FadeInDown.duration(1000).springify()} style={[styles.onboardingCard, { backgroundColor: theme.surface }]}>
          <Animated.Image entering={FadeIn.delay(300).duration(800)} source={require('../assets/OrringLogo.png')} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 14 }} />
          <Animated.Text entering={FadeInUp.delay(500).duration(600)} style={[styles.onboardingTitle, { color: theme.primaryDark }]}>
            {t('appName')}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(700).duration(600)} style={[styles.onboardingSub, { color: theme.textSecondary }]}>
            {t('welcomeSub')}
          </Animated.Text>

          {!showPicker && selectedDay === null ? (
            <Animated.View entering={FadeInUp.delay(900).duration(500).springify()} style={{ width: '100%' }}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={() => { setSelectedDay(-1); /* -1 = today */ }}
              >
                <Text style={styles.primaryBtnText}>⭕ {t('today')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                onPress={() => setShowPicker(true)}
              >
                <Text style={styles.secondaryBtnText}>📅 {t('chooseDate')}</Text>
              </Pressable>
            </Animated.View>
          ) : showPicker && selectedDay === null ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.pickerContainer}>
              <Text style={styles.pickerHint}>{t('whenInsertedQuestion')}</Text>

              <View style={styles.pickerNav}>
                <Pressable onPress={prevMonth} style={styles.pickerNavBtn}>
                  <Text style={styles.pickerNavText}>‹</Text>
                </Pressable>
                <Text style={styles.pickerMonth}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
                <Pressable onPress={nextMonth} style={styles.pickerNavBtn}>
                  <Text style={styles.pickerNavText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.pickerWeekRow}>
                {(['weekdayMon','weekdayTue','weekdayWed','weekdayThu','weekdayFri','weekdaySat','weekdaySun'] as const).map((key, i) => (
                  <Text key={i} style={styles.pickerWeekDay}>{t(key)}</Text>
                ))}
              </View>

              <View style={styles.pickerGrid}>
                {Array.from({ length: startPad }).map((_, i) => (
                  <View key={`p${i}`} style={styles.pickerCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const isFuture = date > today;
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  return (
                    <Pressable
                      key={day}
                      disabled={isFuture}
                      onPress={() => setSelectedDay(day)}
                      style={({ pressed }) => [
                        styles.pickerCell,
                        isToday && styles.pickerToday,
                        isFuture && styles.pickerFuture,
                        pressed && !isFuture && styles.pickerPressed,
                      ]}
                    >
                      <Text style={[
                        styles.pickerDayText,
                        isToday && styles.pickerTodayText,
                        isFuture && styles.pickerFutureText,
                      ]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.secondaryBtnText}>{t('cancel')}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            /* Hour selection step — native time picker */
            <Animated.View entering={FadeIn.duration(400)} style={styles.pickerContainer}>
              <Text style={styles.pickerHint}>
                {selectedDay === -1 ? t('todayDateLabel') : t('theDateOf', { day: selectedDay, month: monthLabel })}
                {' — ' + t('atWhatTime')}
              </Text>
              <DateTimePicker
                value={(() => { const d = new Date(); d.setHours(selectedHour, 0, 0, 0); return d; })()}
                mode="time"
                display="spinner"
                is24Hour={true}
                onChange={(_, date) => {
                  if (date) setSelectedHour(date.getHours());
                }}
                style={{ height: 150, marginBottom: 10 }}
              />
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
                onPress={handleConfirmInsertion}
              >
                <Text style={styles.primaryBtnText}>✅ {t('confirm')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                onPress={() => { setSelectedDay(null); setShowPicker(false); }}
              >
                <Text style={styles.secondaryBtnText}>← {t('back')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.primaryDark, letterSpacing: -0.5 },
  date: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },

  ringContainer: { alignItems: 'center', marginVertical: spacing.md },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },

  datesCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.soft },
  dateInfoText: { fontSize: fontSize.sm, color: colors.text, marginBottom: 4, textTransform: 'capitalize' },

  testBtn: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, backgroundColor: colors.primaryLight, borderRadius: borderRadius.full, marginBottom: spacing.sm, alignSelf: 'center' },
  testBtnText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.semibold },
  resetBtn: { alignItems: 'center', paddingVertical: spacing.md },
  resetText: { fontSize: fontSize.sm, color: colors.textLight },

  onboarding: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.background },
  onboardingCard: {
    alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.xl, width: '100%', ...shadows.strong,
  },
  onboardingEmoji: { fontSize: 80, marginBottom: spacing.md },
  onboardingTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.primaryDark, textAlign: 'center' },
  onboardingSub: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 24 },
  onboardingDesc: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: borderRadius.full, marginTop: spacing.lg, alignItems: 'center',
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  secondaryBtn: { paddingVertical: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  secondaryBtnText: { color: colors.primaryDark, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },

  // Date picker
  pickerContainer: { width: '100%', marginTop: spacing.md },
  pickerHint: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: spacing.md },
  pickerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  pickerNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pickerNavText: { fontSize: 22, color: colors.primaryDark, fontWeight: fontWeight.bold, marginTop: -2 },
  pickerMonth: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, textTransform: 'capitalize' },
  pickerWeekRow: { flexDirection: 'row', marginBottom: 4 },
  pickerWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: fontWeight.bold, color: colors.textLight },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerCell: { width: '14.28%' as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  pickerDayText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  pickerToday: { backgroundColor: colors.primaryDark, borderRadius: 10 },
  pickerTodayText: { color: '#FFF', fontWeight: fontWeight.bold },
  pickerFuture: { opacity: 0.25 },
  pickerFutureText: { color: colors.textLight },
  pickerPressed: { backgroundColor: colors.primaryLight, borderRadius: 10 },

  // Hour grid
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg },
  hourBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.full, backgroundColor: colors.surfaceElevated, borderWidth: 1.5, borderColor: 'transparent' },
  hourBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  hourBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  hourBtnTextActive: { color: colors.primaryDark, fontWeight: fontWeight.bold },
});
