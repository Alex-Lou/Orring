import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { useTheme } from '../theme/useTheme';

interface InfoCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  delay?: number;
}

export function InfoCard({ icon, title, value, subtitle, color = colors.primary, delay = 0 }: InfoCardProps) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500).springify()}
      style={[styles.card, { borderLeftColor: color, backgroundColor: theme.surface }]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.medium,
    borderLeftWidth: 5,
  },
  icon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
