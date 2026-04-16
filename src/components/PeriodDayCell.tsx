import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { format } from 'date-fns';
import { fr, enUS, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';
import { colors, borderRadius, fontSize, fontWeight, spacing, shadows } from '../theme';
import { useTranslation } from 'react-i18next';

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, pt, de, ar, zh: zhCN, ja };

interface PeriodDayCellProps {
  dayNumber: number;
  date: Date;
  intensity?: 'light' | 'normal' | 'heavy';
  isToday: boolean;
  onPress: () => void;
}

function getIntensityStyle(intensity?: 'light' | 'normal' | 'heavy') {
  switch (intensity) {
    case 'light': return { bg: '#FCDCE6', border: '#F8B4C8', i18nKey: 'light' };
    case 'normal': return { bg: '#F4A0A0', border: '#E87070', i18nKey: 'normal' };
    case 'heavy': return { bg: '#E87070', border: '#D04040', i18nKey: 'heavy' };
    default: return { bg: colors.surfaceElevated, border: colors.border, i18nKey: '' };
  }
}

export function PeriodDayCell({ dayNumber, date, intensity, isToday, onPress }: PeriodDayCellProps) {
  const { t, i18n } = useTranslation();
  const style = getIntensityStyle(intensity);
  const locale = DATE_LOCALES[i18n.language] || fr;
  const dayName = format(date, 'EEE', { locale }).replace('.', '');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        { backgroundColor: style.bg, borderColor: style.border },
        isToday && styles.today,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.dayName}>{dayName}</Text>
      <Text style={[styles.dayNum, isToday && styles.todayText]}>{date.getDate()}</Text>
      {intensity ? (
        <Text style={styles.intensityLabel}>{t(style.i18nKey)}</Text>
      ) : (
        <Text style={styles.tapHint}>{t('tapToNote')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    maxWidth: 52,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayName: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'capitalize',
  },
  dayNum: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  todayText: {
    color: colors.primaryDark,
  },
  today: {
    borderColor: colors.primaryDark,
    borderWidth: 2.5,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.93 }],
  },
  intensityLabel: {
    fontSize: 8,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  tapHint: {
    fontSize: 8,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
    fontStyle: 'italic',
  },
});
