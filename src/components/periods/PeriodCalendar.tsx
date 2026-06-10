/**
 * Month bar + calendar grid for the "Mes périodes" screen
 * (app/periods.tsx).
 *
 * Pure relocation of the calendar JSX that used to live inline in
 * PeriodsScreen — the month navigation bar, the weekday header, and the
 * day-cell grid (including the per-day intensity colors, the predicted-day
 * pulse, the today/moving borders, and the start-of-period dot). Every
 * value the JSX read is now a prop; nothing about the markup, the
 * conditions, the animations, or the styles changed.
 *
 * The predicted-day pulse is driven by a Reanimated `useAnimatedStyle`
 * value that still lives in the screen (so it stays wired to the summary
 * card variant); it is forwarded here as `predictedPulseStyle` and applied
 * to the same `Animated.View` it was applied to before — identical render.
 *
 * `INTENSITY_BG` / `INTENSITY_TEXT` live here now (the calendar is their
 * primary consumer) and are re-exported so the screen's legend keeps using
 * the exact same swatch colors from a single source of truth.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { addMonths, format, isAfter, isSameDay, isSameMonth } from 'date-fns';
import { dateKey } from '../../utils/dateKey';
import { fontWeight } from '../../theme';
import { isDayInPeriod } from '../../utils/periods';
import type { PeriodStats } from '../../utils/periods';
import type { PeriodLog } from '../../store/cycleStore';
import type { useTheme } from '../../theme/useTheme';
import type { useTranslation } from 'react-i18next';
import { styles } from '../../../app/periods.styles';

// Day-cell color per intensity. Kept consistent with PeriodLogModal so
// users see the same swatch in the modal preview and the calendar.
export const INTENSITY_BG: Record<PeriodLog['intensity'], string> = {
  light: '#FCDCE6',
  normal: '#F4A0A0',
  heavy: '#E87070',
};
export const INTENSITY_TEXT: Record<PeriodLog['intensity'], string> = {
  light: '#A8324A',
  normal: '#FFFFFF',
  heavy: '#FFFFFF',
};

type Theme = ReturnType<typeof useTheme>;
type T = ReturnType<typeof useTranslation>['t'];

type LogsByDate = Map<
  string,
  { log: PeriodLog; isStart: boolean; intensity: PeriodLog['intensity'] }
>;

export function PeriodCalendar({
  theme,
  t,
  locale,
  monthCursor,
  setMonthCursor,
  canGoForward,
  grid,
  logsByDate,
  today,
  stats,
  movingLog,
  handleDayPress,
  predictedPulseStyle,
}: {
  theme: Theme;
  t: T;
  // `getDateFnsLocale` returns `any` — mirror it so callers pass through.
  locale: any;
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  canGoForward: boolean;
  grid: (Date | null)[][];
  logsByDate: LogsByDate;
  today: Date;
  stats: PeriodStats;
  movingLog: PeriodLog | null;
  handleDayPress: (d: Date) => void;
  // Forwarded Reanimated animated style (opacity pulse). Applied verbatim
  // to the predicted-day fill — kept as `any` since it's just passed into
  // a style array, exactly as before.
  predictedPulseStyle: any;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(350).duration(500)}>
      <View style={[styles.monthBar, { backgroundColor: theme.surface }]}>
        <Pressable
          onPress={() => setMonthCursor(addMonths(monthCursor, -1))}
          style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.5 }]}
          hitSlop={8}
        >
          <Text style={[styles.monthBtnLabel, { color: theme.primaryDark }]}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {format(monthCursor, 'MMMM yyyy', { locale })
              .replace(/^\w/, c => c.toUpperCase())}
          </Text>
        </View>
        <Pressable
          onPress={() => canGoForward && setMonthCursor(addMonths(monthCursor, 1))}
          style={({ pressed }) => [
            styles.monthBtn,
            pressed && { opacity: 0.5 },
            !canGoForward && { opacity: 0.25 },
          ]}
          hitSlop={8}
        >
          <Text style={[styles.monthBtnLabel, { color: theme.primaryDark }]}>›</Text>
        </Pressable>
      </View>

      {/* Calendar grid */}
      <View style={[styles.gridCard, { backgroundColor: theme.surface }]}>
        {/* Weekday header */}
        <View style={styles.weekHeader}>
          {(['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const).map(k => (
            <View key={k} style={styles.weekCell}>
              <Text style={[styles.weekLabel, { color: theme.textLight }]}>{t(k)}</Text>
            </View>
          ))}
        </View>

        {grid.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((day, ci) => {
              if (!day) return <View key={`e-${ri}-${ci}`} style={styles.cellWrapper} />;
              const entry = logsByDate.get(dateKey(day));
              const log = entry?.log;
              const isLogStart = entry?.isStart === true;
              const isToday = isSameDay(day, today);
              const isPredicted = stats.nextStart && isSameDay(day, stats.nextStart);
              const isFuture = isAfter(day, today) && !isToday;
              const inMonth = isSameMonth(day, monthCursor);
              // Cell belongs to the log currently being moved → render
              // a dashed accent border so the user can see which
              // period they're moving while looking for a target.
              const isMovingLogCell = movingLog ? isDayInPeriod(movingLog, day) : false;

              // v2.6: each day uses its own per-day intensity, so
              // a [heavy, normal, light] period reads as a real
              // gradient on the calendar instead of one flat hue.
              const dayIntensity = entry?.intensity;
              const bg = dayIntensity
                ? INTENSITY_BG[dayIntensity]
                : isPredicted
                  ? 'rgba(232,112,112,0.18)'
                  : 'transparent';
              const txt = dayIntensity
                ? INTENSITY_TEXT[dayIntensity]
                : isFuture
                  ? theme.textLight
                  : theme.text;

              return (
                <View key={`d-${ri}-${ci}`} style={styles.cellWrapper}>
                  <Pressable
                    onPress={() => handleDayPress(day)}
                    disabled={isFuture}
                    style={({ pressed }) => [
                      styles.cell,
                      { backgroundColor: bg },
                      isToday && [styles.cellToday, { borderColor: theme.primaryDark }],
                      isPredicted && !log && styles.cellPredicted,
                      isMovingLogCell && styles.cellMoving,
                      pressed && { opacity: 0.55, transform: [{ scale: 0.92 }] },
                    ]}
                  >
                    {/* Soft cranberry pulse fill on the predicted
                        day — UI-thread driven via Reanimated, only
                        active for future / today predictions. Sits
                        UNDER the digit so the number stays sharp. */}
                    {isPredicted && !log && (
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.cellPredictedPulse, predictedPulseStyle]}
                      />
                    )}
                    <Text
                      style={[
                        styles.cellText,
                        {
                          color: txt,
                          opacity: inMonth ? 1 : 0.35,
                          fontWeight: log || isToday ? fontWeight.bold : fontWeight.medium,
                        },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {/* Dot only on the START day of a period — the
                        other days of a multi-day range get the
                        intensity background tint without the marker. */}
                    {isLogStart && <View style={[styles.cellDot, { backgroundColor: txt }]} />}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
