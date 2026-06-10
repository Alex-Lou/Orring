import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { subDays, startOfDay, isBefore, isSameDay } from 'date-fns';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';
import { formatDateTimeFr } from '../utils/cycle';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

interface ConfirmActionModalProps {
  visible: boolean;
  action: 'insert' | 'remove';
  isEarly?: boolean;  // true if removing before day 21
  /**
   * Current cycle's insertion datetime. For a REMOVAL it's the floor: a ring
   * can't come out before it went in, so the date picker is bounded to it and
   * quick "N days ago" buttons before it are disabled. Ignored for inserts.
   */
  insertionDate?: Date | null;
  onConfirm: (date: Date, options?: { temporary?: boolean; notify?: boolean }) => void;
  onClose: () => void;
}

export function ConfirmActionModal({ visible, action, isEarly = false, insertionDate = null, onConfirm, onClose }: ConfirmActionModalProps) {
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

  // A removal can't predate the insertion (you can't take out a ring you
  // never put in). `removalFloor` = start of the insertion day; quick buttons
  // and the date picker are bounded to it. Inserts have no floor.
  const removalFloor = !isInsert && insertionDate ? startOfDay(insertionDate) : null;
  const isBeforeFloor = (d: Date) => (removalFloor ? isBefore(startOfDay(d), removalFloor) : false);
  // True only when the CURRENTLY chosen date violates the floor — drives both
  // the warning (shown only then, not permanently) and a real Confirm block.
  const selectedBeforeFloor = isBeforeFloor(selectedDate);

  // Confirm is blocked when an early definitive removal isn't acknowledged OR
  // the chosen date precedes the insertion. Used for the disabled prop AND a
  // hard guard in handleConfirm — a real garde-fou, not just a greyed look.
  const earlyBlocked = isEarly && !isInsert && removalKind === 'definitive' && !earlyConfirmed;
  const confirmDisabled = earlyBlocked || selectedBeforeFloor;

  // Quick-date shortcuts, defined once and mapped — keeps the row DRY and lets
  // each chip compute its own disabled state against the removal floor.
  const quickOptions = [
    { key: 'todayShort', days: 0 },
    { key: 'yesterday', days: 1 },
    { key: 'daysAgo2', days: 2 },
    { key: 'daysAgo7', days: 7 },
  ] as const;

  const handleConfirm = () => {
    if (confirmDisabled) return; // hard guard — never validate a blocked state
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardScroll}
          >
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={styles.emoji}>{isInsert ? '⭕' : '♻️'}</Text>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {/* Selected datetime display */}
            <View style={[styles.selectedBox, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.selectedDate, { color: theme.text }]}>{formatDateTimeFr(selectedDate)}</Text>
            </View>

            {/* Quick date buttons. For a removal, any shortcut landing before
                the insertion is disabled — the ring can't come out before it
                went in. */}
            <View style={styles.quickRow}>
              {quickOptions.map(({ key, days }) => {
                const date = subDays(new Date(), days);
                const disabled = isBeforeFloor(date);
                // Highlight the chip that matches the REAL current selection,
                // so the user always sees which date is active.
                const active = !disabled && isSameDay(selectedDate, date);
                return (
                  <Pressable
                    key={key}
                    disabled={disabled}
                    style={[styles.quickBtn, active && styles.quickActive, disabled && styles.quickDisabled]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.quickText,
                      active && styles.quickActiveText,
                      disabled && styles.quickDisabledText,
                    ]}>
                      {t(key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Shown ONLY when the chosen date actually precedes the insertion
                — and Confirm is truly disabled in that case (see below). */}
            {selectedBeforeFloor && (
              <Text style={[styles.floorHint, { color: colors.ringOut, fontWeight: fontWeight.semibold }]}>
                ⚠️ {t('removalFloorHint', { date: formatDateTimeFr(insertionDate!) })}
              </Text>
            )}

            {/* Date picker button */}
            <Pressable style={[styles.pickerBtn, { backgroundColor: theme.surfaceElevated }]} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>📅 {t('changeDate')}</Text>
            </Pressable>

            {/* Time picker button */}
            <Pressable style={[styles.pickerBtn, { backgroundColor: theme.surfaceElevated }]} onPress={() => setShowTimePicker(true)}>
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>🕐 {t('changeTime')}</Text>
            </Pressable>

            {/* Native date picker (rouleau Android).
                `minimumDate` bounds a removal to the insertion day (no removal
                before insertion); inserts stay unbounded in the past. */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={removalFloor ?? undefined}
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

            {/* Native time picker.
                `display="clock"` forces the round clock dialog instead of the
                rouleau/spinner. On MIUI "default" still resolves to the spinner,
                which has the bug where, once at 23h, you can't scroll back up
                without first nudging the minutes (7.4). The clock has no such
                wrap issue.
                The onChange clamps the result to "now" only when it would land
                in the future — so for a PAST date every hour is selectable, but
                you can never log an insertion/removal ahead of the clock (7.3). */}
            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="clock"
                is24Hour={true}
                onChange={(_, date) => {
                  setShowTimePicker(false);
                  if (date) {
                    const d = new Date(selectedDate);
                    d.setHours(date.getHours(), date.getMinutes(), 0, 0);
                    const now = new Date();
                    setSelectedDate(d.getTime() > now.getTime() ? now : d);
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
                  confirmDisabled && { opacity: 0.4 },
                ]}
                onPress={handleConfirm}
                disabled={confirmDisabled}
              >
                <Text style={styles.confirmText}>{t('confirm')}</Text>
              </Pressable>
            </View>
          </Animated.View>
          </ScrollView>
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
    width: '100%', maxWidth: 360, maxHeight: '88%', ...shadows.strong,
  },
  // Padding lives on the scroll content so the whole card (warning + actions
  // included) can scroll on short screens instead of being clipped.
  cardScroll: { padding: spacing.lg },
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
  quickDisabled: { opacity: 0.35 },
  quickDisabledText: { textDecorationLine: 'line-through' },
  floorHint: {
    fontSize: 11, textAlign: 'center', marginTop: -spacing.sm, marginBottom: spacing.md,
  },

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
