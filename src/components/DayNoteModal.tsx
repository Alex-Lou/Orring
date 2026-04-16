import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInUp, SlideInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatDateFr, formatDateTimeFr, getStatusLabel, getStatusEmoji, DayStatus } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import type { DayMark } from '../store/cycleStore';

const AVAILABLE_MARKS: { mark: DayMark; i18nKey: string }[] = [
  { mark: '💧', i18nKey: 'markWater' },
  { mark: '❤️', i18nKey: 'markLove' },
  { mark: '😊', i18nKey: 'markWell' },
  { mark: '😩', i18nKey: 'markPain' },
  { mark: '💊', i18nKey: 'markMedicine' },
  { mark: '🏥', i18nKey: 'markAppointment' },
  { mark: '⭐', i18nKey: 'markImportant' },
  { mark: '🔥', i18nKey: 'markEnergy' },
];

interface DayNoteModalProps {
  visible: boolean;
  date: Date | null;
  dayStatus: DayStatus;
  dayInCycle: number;
  currentText: string;
  currentMarks: DayMark[];
  onSave: (text: string, marks: DayMark[]) => void;
  onDelete: () => void;
  onClose: () => void;
  onRingAction?: (action: 'insert' | 'remove', date: Date) => void;
  actionDateTime?: Date | null;  // exact datetime for insert/remove day
}

export function DayNoteModal({
  visible,
  date,
  dayStatus,
  dayInCycle,
  currentText,
  currentMarks,
  onSave,
  onDelete,
  onClose,
  onRingAction,
  actionDateTime,
}: DayNoteModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [text, setText] = useState(currentText);
  const [marks, setMarks] = useState<DayMark[]>(currentMarks);

  useEffect(() => {
    setText(currentText);
    setMarks(currentMarks);
  }, [currentText, currentMarks, visible]);

  const toggleMark = (mark: DayMark) => {
    setMarks(prev =>
      prev.includes(mark) ? prev.filter(m => m !== mark) : [...prev, mark]
    );
  };

  const handleSave = () => {
    onSave(text, marks);
  };

  const hasContent = text.trim().length > 0 || marks.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: theme.surface }]}>
          {date && (
            <Animated.View entering={SlideInUp.duration(400).springify()}>
              {/* Date header */}
              <Text style={[styles.dateText, { color: theme.text }]}>
                {formatDateFr(date, 'EEEE dd MMMM')}
              </Text>

              {/* Cycle info */}
              {dayStatus !== 'none' && (
                <View style={styles.cycleInfoRow}>
                  <Text style={styles.cycleEmoji}>{getStatusEmoji(dayStatus)}</Text>
                  <Text style={[styles.cycleLabel, { color: theme.textSecondary }]}>{getStatusLabel(dayStatus)}</Text>
                  <Text style={[styles.cycleDot, { color: theme.textLight }]}>·</Text>
                  <Text style={[styles.cycleDay, { color: theme.primaryDark }]}>J{dayInCycle}</Text>
                </View>
              )}

              {/* Action buttons for insert/remove days */}
              {dayStatus === 'insert_day' && date && (
                <Pressable
                  style={({ pressed }) => [styles.actionBanner, { backgroundColor: '#DBEAFE' }, pressed && { opacity: 0.7 }]}
                  onPress={() => { onRingAction?.('insert', date); onClose(); }}
                >
                  <Text style={styles.actionBannerText}>⭕ {t('insertionDay')}</Text>
                  {actionDateTime && <Text style={styles.actionBannerTime}>{formatDateTimeFr(actionDateTime)}</Text>}
                  <Text style={styles.actionBannerHint}>{t('tapToRecord')}</Text>
                </Pressable>
              )}
              {dayStatus === 'remove_day' && date && (
                <Pressable
                  style={({ pressed }) => [styles.actionBanner, { backgroundColor: '#FEF3C7' }, pressed && { opacity: 0.7 }]}
                  onPress={() => { onRingAction?.('remove', date); onClose(); }}
                >
                  <Text style={styles.actionBannerText}>♻️ {t('removalDay')}</Text>
                  {actionDateTime && <Text style={styles.actionBannerTime}>{formatDateTimeFr(actionDateTime)}</Text>}
                  <Text style={styles.actionBannerHint}>{t('tapToRecord')}</Text>
                </Pressable>
              )}

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Marks */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('quickMarks')}</Text>
              <View style={styles.marksGrid}>
                {AVAILABLE_MARKS.map(({ mark, i18nKey }) => {
                  const isActive = marks.includes(mark);
                  return (
                    <Pressable
                      key={mark}
                      onPress={() => toggleMark(mark)}
                      style={[styles.markBtn, { backgroundColor: theme.surfaceElevated }, isActive && { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                    >
                      <Text style={styles.markEmoji}>{mark}</Text>
                      <Text style={[styles.markLabel, { color: theme.textSecondary }, isActive && { color: theme.primaryDark, fontWeight: fontWeight.bold }]}>{t(i18nKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('notes')}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                value={text}
                onChangeText={setText}
                placeholder={t('addNote')}
                placeholderTextColor={theme.textLight}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: theme.textLight }]}>{text.length}/200</Text>

              {/* Actions */}
              <View style={styles.actions}>
                {hasContent && (
                  <Pressable style={styles.deleteBtn} onPress={onDelete}>
                    <Text style={styles.deleteText}>{t('delete')}</Text>
                  </Pressable>
                )}
                <View style={styles.actionsRight}>
                  <Pressable style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelText}>{t('cancel')}</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveText}>{t('save')}</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg,
    width: '100%', maxWidth: 400, maxHeight: '85%', ...shadows.strong,
  },
  dateText: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', textTransform: 'capitalize',
  },
  cycleInfoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xs,
  },
  cycleEmoji: { fontSize: 16 },
  cycleLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  cycleDot: { fontSize: fontSize.sm, color: colors.textLight },
  cycleDay: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.bold },

  actionBanner: {
    marginTop: spacing.sm, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: 'center',
  },
  actionBannerText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text,
  },
  actionBannerTime: {
    fontSize: fontSize.sm, color: colors.text, marginTop: 2, textTransform: 'capitalize',
  },
  actionBannerHint: {
    fontSize: 10, color: colors.textSecondary, marginTop: 2,
  },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm,
  },
  marksGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg,
  },
  markBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated, borderWidth: 1.5, borderColor: 'transparent',
  },
  markBtnActive: {
    backgroundColor: colors.primaryLight, borderColor: colors.primary,
  },
  markEmoji: { fontSize: 14 },
  markLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: fontWeight.medium },
  markLabelActive: { color: colors.primaryDark, fontWeight: fontWeight.bold },

  textInput: {
    backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg,
    padding: spacing.md, fontSize: fontSize.md, color: colors.text, minHeight: 80,
    borderWidth: 1, borderColor: colors.border,
  },
  charCount: { fontSize: 10, color: colors.textLight, textAlign: 'right', marginTop: 4, marginBottom: spacing.md },

  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsRight: { flexDirection: 'row', gap: spacing.sm },
  deleteBtn: { paddingVertical: spacing.sm },
  deleteText: { fontSize: fontSize.sm, color: '#E74C3C', fontWeight: fontWeight.medium },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: spacing.md },
  cancelText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  saveBtn: {
    backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: borderRadius.full,
  },
  saveText: { fontSize: fontSize.sm, color: colors.textOnPrimary, fontWeight: fontWeight.bold },
});
