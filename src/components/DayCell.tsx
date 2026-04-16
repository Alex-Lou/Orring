import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, borderRadius, fontSize, fontWeight } from '../theme';
import { CycleDay, DayStatus } from '../utils/cycle';

interface DayCellProps {
  day: CycleDay;
  onPress?: (day: CycleDay) => void;
  index: number;
}

function getStatusColor(status: DayStatus) {
  switch (status) {
    case 'insert_day': return { bg: colors.changeDayLight, dot: colors.changeDay, border: colors.changeDay };
    case 'remove_day': return { bg: colors.ringOutLight, dot: colors.ringOut, border: colors.ringOut };
    case 'ring_in': return { bg: colors.ringInLight, dot: colors.ringIn, border: 'transparent' };
    case 'ring_out': return { bg: colors.ringOutLight, dot: colors.ringOut, border: 'transparent' };
    default: return { bg: 'transparent', dot: 'transparent', border: 'transparent' };
  }
}

function getStatusIcon(status: DayStatus): string {
  switch (status) {
    case 'insert_day': return '⭕';
    case 'remove_day': return '✋';
    case 'ring_in': return '';
    case 'ring_out': return '';
    default: return '';
  }
}

export function DayCell({ day, onPress, index }: DayCellProps) {
  const { bg, dot, border } = getStatusColor(day.status);
  const icon = getStatusIcon(day.status);
  const dayNum = day.date.getDate();

  return (
    <Animated.View entering={FadeIn.delay(index * 15).duration(300)}>
      <Pressable
        onPress={() => onPress?.(day)}
        style={({ pressed }) => [
          styles.cell,
          { backgroundColor: bg },
          day.isToday && styles.today,
          (day.status === 'insert_day' || day.status === 'remove_day') && {
            borderColor: border,
            borderWidth: 2,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            day.isToday && styles.todayText,
            day.status === 'none' && styles.inactiveText,
          ]}
        >
          {dayNum}
        </Text>
        {icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : day.status !== 'none' ? (
          <View style={[styles.dot, { backgroundColor: dot }]} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  todayText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  inactiveText: {
    color: colors.textLight,
  },
  today: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    position: 'absolute',
    bottom: 5,
  },
  icon: {
    fontSize: 10,
    position: 'absolute',
    bottom: 3,
  },
});
