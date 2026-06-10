import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { isSameMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';
import { MiniMonth } from '../src/components/MiniMonth';
import { CalendarGrid } from '../src/components/CalendarGrid';
import { DayNoteModal } from '../src/components/DayNoteModal';
import { getMonthDaysWithPeriods, getCycleInfoFromLogs, CycleDay } from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import type { DayMark } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';
import { dateKey } from '../src/utils/dateKey';

export default function CalendarScreen() {
  const { firstInsertDate, periodLogs, dayNotes, saveDayNote, deleteDayNote, insertRing, removeRing, cycleLogs, ringStatus } = useCycleStore();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { width } = useWindowDimensions();
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [editingDay, setEditingDay] = useState<CycleDay | null>(null);
  // v2.6.5: year-cursor navigation — replaces the fixed -3..+8 month
  // sliding window. The user can scroll back across years to consult
  // notes / moods from any past month, and forward to anticipate.
  // Default lands on today's year; the "Aujourd'hui" pill jumps back
  // when the cursor has drifted away.
  const [yearCursor, setYearCursor] = useState<number>(() => new Date().getFullYear());

  const theme = useTheme();
  const insertDate = firstInsertDate ? new Date(firstInsertDate) : null;
  const cycleInfo = useMemo(
    () => firstInsertDate ? getCycleInfoFromLogs(new Date(firstInsertDate), cycleLogs, ringStatus) : null,
    [firstInsertDate, cycleLogs, ringStatus]
  );
  const today = new Date();

  const numColumns = width > 600 ? 3 : 2;
  const gap = spacing.sm;
  const cardWidth = (width - spacing.lg * 2 - gap * (numColumns - 1)) / numColumns;

  // Set of dateKeys that have notes for fast lookup
  const noteDates = useMemo(
    () => new Set(dayNotes.map(n => n.dateKey)),
    [dayNotes]
  );

  // Render the FULL year (12 months, Jan → Dec) of the active
  // `yearCursor`. Past years stay browseable indefinitely so any
  // saved note / mood from years back stays accessible. Future
  // years also work for forward planning, but the prediction-only
  // months are styled by `getMonthDaysWithPeriods` based on the
  // single insertion-date anchor — no extra data is fabricated.
  const months = useMemo(() => {
    const result: { year: number; month: number; days: CycleDay[]; isCurrentMonth: boolean }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(yearCursor, m, 1);
      result.push({
        year: yearCursor,
        month: m,
        days: getMonthDaysWithPeriods(yearCursor, m, insertDate, periodLogs, cycleLogs),
        isCurrentMonth: isSameMonth(monthDate, today),
      });
    }
    return result;
  }, [yearCursor, firstInsertDate, periodLogs, cycleLogs]);

  const todayYear = today.getFullYear();
  const isOnTodayYear = yearCursor === todayYear;

  // Get note for currently editing day
  const editingDayKey = editingDay ? dateKey(editingDay.date) : '';
  const editingNote = dayNotes.find(n => n.dateKey === editingDayKey);

  const handleSaveNote = useCallback((text: string, marks: DayMark[]) => {
    if (editingDay) {
      saveDayNote(dateKey(editingDay.date), text, marks);
      setEditingDay(null);
    }
  }, [editingDay, saveDayNote]);

  const handleDeleteNote = useCallback(() => {
    if (editingDay) {
      deleteDayNote(dateKey(editingDay.date));
      setEditingDay(null);
    }
  }, [editingDay, deleteDayNote]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600).springify()}>
          <View style={[styles.titleRow, isRTL && styles.rtlRow]}>
            <Image
              source={require('../assets/OrringBluePetNoBgSalute.png')}
              style={[
                styles.titlePet,
                // In LTR the bird sits on the LEFT of the title and points
                // right (natural pose) toward the text. In RTL row-reverse
                // puts it visually on the right of the title, so we flip it
                // so it still points AT the title.
                isRTL && { transform: [{ scaleX: -1 }] },
              ]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: theme.text }]}>{t('calendar')}</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('calendarSub')}</Text>
        </Animated.View>

        {/* Legend */}
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={[styles.legend, { backgroundColor: theme.surface }]}>
          <LegendItem color="#E8F5E8" label={t('legendRing')} textColor={theme.textSecondary} />
          <LegendItem color="#FDE8E8" label={t('legendPause')} textColor={theme.textSecondary} />
          <LegendItem color="#DBEAFE" label={t('legendInsert')} textColor={theme.textSecondary} />
          <LegendItem color="#FEF3C7" label={t('legendRemove')} textColor={theme.textSecondary} />
        </Animated.View>

        {/* Year navigation — sits between the legend and the grid.
            Compact pill with prev/next arrows + a "Aujourd'hui"
            shortcut that appears only when the cursor has moved off
            the real today's year. */}
        {insertDate && (
          <View style={[styles.yearBar, { backgroundColor: theme.surface }]}>
            <Pressable
              onPress={() => setYearCursor(y => y - 1)}
              hitSlop={8}
              style={({ pressed }) => [styles.yearArrow, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={theme.primaryDark} />
            </Pressable>
            <View style={styles.yearLabelBox}>
              <Text style={[styles.yearLabel, { color: theme.text }]}>{yearCursor}</Text>
              {!isOnTodayYear && (
                <Pressable
                  onPress={() => setYearCursor(todayYear)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.yearTodayPill,
                    { backgroundColor: theme.primarySoft },
                    pressed && { opacity: 0.55 },
                  ]}
                >
                  <Text style={[styles.yearTodayText, { color: theme.primaryDark }]}>
                    {t('today', { defaultValue: "Aujourd'hui" })}
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => setYearCursor(y => y + 1)}
              hitSlop={8}
              style={({ pressed }) => [styles.yearArrow, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.primaryDark} />
            </Pressable>
          </View>
        )}

        {insertDate ? (
          <View style={[styles.grid, { gap }]}>
            {months.map((m, index) => (
              <View key={`${m.year}-${m.month}`} style={{ width: cardWidth }}>
                <MiniMonth
                  year={m.year}
                  month={m.month}
                  days={m.days}
                  isCurrentMonth={m.isCurrentMonth}
                  index={index}
                  noteDates={noteDates}
                  onDayPress={setEditingDay}
                  onMonthPress={() => setSelectedMonth({ year: m.year, month: m.month })}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('configureStartCalendar')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Full month modal */}
      <Modal visible={!!selectedMonth} transparent animationType="slide" onRequestClose={() => setSelectedMonth(null)}>
        <View style={[styles.modalBg, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable style={styles.modalBack} onPress={() => setSelectedMonth(null)}>
                <Text style={[styles.modalBackText, { color: theme.primaryDark }]}>← {t('backButton')}</Text>
              </Pressable>
            </View>
            {selectedMonth && insertDate && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <CalendarGrid firstInsertDate={insertDate} onDayPress={setEditingDay} />
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Day note editor modal */}
      <DayNoteModal
        visible={!!editingDay}
        date={editingDay?.date || null}
        dayStatus={editingDay?.status || 'none'}
        dayInCycle={editingDay?.dayInCycle || 0}
        currentText={editingNote?.text || ''}
        currentMarks={(editingNote?.marks || []) as DayMark[]}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        onClose={() => setEditingDay(null)}
        onRingAction={(action, date) => {
          if (action === 'insert') insertRing(date.toISOString());
          else removeRing(date.toISOString());
          setEditingDay(null);
        }}
        actionDateTime={
          editingDay?.status === 'insert_day' ? cycleInfo?.insertionDateTime ?? cycleInfo?.nextInsertionDateTime :
          editingDay?.status === 'remove_day' ? cycleInfo?.removalDateTime :
          null
        }
      />
    </SafeAreaView>
  );
}

function LegendItem({ color, label, textColor }: { color: string; label: string; textColor?: string }) {
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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rtlRow: { flexDirection: 'row-reverse' },
  titlePet: {
    width: 42,
    height: 42,
  },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },

  legend: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingVertical: 10, paddingHorizontal: spacing.md,
    ...shadows.soft, marginBottom: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  yearArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  yearLabelBox: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  yearLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.black, letterSpacing: -0.3 },
  yearTodayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  yearTodayText: { fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 0.3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },

  modalBg: { flex: 1, backgroundColor: colors.background },
  modalSafe: { flex: 1 },
  modalHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalBack: { paddingVertical: spacing.xs },
  modalBackText: { fontSize: fontSize.md, color: colors.primaryDark, fontWeight: fontWeight.bold },
  modalBody: { padding: spacing.lg },
});
