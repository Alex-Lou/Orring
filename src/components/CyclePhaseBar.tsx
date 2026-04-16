import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { RING_IN_DAYS, RING_OUT_DAYS, CYCLE_LENGTH } from '../utils/cycle';

interface CyclePhaseBarProps {
  currentDay: number;        // 1-28
  compact?: boolean;         // smaller variant for history cards
  showLabels?: boolean;
}

export function CyclePhaseBar({ currentDay, compact = false, showLabels = true }: CyclePhaseBarProps) {
  const markerPosition = useSharedValue(0);
  const barHeight = compact ? 16 : 28;
  const markerSize = compact ? 12 : 20;

  useEffect(() => {
    const position = Math.min(Math.max((currentDay - 1) / (CYCLE_LENGTH - 1), 0), 1);
    markerPosition.value = withTiming(position, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentDay]);

  const markerStyle = useAnimatedStyle(() => ({
    left: `${markerPosition.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      {showLabels && (
        <View style={styles.labelsRow}>
          <Text style={styles.label}>⭕ J1</Text>
          <Text style={styles.label}>✋ J22</Text>
          <Text style={styles.label}>J28</Text>
        </View>
      )}
      <View style={[styles.barContainer, { height: barHeight, borderRadius: barHeight / 2 }]}>
        {/* Ring-in phase (days 1-21) */}
        <View
          style={[
            styles.ringInPhase,
            {
              width: `${(RING_IN_DAYS / CYCLE_LENGTH) * 100}%`,
              borderTopLeftRadius: barHeight / 2,
              borderBottomLeftRadius: barHeight / 2,
            },
          ]}
        />
        {/* Ring-out phase (days 22-28) */}
        <View
          style={[
            styles.ringOutPhase,
            {
              width: `${(RING_OUT_DAYS / CYCLE_LENGTH) * 100}%`,
              borderTopRightRadius: barHeight / 2,
              borderBottomRightRadius: barHeight / 2,
            },
          ]}
        />
        {/* Current day marker */}
        {!compact && currentDay > 0 && currentDay <= CYCLE_LENGTH && (
          <Animated.View
            style={[
              styles.marker,
              {
                width: markerSize,
                height: markerSize,
                borderRadius: markerSize / 2,
                top: (barHeight - markerSize) / 2,
                marginLeft: -markerSize / 2,
              },
              markerStyle,
            ]}
          />
        )}
      </View>
      {showLabels && (
        <View style={styles.daysRow}>
          {Array.from({ length: CYCLE_LENGTH }).map((_, i) => {
            const day = i + 1;
            const isSpecial = day === 1 || day === RING_IN_DAYS + 1;
            const isCurrent = day === currentDay;
            return (
              <View
                key={i}
                style={[
                  styles.dayTick,
                  day <= RING_IN_DAYS ? styles.tickGreen : styles.tickRed,
                  isCurrent && styles.tickCurrent,
                  isSpecial && styles.tickSpecial,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  barContainer: {
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  ringInPhase: {
    backgroundColor: colors.ringIn,
    height: '100%',
  },
  ringOutPhase: {
    backgroundColor: colors.ringOut,
    height: '100%',
  },
  marker: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.primaryDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 1,
  },
  dayTick: {
    width: 3,
    height: 6,
    borderRadius: 1.5,
  },
  tickGreen: {
    backgroundColor: colors.ringInLight,
  },
  tickRed: {
    backgroundColor: colors.ringOutLight,
  },
  tickCurrent: {
    backgroundColor: colors.primaryDark,
    height: 10,
    width: 4,
  },
  tickSpecial: {
    backgroundColor: colors.changeDay,
    height: 8,
    width: 4,
  },
});
