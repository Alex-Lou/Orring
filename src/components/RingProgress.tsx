import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { colors, fontSize, fontWeight } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useCycleStore } from '../store/cycleStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProgressProps {
  progress: number;         // 0-1
  size?: number;
  strokeWidth?: number;
  isRingIn: boolean;        // true = anneau en place, false = pause
  centerText: string;       // e.g. "J5"
  subText: string;          // e.g. "sur 21 jours"
  daysLeft?: number;        // jours restants avant action
  actionLabel?: string;     // "avant retrait" / "avant insertion"
}

export function RingProgress({
  progress,
  size = 240,
  strokeWidth = 14,
  isRingIn,
  centerText,
  subText,
  daysLeft,
  actionLabel,
}: RingProgressProps) {
  const theme = useTheme();
  const darkMode = useCycleStore(s => s.darkMode);

  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  // Couleurs adaptatives (moins saturées en dark)
  const progressColor = darkMode
    ? (isRingIn ? '#9EC6A4' : '#C9BCEC')
    : (isRingIn ? colors.ringIn : colors.ringOut);

  const bgColor = darkMode
    ? (isRingIn ? 'rgba(158,198,164,0.2)' : 'rgba(181,165,226,0.22)')
    : (isRingIn ? colors.ringInLight : colors.ringOutLight);

  const tickColor = darkMode ? theme.textLight : theme.textSecondary;
  const tickFilledColor = darkMode
    ? (isRingIn ? '#9EC6A4' : '#C9BCEC')
    : theme.primaryDark;

  // Ticks : un par jour de cycle
  const totalDays = isRingIn ? 21 : 7;
  const currentDay = Math.round(progress * totalDays); // nombre de ticks "remplis"
  const cx = size / 2;
  const cy = size / 2;
  const tickInner = radius - strokeWidth / 2 - 4;
  const tickOuter = radius - strokeWidth / 2 + 4;

  const ticks = Array.from({ length: totalDays }, (_, i) => {
    // Distribue sur le cercle entier, commence à -90° (haut)
    const angle = (i / totalDays) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * tickInner;
    const y1 = cy + Math.sin(angle) * tickInner;
    const x2 = cx + Math.cos(angle) * tickOuter;
    const y2 = cy + Math.sin(angle) * tickOuter;
    const filled = i < currentDay;
    return (
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={filled ? tickFilledColor : tickColor}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={filled ? 0.9 : 0.35}
      />
    );
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Day ticks */}
        <G>{ticks}</G>
      </Svg>
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.centerText, { color: theme.text }]}>{centerText}</Text>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>{subText}</Text>
        {typeof daysLeft === 'number' && (
          <>
            <View style={[styles.divider, { backgroundColor: progressColor }]} />
            <Text style={[styles.daysLeftNum, { color: theme.primaryDark }]}>{daysLeft}</Text>
            {actionLabel ? (
              <Text style={[styles.daysLeftLabel, { color: theme.textSecondary }]}>{actionLabel}</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
  },
  subText: {
    fontSize: fontSize.sm,
    marginTop: 2,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    marginVertical: 8,
    opacity: 0.6,
  },
  daysLeftNum: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  daysLeftLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
});
