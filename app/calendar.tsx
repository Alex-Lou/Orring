import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { addMonths, isSameMonth } from 'date-fns';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../src/theme';
import { MiniMonth } from '../src/components/MiniMonth';
import { CalendarGrid } from '../src/components/CalendarGrid';
import { DayNoteModal } from '../src/components/DayNoteModal';
import { getMonthDaysWithPeriods, getCycleInfoFromLogs, CycleDay, formatDateFr } from '../src/utils/cycle';
import { useCycleStore } from '../src/store/cycleStore';
import type { DayMark } from '../src/store/cycleStore';
import { useTheme } from '../src/theme/useTheme';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '../src/i18n/useIsRTL';

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const { firstInsertDate, periodLogs, dayNotes, saveDayNote, deleteDayNote, insertRing, removeRing, cycleLogs, ringStatus } = useCycleStore();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const { width } = useWindowDimensions();
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [editingDay, setEditingDay] = useState<CycleDay | null>(null);

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

  const months = useMemo(() => {
    const result: { year: number; month: number; days: CycleDay[]; isCurrentMonth: boolean }[] = [];
    for (let i = -3; i <= 8; i++) {
      const date = addMonths(today, i);
      const year = date.getFullYear();
      const month = date.getMonth();
      result.push({
        year, month,
        days: getMonthDaysWithPeriods(year, month, insertDate, periodLogs),
        isCurrentMonth: isSameMonth(date, today),
      });
    }
    return result;
  }, [firstInsertDate, periodLogs]);

  // Get note for currently editing day
  const editingDayKey = editingDay ? toDateKey(editingDay.date) : '';
  const editingNote = dayNotes.find(n => n.dateKey === editingDayKey);

  const handleSaveNote = useCallback((text: string, marks: DayMark[]) => {
    if (editingDay) {
      saveDayNote(toDateKey(editingDay.date), text, marks);
      setEditingDay(null);
    }
  }, [editingDay, saveDayNote]);

  const handleDeleteNote = useCallback(() => {
    if (editingDay) {
      deleteDayNote(toDateKey(editingDay.date));
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
