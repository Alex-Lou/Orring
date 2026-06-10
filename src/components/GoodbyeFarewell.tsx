/**
 * GoodbyeFarewell — full-screen "soft goodbye" shown when the user
 * triggers the master "Tout réinitialiser" action in Settings.
 *
 * UX intent: this is the only true farewell moment in the app — the
 * user is about to wipe their cycle history, almost always because
 * they're uninstalling. Before the destructive payload runs we
 * (a) acknowledge the moment with a warm message + the bird mascot,
 * and (b) offer one last chance to save the data elsewhere via the
 * native Share API (Drive, email, Keep, …) — the parachute helper
 * also available from Settings.
 *
 * The component is purely presentational: it gets `onSaveData` and
 * `onConfirmReset` callbacks from the parent (settings.tsx) which
 * own the actual store mutations. The modal just orchestrates the
 * UI flow + animations.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';

interface GoodbyeFarewellProps {
  visible: boolean;
  /** Called when the user picks the Share action. Caller does the
   *  Share.share() dance and returns. We DO NOT close the modal so
   *  the user can still proceed to "Tout effacer" afterwards. */
  onSaveData: () => void;
  /** Called when the user picks "Tout effacer" — caller wires the
   *  store reset + navigation back to onboarding. */
  onConfirmReset: () => void;
  /** Backdrop / cancel — closes without resetting. */
  onCancel: () => void;
}

export function GoodbyeFarewell({ visible, onSaveData, onConfirmReset, onCancel }: GoodbyeFarewellProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.fullscreen, { backgroundColor: theme.background }]}>
        <Animated.View entering={FadeIn.duration(450)} style={styles.center}>
          {/* Bird illustration — the same saluting pet used as the
              app's mascot. ZoomIn springify gives a soft "the bird
              gently raises its wing" feel rather than a harsh cut. */}
          <Animated.View entering={ZoomIn.duration(600).springify().damping(16).mass(0.9)}>
            <Image
              source={require('../../assets/OrringBluePetNoBgSalute.png')}
              style={styles.bird}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Text style={[styles.title, { color: theme.text }]}>
              {t('farewellTitle', { defaultValue: 'On est triste de te voir partir 🌸' })}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {t('farewellBody', {
                defaultValue:
                  "Prends bien soin de toi. Si tu reviens un jour, on sera là.",
              })}
            </Text>
            <Text style={[styles.tip, { color: theme.textLight }]}>
              {t('farewellTip', {
                defaultValue:
                  "Avant de tout effacer, tu peux sauvegarder une copie de tes données pour les retrouver plus tard sur un autre téléphone.",
              })}
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(420).duration(450).springify()}
          style={styles.actionsBlock}
        >
          <Pressable
            onPress={onSaveData}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: theme.primarySoft },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.btnLabel, { color: theme.primaryDark }]}>
              💾 {t('farewellSaveCta', { defaultValue: 'Sauvegarder mes données' })}
            </Text>
          </Pressable>
          <Pressable
            onPress={onConfirmReset}
            style={({ pressed }) => [
              styles.btn,
              styles.btnDanger,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.btnDangerLabel}>
              👋 {t('farewellResetCta', { defaultValue: 'Tout effacer et partir' })}
            </Text>
          </Pressable>
          <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: theme.textSecondary }]}>
              {t('cancel', { defaultValue: 'Annuler' })}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  bird: { width: 140, height: 140 },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.black,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  body: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  tip: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    fontStyle: 'italic',
  },
  actionsBlock: { gap: spacing.sm },
  btn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  btnLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  btnDanger: { backgroundColor: '#FDE8E8' },
  btnDangerLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: '#C62828' },
  cancelLink: { alignItems: 'center', paddingTop: spacing.sm },
  cancelLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// (colors import is here only to keep the styles namespace tidy when
// the theme system grows — currently unused at module scope.)
void colors;
