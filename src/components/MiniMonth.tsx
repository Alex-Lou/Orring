import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { getDay, startOfMonth, format } from 'date-fns';
import { fr, enUS, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';
import { colors, spacing, fontWeight, borderRadius, shadows } from '../theme';
import { CycleDay, DayStatus, getStatusLabel } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, pt, de, ar, zh: zhCN, ja };

interface MiniMonthProps {
  year: number;
  month: number;
  days: CycleDay[];
  onDayPress: (day: CycleDay) => void;
  onMonthPress: () => void;
  index: number;
  isCurrentMonth: boolean;
  noteDates?: Set<string>;
}

const WEEKDAYS_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;
const COLS = 7;

// Code couleur clair et distinct pour tous les statuts
const STATUS_COLORS: Record<DayStatus, { bg: string; text: string }> = {
  insert_day: { bg: '#DBEAFE', text: '#1E40AF' },
  remove_day: { bg: '#FEF3C7', text: '#92400E' },
  ring_in:    { bg: '#E8F5E8', text: '#2E7D32' },
  ring_out:   { bg: '#FDE8E8', text: '#B71C1C' },
  none:       { bg: 'transparent', text: '#B0B0BC' },
};

function getCellStyle(status: DayStatus, hasPeriod: boolean) {
  if (hasPeriod) return { bg: '#F4A0A0', text: '#FFF' };
  return STATUS_COLORS[status] || STATUS_COLORS.none;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const MiniMonth = React.memo(function MiniMonth({
  year, month, days, onDayPress, onMonthPress, index, isCurrentMonth, noteDates = new Set<string>(),
}: MiniMonthProps) {
  const [tooltip, setTooltip] = useState<{ text: string; index: number } | null>(null);
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const locale = DATE_LOCALES[i18n.language] || fr;
  const monthDate = new Date(year, month, 1);
  const monthLabel = format(monthDate, 'MMMM', { locale });
  const yearLabel = format(monthDate, 'yyyy');
  const firstDayOfWeek = getDay(startOfMonth(monthDate));
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Build explicit rows of 7 cells to avoid flexWrap rounding bugs
  const rows = useMemo(() => {
    const allCells: (CycleDay | null)[] = [
      ...Array.from({ length: startPadding }, () => null),
      ...days,
    ];
    // Pad the last row to 7 cells
    while (allCells.length % COLS !== 0) allCells.push(null);
    const result: (CycleDay | null)[][] = [];
    for (let i = 0; i < allCells.length; i += COLS) {
      result.push(allCells.slice(i, i + COLS));
    }
    return result;
  }, [startPadding, days]);

  const handleDayPress = (day: CycleDay, idx: number) => {
    if (day.status !== 'none') {
      setTooltip({ text: getStatusLabel(day.status), index: idx });
      setTimeout(() => setTooltip(null), 1500);
    }
    onDayPress(day);
  };

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(400).springify().damping(18)}>
      <View style={[styles.card, { backgroundColor: theme.surface }, isCurrentMonth && [styles.currentCard, { borderColor: theme.primary, backgroundColor: theme.primarySoft }]]}>
        {/* Month header */}
        <Pressable onPress={onMonthPress} style={styles.header}>
          <Text style={[styles.monthLabel, { color: theme.text }, isCurrentMonth && { color: theme.primaryDark }]}>
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </Text>
          <Text style={[styles.yearLabel, { color: theme.textLight }]}>{yearLabel}</Text>
        </Pressable>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS_KEYS.map((key, i) => (
            <View key={i} style={styles.weekCell}>
              <Text style={[styles.weekDay, { color: theme.textLight }]}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Day grid - explicit rows for correct layout */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={`e-${ri}-${ci}`} style={styles.cellWrapper} />;

              const globalIdx = ri * COLS + ci - startPadding;
              const { bg, text } = getCellStyle(cell.status, !!cell.periodIntensity);
              const hasNote = noteDates.has(toDateKey(cell.date));
              const isAction = cell.status === 'insert_day' || cell.status === 'remove_day';
              const showTooltip = tooltip?.index === globalIdx;

              return (
                <View key={`d-${ri}-${ci}`} style={styles.cellWrapper}>
                  {showTooltip && (
                    <Animated.View entering={FadeIn.duration(200)} style={[styles.tooltip, { backgroundColor: theme.text }]}>
                      <Text style={styles.tooltipText}>{tooltip.text}</Text>
                    </Animated.View>
                  )}
                  <Pressable
                    onPress={() => handleDayPress(cell, globalIdx)}
                    style={({ pressed }) => [
                      styles.cell,
                      { backgroundColor: bg },
                      cell.isToday && styles.todayCell,
                      isAction && styles.actionCell,
                      isAction && { borderColor: text },
                      pressed && styles.cellPressed,
                    ]}
                  >
                    {isAction ? (
                      cell.status === 'insert_day' ? (
                        <Image source={require('../../assets/OrringLogo.png')} style={styles.actionLogo} />
                      ) : (
                        <Text style={styles.actionEmoji}>✋</Text>
                      )
                    ) : (
                      <Text style={[
                        styles.dayNum,
                        { color: text },
                        cell.isToday && styles.todayText,
                      ]}>
                        {cell.date.getDate()}
                      </Text>
                    )}
                    {hasNote && <View style={[styles.noteDot, { backgroundColor: theme.primaryDark }]} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 3,
    ...shadows.soft,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  currentCard: {
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  yearLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDay: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
  row: {
    flexDirection: 'row',
  },
  cellWrapper: {
    flex: 1,
    position: 'relative',
  },
  cell: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    position: 'relative',
  },
  cellPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
  },
  dayNum: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  todayCell: {
    backgroundColor: colors.primaryDark,
    borderRadius: 7,
  },
  todayText: {
    color: '#FFF',
    fontWeight: fontWeight.black,
  },
  actionCell: {
    borderRadius: 7,
    borderWidth: 1.5,
  },
  actionLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  actionEmoji: {
    fontSize: 10,
  },
  noteDot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tooltip: {
    position: 'absolute',
    top: -22,
    left: -10,
    right: -10,
    zIndex: 10,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
