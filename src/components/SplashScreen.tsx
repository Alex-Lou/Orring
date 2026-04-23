import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  FadeIn, FadeInUp, FadeOut,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import type { UpdateStatus } from '../hooks/useExpoUpdates';

/**
 * Shown during the 1–3 seconds of app boot: while the persisted store
 * hydrates from AsyncStorage, and while expo-updates silently checks
 * for a newer JS bundle on the EAS server.
 *
 * Visually: pulsing logo → fade-up title → thin progress bar that fills
 * as the boot steps advance, with a live percentage. Matches the pink/
 * lavender brand so it doesn't look like a loader bolted on last minute.
 *
 * The component only *displays* progress — the parent controls the
 * `progress` value between 0 and 1 based on the real boot state.
 */
interface Props {
  /** Target progression in [0, 1]. Component smoothly animates towards it. */
  progress: number;
  /** Current OTA check state — drives the contextual status line. */
  updateStatus?: UpdateStatus;
}

const ANIM_MS = 450;

export function SplashScreen({ progress, updateStatus = 'idle' }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Logo breath animation — never stops while the splash is visible.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Smoothly animate the bar width towards the target progress.
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: ANIM_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  // Displayed integer percentage tweens to follow the bar.
  const [displayPct, setDisplayPct] = useState(() => Math.round(progress * 100));
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const target = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    const start = displayPct;
    const startAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startAt;
      const t = Math.min(1, elapsed / ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 2);
      const next = Math.round(start + (target - start) * eased);
      setDisplayPct(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick) as unknown as number;
    };
    rafRef.current = requestAnimationFrame(tick) as unknown as number;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <Animated.View
      style={[styles.root, { backgroundColor: theme.background }]}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(350)}
    >
      {/* Wrapper non-animé en premier pour garantir que l'image apparaît
          dès le premier frame, même si la worklet Reanimated n'a pas
          encore calculé la scale de pulse. L'animation de "respiration"
          est appliquée sur un wrapper interne. */}
      <View style={styles.logoWrap}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/LandingIcon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeInUp.delay(180).duration(520)}
        style={[styles.title, { color: theme.primaryDark }]}
      >
        Orring
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(340).duration(520)}
        style={styles.sparkle}
      >
        ✨
      </Animated.Text>

      <View style={styles.progressBlock}>
        <View style={[styles.track, { backgroundColor: theme.primarySoft }]}>
          <Animated.View
            style={[
              styles.fill,
              barStyle,
              { backgroundColor: theme.primary },
            ]}
          />
        </View>
        <Text style={[styles.percentage, { color: theme.textSecondary }]}>
          {displayPct}%
        </Text>

        {(updateStatus === 'checking' || updateStatus === 'downloading') && (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(150)}
            style={styles.updateBlock}
          >
            <Text style={[styles.updateMain, { color: theme.primaryDark }]}>
              {updateStatus === 'checking' ? t('updateChecking') : t('updateInstalling')}
            </Text>
            <Text style={[styles.updateSub, { color: theme.textSecondary }]}>
              {t('updateWait')}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    // LandingIcon already bakes its own concentric pastel rings into the
    // PNG — no need for a circular clip that would crop the outer ring.
    // Slightly larger footprint so the artwork reads at the weight of the
    // old circular logo.
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  sparkle: {
    fontSize: 26,
    marginTop: 4,
  },
  progressBlock: {
    marginTop: 56,
    width: '70%',
    maxWidth: 280,
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  percentage: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  updateBlock: {
    marginTop: 18,
    alignItems: 'center',
  },
  updateMain: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  updateSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
});
