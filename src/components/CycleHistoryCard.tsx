import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { CyclePhaseBar } from './CyclePhaseBar';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import { CycleHistoryEntry, formatDateFr, CYCLE_LENGTH } from '../utils/cycle';

interface CycleHistoryCardProps {
  entry: CycleHistoryEntry;
  index: number;
  onDelete?: () => void;
}

function getStatusChipStyle(status: 'past' | 'current' | 'future') {
  switch (status) {
    case 'current': return { bg: colors.primaryLight, color: colors.primaryDark };
    case 'past': return { bg: colors.surfaceElevated, color: colors.textSecondary };
    case 'future': return { bg: '#E8F0FE', color: '#5B7FCC' };
  }
}

function getStatusChipLabel(status: 'past' | 'current' | 'future', t: (key: string) => string) {
  switch (status) {
    case 'current': return t('current');
    case 'past': return t('past');
    case 'future': return t('upcoming');
  }
}

export function CycleHistoryCard({ entry, index, onDelete }: CycleHistoryCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const chipStyle = getStatusChipStyle(entry.status);
  const chipLabel = getStatusChipLabel(entry.status, t);
  const currentDay = entry.status === 'current'
    ? Math.min(Math.floor((Date.now() - entry.theoreticalInsertDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, CYCLE_LENGTH)
    : entry.status === 'past' ? CYCLE_LENGTH : 0;

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).duration(400).springify().damping(22)}>
      <View style={[
        styles.card,
        { backgroundColor: theme.surface },
        entry.status === 'current' && [styles.currentCard, { backgroundColor: theme.primarySoft }],
        entry.status === 'future' && styles.futureCard,
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.cycleLabel, { color: theme.text }]}>
          {t('cycleLabel', { number: entry.cycleNumber > 0 ? entry.cycleNumber : '' })}
        </Text>
        <View style={styles.headerRight}>
          <View style={[styles.chip, { backgroundColor: chipStyle.bg }]}>
            <Text style={[styles.chipText, { color: chipStyle.color }]}>{chipLabel}</Text>
          </View>
          {onDelete && (entry.status === 'past' || entry.status === 'current') && (
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Date range */}
      <Text style={[styles.dateRange, { color: theme.textSecondary }]}>
        {formatDateFr(entry.theoreticalInsertDate, 'dd MMM')} — {formatDateFr(entry.theoreticalPauseEnd, 'dd MMM yyyy')}
      </Text>

      {/* Phase bar */}
      <View style={styles.barContainer}>
        <CyclePhaseBar currentDay={currentDay} compact showLabels={false} />
      </View>

      {/* Details */}
      <View style={styles.details}>
        <DetailRow
          emoji="⭕"
          label={t('insertion')}
          theoretical={formatDateFr(entry.theoreticalInsertDate, 'EEE dd MMM')}
          actual={entry.actualInsertDate ? formatDateFr(entry.actualInsertDate, 'EEE dd MMM') : null}
        />
        <DetailRow
          emoji="♻️"
          label={t('removal')}
          theoretical={formatDateFr(entry.theoreticalRemoveDate, 'EEE dd MMM')}
          actual={entry.actualRemoveDate ? formatDateFr(entry.actualRemoveDate, 'EEE dd MMM') : null}
        />
        {entry.periodDays.length > 0 && (
          <View style={styles.periodRow}>
            <Text style={styles.periodEmoji}>🩸</Text>
            <Text style={styles.periodText}>
              {t('periodLogged', { count: entry.periodDays.length })}
            </Text>
          </View>
        )}
      </View>
      </View>
    </Animated.View>
  );
}

function DetailRow({
  emoji,
  label,
  theoretical,
  actual,
}: {
  emoji: string;
  label: string;
  theoretical: string;
  actual: string | null;
}) {
  const theme = useTheme();
  const hasDeviation = actual && actual !== theoretical;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailEmoji}>{emoji}</Text>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailDate, { color: theme.textSecondary }, hasDeviation && styles.theoreticalStrike]}>
          {theoretical}
        </Text>
        {hasDeviation && (
          <Text style={[styles.actualDate, { color: theme.primaryDark }]}>→ {actual}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  currentCard: {
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  futureCard: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { fontSize: 12, color: '#C62828', fontWeight: fontWeight.bold },
  cycleLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  dateRange: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  barContainer: {
    marginBottom: spacing.sm,
  },
  details: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    width: 60,
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  theoreticalStrike: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  actualDate: {
    fontSize: fontSize.sm,
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  periodEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  periodText: {
    fontSize: fontSize.xs,
    color: colors.ringOut,
    fontWeight: fontWeight.medium,
  },
});
