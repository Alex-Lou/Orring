import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn, FadeOut,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import type { UpdateStatus } from '../hooks/useExpoUpdates';

interface Props {
  status: UpdateStatus;
  onApply: () => void;
}

/**
 * Floating OTA status pill, rendered in the top-right corner above every
 * screen. Three visual states:
 *
 *   checking / downloading → soft lavender spinner, no text, non-pressable
 *   ready                  → refresh glyph that breathes, tappable to apply
 *                            the downloaded bundle without force-closing
 *   everything else        → null (component unmounts cleanly)
 *
 * Designed to stay out of the user's way: 36×36, high z-index, subtle.
 */
export function UpdateIndicator({ status, onApply }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Breathing animation that both the spinner (rotate) and the refresh
  // button (scale) reuse — one shared value per mount.
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === 'checking' || status === 'downloading') {
      rotate.value = withRepeat(
        withTiming(360, { duration: 1100, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      rotate.value = 0;
    }
  }, [status]);

  useEffect(() => {
    if (status === 'ready') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = 1;
    }
  }, [status]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (status !== 'checking' && status !== 'downloading' && status !== 'ready') {
    return null;
  }

  const isReady = status === 'ready';
  const label = status === 'checking'
    ? t('updateChecking')
    : status === 'downloading'
      ? t('updateDownloading')
      : t('updateReady');

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[styles.wrapper, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={isReady ? onApply : undefined}
        disabled={!isReady}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={isReady ? t('updateReloadHint') : undefined}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: theme.surface,
            borderColor: isReady ? theme.primary : theme.border,
            opacity: pressed && isReady ? 0.85 : 1,
          },
        ]}
      >
        {isReady ? (
          <Animated.View style={pulseStyle}>
            <Text style={[styles.glyph, { color: theme.primary }]}>↻</Text>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.ring, { borderTopColor: theme.primary }, spinnerStyle]} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 10,
    zIndex: 500,
    elevation: 8,
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -1,
  },
});
