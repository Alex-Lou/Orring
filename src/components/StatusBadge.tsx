import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius, fontSize, fontWeight, spacing, shadows } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useCycleStore } from '../store/cycleStore';
import { DayStatus } from '../utils/cycle';

interface StatusBadgeProps {
  status: DayStatus;
  label: string;
}

function getStatusStyle(status: DayStatus, dark: boolean) {
  if (dark) {
    // Mode sombre : tout en pervenche désaturée, pas de rose/rouge
    switch (status) {
      case 'insert_day':
        return { bg: 'rgba(232,184,102,0.18)', text: '#E8B866', border: 'rgba(232,184,102,0.55)' };
      case 'remove_day':
      case 'ring_out':
        return { bg: 'rgba(181,165,226,0.18)', text: '#C9BCEC', border: 'rgba(181,165,226,0.55)' };
      case 'ring_in':
        return { bg: 'rgba(158,198,164,0.18)', text: '#9EC6A4', border: 'rgba(158,198,164,0.55)' };
      default:
        return { bg: 'rgba(181,165,226,0.18)', text: '#C9BCEC', border: 'rgba(181,165,226,0.55)' };
    }
  }
  // Mode clair : palette douce et désaturée
  switch (status) {
    case 'insert_day':
      return { bg: colors.changeDayLight, text: '#9B7A2C', border: colors.changeDay };
    case 'remove_day':
      return { bg: colors.ringOutLight, text: '#8E5A77', border: colors.ringOut };
    case 'ring_in':
      return { bg: colors.ringInLight, text: '#4A6A4E', border: colors.ringIn };
    case 'ring_out':
      return { bg: colors.ringOutLight, text: '#8E5A77', border: colors.ringOut };
    default:
      return { bg: colors.primaryLight, text: colors.textSecondary, border: colors.primary };
  }
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const theme = useTheme();
  const dark = useCycleStore(s => s.darkMode);
  const style = getStatusStyle(status, dark);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(200).duration(800)}
      style={[
        styles.badge,
        {
          backgroundColor: style.bg,
          borderColor: style.border,
        },
        pulseStyle,
      ]}
    >
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignSelf: 'center',
    ...shadows.soft,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
});
