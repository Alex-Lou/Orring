import React from 'react';
import { View, Text } from 'react-native';
import type { TFunction } from 'i18next';
import { fontWeight } from '../../theme';
import type { useTheme } from '../../theme/useTheme';
import { styles } from './CycleRing.styles';

type Theme = ReturnType<typeof useTheme>;

interface RingCenterProps {
  currentDay: number;
  phaseLabel: string;
  daysLeft: number;
  nextAction: string;
  inactive: boolean;
  progressColor: string;
  size: number;
  theme: Theme;
  t: TFunction;
}

/**
 * Center content of the CycleRing. Relocated verbatim from the component's
 * JSX — in inactive mode we replace the live countdown with a "scaffold"
 * prompt — ⭕ glyph + "ready to start" copy — so the user immediately reads
 * "this gauge is waiting on me to press 'I inserted the ring'". The ring
 * outline + dial ticks stay visible so they recognise it as the upcoming
 * 21-day cycle.
 */
export function RingCenter({
  currentDay,
  phaseLabel,
  daysLeft,
  nextAction,
  inactive,
  progressColor,
  size,
  theme,
  t,
}: RingCenterProps) {
  return (
    <View style={styles.centerContent}>
      {inactive ? (
        <>
          <Text
            style={[
              styles.dayNumber,
              {
                color: theme.textLight,
                fontSize: 56,
                // Pull the glyph up so the multi-line subtitle below it
                // sits where the J-number / phase / countdown stack
                // normally lives — keeps the optical center balanced.
                marginBottom: 4,
              },
            ]}
          >
            ⭕
          </Text>
          <Text
            style={[
              styles.phaseText,
              { color: theme.textSecondary, fontSize: 14, fontWeight: fontWeight.semibold },
            ]}
            numberOfLines={1}
          >
            {t('awaitingInsertionTitle', { defaultValue: 'Nouveau cycle prêt' })}
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.textLight, opacity: 0.35 },
            ]}
          />
          <Text
            style={[
              styles.countdownLabel,
              { color: theme.textLight, maxWidth: size * 0.6 },
            ]}
          >
            {t('awaitingInsertionHint', {
              defaultValue: "Appuie sur « J'ai mis l'anneau » pour démarrer",
            })}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.dayNumber, { color: theme.text }]}>J{currentDay}</Text>
          <Text style={[styles.phaseText, { color: theme.textSecondary }]}>{phaseLabel}</Text>
          <View style={[styles.divider, { backgroundColor: progressColor }]} />
          <Text style={[styles.countdownNumber, { color: theme.primaryDark }]}>{daysLeft}</Text>
          <Text style={[styles.countdownLabel, { color: theme.textSecondary }]}>
            {t('daysBeforeActionLabel', { action: nextAction })}
          </Text>
        </>
      )}
    </View>
  );
}
