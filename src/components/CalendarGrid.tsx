import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { addMonths, subMonths, format, getDay, startOfMonth } from 'date-fns';
import { fr, enUS, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { getMonthDaysWithPeriods, CycleDay } from '../utils/cycle';
import { DayCell } from './DayCell';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, pt, de, ar, zh: zhCN, ja };
const WEEKDAYS_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;
const COLS = 7;

interface CalendarGridProps {
  firstInsertDate: Date | null;
  onDayPress?: (day: CycleDay) => void;
}

export function CalendarGrid({ firstInsertDate, onDayPress }: CalendarGridProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale = DATE_LOCALES[i18n.language] || fr;
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const days = useMemo(
    () => getMonthDaysWithPeriods(year, month, firstInsertDate, []),
    [year, month, firstInsertDate]
  );

  // Build explicit rows of 7 cells
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const rows = useMemo(() => {
    const allCells: (CycleDay | null)[] = [
      ...Array.from({ length: startPadding }, () => null),
      ...days,
    ];
    while (allCells.length % COLS !== 0) allCells.push(null);
    const result: (CycleDay | null)[][] = [];
    for (let i = 0; i < allCells.length; i += COLS) {
      result.push(allCells.slice(i, i + COLS));
    }
    return result;
  }, [startPadding, days]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale });

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.surface }]} entering={FadeInDown.duration(400)}>
      {/* Header navigation mois */}
      <View style={styles.header}>
        <Pressable
          onPress={() => setCurrentMonth(prev => subMonths(prev, 1))}
          style={[styles.navButton, { backgroundColor: theme.primaryLight }]}
        >
          <Text style={[styles.navText, { color: theme.primaryDark }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <Pressable
          onPress={() => setCurrentMonth(prev => addMonths(prev, 1))}
          style={[styles.navButton, { backgroundColor: theme.primaryLight }]}
        >
          <Text style={[styles.navText, { color: theme.primaryDark }]}>›</Text>
        </Pressable>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS_KEYS.map((key, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: theme.textSecondary }]}>{t(key)}</Text>
          </View>
        ))}
      </View>

      {/* Grille des jours - explicit rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.dayRow}>
          {row.map((cell, ci) => (
            cell ? (
              <DayCell
                key={cell.date.toISOString()}
                day={cell}
                onPress={onDayPress}
                index={ri * COLS + ci}
              />
            ) : (
              <View key={`e-${ri}-${ci}`} style={styles.emptyCell} />
            )
          ))}
        </View>
      ))}

      {/* Légende */}
      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        <LegendItem color={colors.ringIn} label={t('calGridRingInPlace')} />
        <LegendItem color={colors.ringOut} label={t('calGridPauseRules')} />
        <LegendItem color={colors.changeDay} label={t('calGridChange')} icon="⭕" />
      </View>
    </Animated.View>
  );
}

function LegendItem({ color, label, icon }: { color: string; label: string; icon?: string }) {
  return (
    <View style={styles.legendItem}>
      {icon ? (
        <Text style={styles.legendIcon}>{icon}</Text>
      ) : (
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      )}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  monthTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    marginTop: -2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    width: 44,
    alignItems: 'center',
    margin: 2,
  },
  weekdayText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  emptyCell: {
    width: 44,
    height: 44,
    margin: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendIcon: {
    fontSize: 12,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
