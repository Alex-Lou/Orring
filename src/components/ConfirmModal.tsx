/**
 * ConfirmModal — themed replacement for the native `Alert.alert`.
 *
 * The default Android Alert dialog ships in white-on-black with a
 * sharp rectangular shape and OS typography, which clashes hard with
 * Orring's pervenche / cranberry palette. This drop-in component
 * mirrors the Alert API (title + body + 2 actions) but renders inside
 * our design system: rounded surfaces, theme-aware colors, soft fade
 * + scale entrance, themed danger button for destructive flows.
 *
 * The shape mirrors the native `Alert.alert` callback contract so the
 * call site change is essentially `Alert.alert(...)` →
 * `setConfirm({...})` + render `<ConfirmModal {...confirm} />` once.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body?: string;
  /** Confirm-button label; default "OK". */
  confirmLabel?: string;
  /** Cancel-button label; default localized "Annuler". */
  cancelLabel?: string;
  /** Bigger emoji at the top — optional. Default 🌸. */
  emoji?: string;
  /** When true, the confirm button is rendered with the destructive
   *  red treatment (matches Alert.alert's `style: 'destructive'`). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  emoji = '🌸',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Animated.View
          entering={ZoomIn.duration(280).springify().damping(18).mass(0.85)}
        >
          <Pressable
            onPress={() => {}}
            style={[styles.content, { backgroundColor: theme.surface }]}
          >
            <Animated.View entering={FadeIn.duration(200)}>
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {body && (
                <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnCancel,
                    { borderColor: theme.border },
                    pressed && { opacity: 0.55 },
                  ]}
                >
                  <Text style={[styles.btnLabel, { color: theme.textSecondary }]}>
                    {cancelLabel ?? t('cancel', { defaultValue: 'Annuler' })}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.btn,
                    destructive
                      ? styles.btnDanger
                      : [styles.btnConfirm, { backgroundColor: theme.primary }],
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnLabel,
                      destructive
                        ? styles.btnLabelDanger
                        : { color: '#FFFFFF' },
                    ]}
                  >
                    {confirmLabel ?? t('confirm', { defaultValue: 'Confirmer' })}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
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
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: spacing.xs },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  btnCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnConfirm: {
    // backgroundColor merged from theme.primary at render time
  },
  btnDanger: {
    backgroundColor: '#FDE8E8',
  },
  btnLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  btnLabelDanger: { color: '#C62828' },
});
