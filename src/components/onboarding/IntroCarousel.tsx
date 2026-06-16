import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInRight, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './Onboarding.styles';
import { PulseButton } from './PulseButton';

interface IntroCarouselProps {
  /** Called when the tour is finished or skipped → proceed to the name step. */
  onDone: () => void;
  t: (key: string) => string;
  theme: any;
}

// Each slide presents one main component. Title/body come from i18n
// (`intro_<key>_title` / `_body`), so the whole tour follows the detected
// language. Icons are Ionicons (no extra assets).
const SLIDES = [
  { key: 'welcome', icon: 'sparkles-outline' },
  { key: 'ring', icon: 'ellipse-outline' },
  { key: 'periods', icon: 'water-outline' },
  { key: 'reminders', icon: 'notifications-outline' },
  { key: 'privacy', icon: 'lock-closed-outline' },
] as const;

export function IntroCarousel({ onDone, t, theme }: IntroCarouselProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Skip — discreet, top corner */}
      <Pressable onPress={onDone} hitSlop={12} style={[styles.introSkip, { top: insets.top + 8 }]}>
        <Text style={[styles.introSkipText, { color: theme.textLight }]}>{t('introSkip')}</Text>
      </Pressable>

      <View style={styles.stepWrap}>
        {/* Slide content — re-mounts on index so each slide animates in. */}
        <Animated.View
          key={index}
          entering={SlideInRight.duration(350)}
          exiting={FadeOut.duration(120)}
          style={styles.introSlide}
        >
          <View style={[styles.introIconCircle, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={slide.icon as any} size={56} color={theme.primaryDark} />
          </View>
          <Text style={[styles.stepTitle, { color: theme.text }]}>{t(`intro_${slide.key}_title`)}</Text>
          <Text style={[styles.stepSub, { color: theme.textSecondary }]}>{t(`intro_${slide.key}_body`)}</Text>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.introDots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[styles.introDot, { backgroundColor: i === index ? theme.primary : theme.border }]}
            />
          ))}
        </View>

        <PulseButton onPress={next} label={isLast ? t('introStart') : t('introNext')} theme={theme} active />
      </View>
    </View>
  );
}
