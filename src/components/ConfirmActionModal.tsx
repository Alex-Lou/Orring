import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { subDays } from 'date-fns';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatDateTimeFr } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

interface ConfirmActionModalProps {
  visible: boolean;
  action: 'insert' | 'remove';
  isEarly?: boolean;  // true if removing before day 21
  onConfirm: (date: Date, options?: { temporary?: boolean; notify?: boolean }) => void;
  onClose: () => void;
}

export function ConfirmActionModal({ visible, action, isEarly = false, onConfirm, onClose }: ConfirmActionModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [earlyConfirmed, setEarlyConfirmed] = useState(false);
  // 'temporary' = pause courte (<3h, douche, rapport) → ne reset pas le cycle
  // 'definitive' = vrai retrait de fin de phase ou retrait anticipé volontaire
  const [removalKind, setRemovalKind] = useState<'temporary' | 'definitive'>('definitive');
  const [notifyAt3h, setNotifyAt3h] = useState(true);

  const isInsert = action === 'insert';
  const title = isInsert ? t('insertionTitle') : t('removalTitle');
  const color = isInsert ? colors.ringIn : colors.ringOut;

  const handleConfirm = () => {
    const isTemp = !isInsert && removalKind === 'temporary';
    onConfirm(selectedDate, isTemp ? { temporary: true, notify: notifyAt3h } : undefined);
    setSelectedDate(new Date());
    setRemovalKind('definitive');
    setNotifyAt3h(true);
  };

  const handleClose = () => {
    setSelectedDate(new Date());
    setShowTimePicker(false);
    setShowDatePicker(false);
    setEarlyConfirmed(false);
    setRemovalKind('definitive');
    setNotifyAt3h(true);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.surface }]}>
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={styles.emoji}>{isInsert ? '⭕' : '♻️'}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {/* Selected datetime display */}
            <View style={[styles.selectedBox, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.selectedDate, { color: theme.text }]}>{formatDateTimeFr(selectedDate)}</Text>
            </View>

            {/* Quick date buttons */}
            <View style={styles.quickRow}>
              <Pressable style={[styles.quickBtn, styles.quickActive]} onPress={() => setSelectedDate(new Date())}>
                <Text style={[styles.quickText, styles.quickActiveText]}>{t('todayShort')}</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => setSelectedDate(subDays(new Date(), 1))}>
                <Text style={styles.quickText}>{t('yesterday')}</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => setSelectedDate(subDays(new Date(), 2))}>
                <Text style={styles.quickText}>{t('daysAgo2')}</Text>
              </Pressable>
              <Pressable style={styles.quickBtn} onPress={() => setSelectedDate(subDays(new Date(), 7))}>
                <Text style={styles.quickText}>{t('daysAgo7')}</Text>
              </Pressable>
            </View>

            {/* Date picker button */}
            <Pressable style={[styles.pickerBtn, { backgroundColor: theme.surfaceElevated }]} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>📅 {t('changeDate')}</Text>
            </Pressable>

            {/* Time picker button */}
            <Pressable style={[styles.pickerBtn, { backgroundColor: theme.surfaceElevated }]} onPress={() => setShowTimePicker(true)}>
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>🕐 {t('changeTime')}</Text>
            </Pressable>

            {/* Native date picker (rouleau Android) */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const d = new Date(selectedDate);
                    d.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setSelectedDate(d);
                  }
                }}
              />
            )}

            {/* Native time picker (rouleau Android) */}
            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="spinner"
                is24Hour={true}
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const d = new Date(selectedDate);
                    d.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    setSelectedDate(d);
                  }
                }}
              />
            )}

            {/* Removal kind selector (temporary vs definitive) */}
            {!isInsert && (
              <View style={styles.kindWrap}>
                <Text style={[styles.kindLabel, { color: theme.textSecondary }]}>
                  {t('removalKindQuestion')}
                </Text>
                <View style={styles.kindRow}>
                  <Pressable
                    onPress={() => setRemovalKind('temporary')}
                    style={[
                      styles.kindBtn,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      removalKind === 'temporary' && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Text style={styles.kindEmoji}>⏱️</Text>
                    <Text style={[
                      styles.kindTitle,
                      { color: theme.textSecondary },
                      removalKind === 'temporary' && { color: theme.primaryDark, fontWeight: fontWeight.bold },
                    ]}>
                      {t('removalTemp')}
                    </Text>
                    <Text style={[styles.kindHint, { color: theme.textLight }]}>
                      {t('removalTempHint')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRemovalKind('definitive')}
                    style={[
                      styles.kindBtn,
                      { borderColor: theme.border, backgroundColor: theme.surface },
                      removalKind === 'definitive' && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Text style={styles.kindEmoji}>♻️</Text>
                    <Text style={[
                      styles.kindTitle,
                      { color: theme.textSecondary },
                      removalKind === 'definitive' && { color: theme.primaryDark, fontWeight: fontWeight.bold },
                    ]}>
                      {t('removalDef')}
                    </Text>
                    <Text style={[styles.kindHint, { color: theme.textLight }]}>
                      {t('removalDefHint')}
                    </Text>
                  </Pressable>
                </View>

                {/* Checkbox : notifier à +3h (seulement si temporaire) */}
                {removalKind === 'temporary' && (
                  <Pressable
                    onPress={() => setNotifyAt3h(!notifyAt3h)}
                    style={[styles.notifRow, { backgroundColor: theme.primarySoft }]}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.primary },
                      notifyAt3h && { backgroundColor: theme.primary },
                    ]}>
                      {notifyAt3h && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.notifLabel, { color: theme.text }]}>
                      🔔 {t('notifyAt3h')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Early removal warning */}
            {isEarly && !isInsert && removalKind === 'definitive' && (
              <View style={styles.earlyWarning}>
                <Text style={styles.earlyEmoji}>💛</Text>
                <Text style={styles.earlyText}>
                  {t('earlyRemovalWarning')}
                </Text>
                <Pressable
                  onPress={() => setEarlyConfirmed(!earlyConfirmed)}
                  style={styles.earlyCheck}
                >
                  <View style={[styles.checkbox, earlyConfirmed && styles.checkboxChecked]}>
                    {earlyConfirmed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.earlyCheckText}>{t('earlyRemovalConfirm')}</Text>
                </Pressable>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtn,
                  { backgroundColor: color },
                  (isEarly && !isInsert && removalKind === 'definitive' && !earlyConfirmed) && { opacity: 0.4 },
                ]}
                onPress={handleConfirm}
                disabled={isEarly && !isInsert && removalKind === 'definitive' && !earlyConfirmed}
              >
                <Text style={styles.confirmText}>{t('confirm')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, width: '100%', maxWidth: 360, ...shadows.strong,
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.md },

  selectedBox: {
    backgroundColor: colors.primarySoft, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.md,
  },
  selectedDate: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textTransform: 'capitalize' },

  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.surfaceElevated },
  quickActive: { backgroundColor: colors.primary },
  quickText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  quickActiveText: { color: colors.textOnPrimary },

  pickerBtn: {
    backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  pickerBtnText: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },

  kindWrap: {
    marginBottom: spacing.md,
  },
  kindLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  kindRow: {
    flexDirection: 'row', gap: spacing.sm,
  },
  kindBtn: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg, borderWidth: 2, alignItems: 'center', gap: 4,
  },
  kindEmoji: { fontSize: 22 },
  kindTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center',
  },
  kindHint: {
    fontSize: 10, textAlign: 'center', lineHeight: 13, marginTop: 2,
  },
  notifRow: {
    marginTop: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  notifLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1,
  },

  earlyWarning: {
    backgroundColor: '#FFF8E1', borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#FFE082',
  },
  earlyEmoji: { fontSize: 28, marginBottom: 4 },
  earlyText: { fontSize: fontSize.sm, color: '#5D4037', textAlign: 'center', lineHeight: 20, marginBottom: spacing.sm },
  earlyCheck: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#FFB300',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#FFB300' },
  checkmark: { fontSize: 14, color: '#FFF', fontWeight: fontWeight.bold },
  earlyCheckText: { fontSize: fontSize.sm, color: '#5D4037', fontWeight: fontWeight.medium, flex: 1 },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: borderRadius.full, alignItems: 'center' },
  confirmText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textOnPrimary },
});
