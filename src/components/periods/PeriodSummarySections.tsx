/**
 * The summary card + the stats row for the "Mes périodes" screen
 * (app/periods.tsx).
 *
 * Pure relocation of two adjacent presentational blocks from
 * PeriodsScreen's render. Markup, copy, animations, `numberOfLines`,
 * opacities, the `key={summaryCard.variant}` remount trick, and the
 * stats-row visibility condition are all byte-for-byte unchanged — the
 * values they read are now props.
 *
 * Note on the stats row: the original rendered it as
 * `{cond && <Animated.View/>}`. Here `StatsRow` returns the same
 * `<Animated.View/>` when the condition holds and `null` otherwise —
 * React renders nothing for both `false` and `null`, so the output is
 * identical.
 */
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import type { PeriodStats } from '../../utils/periods';
import type { useTheme } from '../../theme/useTheme';
import type { useTranslation } from 'react-i18next';
import type { SummaryCard } from './buildSummaryCard';
import { styles } from '../../../app/periods.styles';
import { StatCard, LegendDot } from './PeriodParts';
import { INTENSITY_BG } from './PeriodCalendar';

type Theme = ReturnType<typeof useTheme>;
type T = ReturnType<typeof useTranslation>['t'];

/**
 * Summary card — single Animated.View, content driven by the
 * `summaryCard` state machine. The `key` swap on variant change re-fires
 * the FadeInDown so the user sees the card "transition" rather than
 * silently mutating in place.
 */
export function SummarySection({ summaryCard }: { summaryCard: SummaryCard }) {
  return (
    <Animated.View
      key={summaryCard.variant}
      entering={FadeInDown.delay(120).duration(550).springify().damping(20)}
      style={[styles.summaryCard, { backgroundColor: summaryCard.bg }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.summaryLabel, { color: summaryCard.textColor, opacity: 0.75 }]}>
          {summaryCard.label}
        </Text>
        <Text style={[styles.summaryTitle, { color: summaryCard.textColor }]} numberOfLines={2}>
          {summaryCard.title}
        </Text>
        <Text style={[styles.summaryBody, { color: summaryCard.textColor, opacity: 0.85 }]}>
          {summaryCard.body}
        </Text>
        {summaryCard.hint && (
          <Text style={[styles.summaryHint, { color: summaryCard.textColor, opacity: 0.65 }]}>
            {summaryCard.hint}
          </Text>
        )}
      </View>
      <Text style={styles.summaryEmoji}>{summaryCard.emoji}</Text>
    </Animated.View>
  );
}

export function StatsRow({
  theme,
  t,
  locale,
  stats,
}: {
  theme: Theme;
  t: T;
  // `getDateFnsLocale` returns `any` — mirror it so callers pass through.
  locale: any;
  stats: PeriodStats;
}) {
  if (!(stats.last || stats.avgCycleDays || stats.avgDurationDays)) return null;
  return (
    <Animated.View entering={FadeInUp.delay(250).duration(500)} style={styles.statsRow}>
      <StatCard
        theme={theme}
        label={t('periodsStatLast', { defaultValue: 'Dernière' })}
        value={stats.last ? format(new Date(stats.last.startDate), 'dd MMM', { locale }) : '—'}
        hint={
          stats.last
            ? t(stats.last.intensity, {
                defaultValue:
                  stats.last.intensity === 'light'
                    ? 'Légères'
                    : stats.last.intensity === 'normal'
                      ? 'Normales'
                      : 'Abondantes',
              })
            : ''
        }
      />
      <StatCard
        theme={theme}
        label={t('periodsStatCycle', { defaultValue: 'Cycle moyen' })}
        value={stats.avgCycleDays ? `${stats.avgCycleDays} j` : '—'}
        hint={
          stats.avgCycleDays
            ? t('periodsStatCycleHint', {
                cycles: stats.observedCycleCount,
                defaultValue: `${stats.observedCycleCount} cycle${stats.observedCycleCount > 1 ? 's' : ''}`,
              })
            : t('periodsStatCycleNotEnough', { defaultValue: 'pas encore' })
        }
      />
      <StatCard
        theme={theme}
        label={t('periodsStatDuration', { defaultValue: 'Durée' })}
        value={stats.avgDurationDays ? `${stats.avgDurationDays} j` : '—'}
        hint={t('periodsStatDurationHint', { defaultValue: 'moyenne' })}
      />
    </Animated.View>
  );
}

/**
 * Legend — every visual marker that can appear on a calendar cell, in
 * the same order they read from "softer → stronger".
 */
export function PeriodLegend({ theme, t }: { theme: Theme; t: T }) {
  return (
    <Animated.View entering={FadeInUp.delay(450).duration(500)} style={styles.legendRow}>
      <LegendDot color={INTENSITY_BG.light} label={t('light', { defaultValue: 'Légères' })} theme={theme} />
      <LegendDot color={INTENSITY_BG.normal} label={t('normal', { defaultValue: 'Normales' })} theme={theme} />
      <LegendDot color={INTENSITY_BG.heavy} label={t('heavy', { defaultValue: 'Abondantes' })} theme={theme} />
      <LegendDot
        color="rgba(232,112,112,0.30)"
        label={t('periodsLegendPredicted', { defaultValue: 'Prédite' })}
        theme={theme}
        ringed
      />
      <LegendDot
        color="transparent"
        label={t('periodsLegendToday', { defaultValue: "Aujourd'hui" })}
        theme={theme}
        todayBorder
      />
    </Animated.View>
  );
}
