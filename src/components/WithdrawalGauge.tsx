import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

/**
 * Mini jauge pour la PÉRIODE DE RETRAIT (jours 22-28 du cycle).
 * Animation douce : la barre se remplit de droite à gauche vers la
 * prochaine insertion, avec un petit "pulse" sur le bouton d'action.
 *
 * Rendu uniquement quand le ring est retiré (pause). Encapsulé dans
 * une carte distincte pour que le moment d'attente soit visuellement
 * lisible sans confusion avec la phase port-anneau.
 */
interface Props {
  dayInPause: number;   // 1..7 (jour dans la phase de pause)
  totalPauseDays: number; // 7
  daysUntilInsertion: number;
}

export function WithdrawalGauge({ dayInPause, totalPauseDays, daysUntilInsertion }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const progress = Math.min(Math.max(dayInPause / totalPauseDays, 0), 1);

  // Fill animates to current progress.
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // Gentle breathing pulse on the countdown number.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Ring emoji drifting slowly from left to right across the track, tracking
  // where "today" sits on the 22→28 axis. Position = progress * 100% but
  // clamped so the ring glyph never falls off either edge.
  const markerStyle = useAnimatedStyle(() => ({
    left: `${Math.max(0, Math.min(fill.value * 100, 96))}%`,
  }));

  const isDDay = daysUntilInsertion === 0;
  const label = isDDay
    ? t('insertToday', { defaultValue: "Jour d'insertion !" })
    : t('daysUntilInsertion', { count: daysUntilInsertion, defaultValue: `J-${daysUntilInsertion} avant insertion` });

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.primaryLight }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.primaryDark }]}>⏳ {t('pauseCountdown', { defaultValue: 'Avant la nouvelle insertion' })}</Text>
        <Animated.Text style={[styles.count, { color: theme.primary }, pulseStyle]}>
          {isDDay ? '⭕' : `J-${daysUntilInsertion}`}
        </Animated.Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: theme.primarySoft }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]} />
        <Animated.View style={[styles.marker, markerStyle]}>
          <Text style={styles.markerDot}>⭕</Text>
        </Animated.View>
      </View>
      <View style={styles.axis}>
        <Text style={[styles.axisLabel, { color: theme.textLight }]}>J22 ✋</Text>
        <Text style={[styles.axisLabel, { color: theme.textLight }]}>J28 ⭕</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  count: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  track: {
    height: 14,
    borderRadius: 7,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
  marker: {
    position: 'absolute',
    top: -6,
    marginLeft: -13,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    fontSize: 20,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
