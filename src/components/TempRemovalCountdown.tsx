import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { useCycleStore } from '../store/cycleStore';
import { useTranslation } from 'react-i18next';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme';

const DURATION_MS = 3 * 60 * 60 * 1000; // 3h

export function TempRemovalCountdown() {
  const theme = useTheme();
  const { t } = useTranslation();
  const darkMode = useCycleStore(s => s.darkMode);
  const tempRemovalStart = useCycleStore(s => s.tempRemovalStart);
  const tempRemovalNotify = useCycleStore(s => s.tempRemovalNotify);
  const setTempRemovalNotify = useCycleStore(s => s.setTempRemovalNotify);

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!tempRemovalStart) return;
    const iv = setInterval(() => setTick(t => t + 1), 30_000); // refresh every 30s
    return () => clearInterval(iv);
  }, [tempRemovalStart]);

  if (!tempRemovalStart) return null;

  const startMs = new Date(tempRemovalStart).getTime();
  const elapsed = Date.now() - startMs;
  const remaining = DURATION_MS - elapsed;
  const overdue = remaining <= 0;

  // Format remaining time
  let timeLabel: string;
  if (overdue) {
    timeLabel = '—';
  } else {
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) {
      timeLabel = `${hours}${t('hours')} ${String(minutes).padStart(2, '0')}`;
    } else {
      timeLabel = `${minutes}${t('minutes')}`;
    }
  }

  const bg = overdue
    ? (darkMode ? 'rgba(212,165,197,0.24)' : '#F3E8EF')
    : (darkMode ? 'rgba(181,165,226,0.22)' : theme.primarySoft);
  const border = overdue
    ? (darkMode ? 'rgba(212,165,197,0.55)' : '#D4A5C5')
    : theme.primary;
  const textColor = overdue
    ? (darkMode ? '#D4A5C5' : '#8E5A77')
    : theme.primaryDark;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={[styles.wrap, { backgroundColor: bg, borderColor: border }]}
    >
      <View style={styles.content}>
        <Text style={[styles.time, { color: textColor }]}>⏱ {timeLabel}</Text>
        {overdue && (
          <Text style={[styles.overdueLabel, { color: textColor }]} numberOfLines={1}>
            {t('tempRemovalOverdue')}
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => setTempRemovalNotify(!tempRemovalNotify)}
        hitSlop={6}
        style={[styles.bellBtn, { backgroundColor: tempRemovalNotify ? theme.primary : 'transparent', borderColor: border }]}
      >
        <Text style={[styles.bell, { color: tempRemovalNotify ? '#FFF' : textColor }]}>
          {tempRemovalNotify ? '🔔' : '🔕'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    marginLeft: 4,
    maxWidth: 130,
  },
  bellBtn: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: {
    fontSize: 14,
  },
});
