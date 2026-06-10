/**
 * Presentational sub-components for the "Mes périodes" screen
 * (app/periods.tsx).
 *
 * Extracted verbatim — pure relocation, no behavior/JSX/style change.
 * They consume the shared `styles` StyleSheet (moved to
 * app/periods.styles.ts) and the same theme tokens used inline before.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { spacing, borderRadius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { styles } from '../../styles/periods.styles';

export function StatCard({
  theme,
  label,
  value,
  hint,
}: {
  theme: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <Text style={[styles.statLabel, { color: theme.textLight }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statHint, { color: theme.textSecondary }]} numberOfLines={1}>{hint}</Text>
    </View>
  );
}

export function TipStep({
  theme,
  emoji,
  title,
  body,
  highlighted,
}: {
  theme: ReturnType<typeof useTheme>;
  emoji: string;
  title: string;
  body: string;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.tipStepRow, highlighted && { backgroundColor: theme.primarySoft, borderRadius: borderRadius.md, padding: spacing.sm, marginHorizontal: -spacing.sm }]}>
      <Text style={[styles.tipStepEmoji, { color: highlighted ? theme.primaryDark : theme.primary }]}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tipStepTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.tipStepBody, { color: theme.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

export function LegendDot({
  color,
  label,
  theme,
  ringed,
  todayBorder,
}: {
  color: string;
  label: string;
  theme: ReturnType<typeof useTheme>;
  ringed?: boolean;
  todayBorder?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          ringed && { borderWidth: 1.5, borderColor: '#E87070', borderStyle: 'dashed' },
          todayBorder && { borderWidth: 2, borderColor: theme.primaryDark },
        ]}
      />
      <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}
