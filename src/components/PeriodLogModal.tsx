import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { formatDateFr } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

interface PeriodLogModalProps {
  visible: boolean;
  date: Date | null;
  currentIntensity?: 'light' | 'normal' | 'heavy';
  onSelect: (intensity: 'light' | 'normal' | 'heavy') => void;
  onRemove: () => void;
  onClose: () => void;
}

const INTENSITIES: { key: 'light' | 'normal' | 'heavy'; i18nKey: string; emoji: string; color: string }[] = [
  { key: 'light', i18nKey: 'light', emoji: '🩸', color: '#FCDCE6' },
  { key: 'normal', i18nKey: 'normal', emoji: '🩸🩸', color: '#F4A0A0' },
  { key: 'heavy', i18nKey: 'heavy', emoji: '🩸🩸🩸', color: '#E87070' },
];

export function PeriodLogModal({ visible, date, currentIntensity, onSelect, onRemove, onClose }: PeriodLogModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, { backgroundColor: theme.surface }]}>
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={[styles.title, { color: theme.text }]}>{t('periodTitle')}</Text>
            {date && (
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                {formatDateFr(date, 'EEEE dd MMMM')}
              </Text>
            )}

            <View style={styles.options}>
              {INTENSITIES.map(({ key, i18nKey, emoji, color }) => (
                <Pressable
                  key={key}
                  style={[
                    styles.option,
                    { backgroundColor: color },
                    currentIntensity === key && styles.optionActive,
                  ]}
                  onPress={() => onSelect(key)}
                >
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                  <Text style={styles.optionLabel}>{t(i18nKey)}</Text>
                  {currentIntensity === key && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}
            </View>

            {currentIntensity && (
              <Pressable style={styles.removeBtn} onPress={onRemove}>
                <Text style={styles.removeText}>{t('delete')}</Text>
              </Pressable>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>{t('close')}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  date: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textTransform: 'capitalize',
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: colors.primaryDark,
  },
  optionEmoji: {
    fontSize: 16,
    width: 40,
  },
  optionLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  check: {
    fontSize: fontSize.lg,
    color: colors.primaryDark,
    fontWeight: fontWeight.bold,
  },
  removeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  removeText: {
    fontSize: fontSize.sm,
    color: '#E74C3C',
    fontWeight: fontWeight.medium,
  },
  closeBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  closeText: {
    color: colors.primaryDark,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
});
