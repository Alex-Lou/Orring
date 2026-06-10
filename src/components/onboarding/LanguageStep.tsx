import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { LANGUAGES } from '../../i18n/translations';
import { spacing } from '../../theme';
import { styles } from './Onboarding.styles';
import { PulseButton } from './PulseButton';

interface LanguageStepProps {
  currentLang: string;
  onPick: (code: string) => void;
  onNext: () => void;
  t: (key: string) => string;
  theme: any;
}

// ─── Language ───
export function LanguageStep({ currentLang, onPick, onNext, t, theme }: LanguageStepProps) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, alignItems: 'center' }}>
        <Animated.Text entering={FadeInDown.duration(500)} style={[styles.stepTitle, { color: theme.text }]}>
          {t('onbChooseLanguage')}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={[styles.stepSub, { color: theme.textSecondary }]}>
          {t('onbLanguageSub')}
        </Animated.Text>
      </View>

      <ScrollView contentContainerStyle={[styles.langGrid, { paddingBottom: spacing.md }]} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map(({ code, flag, label }, i) => (
          <Animated.View key={code} entering={FadeInUp.delay(200 + i * 50).duration(400)}>
            <Pressable
              onPress={() => onPick(code)}
              style={({ pressed }) => [
                styles.langCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                currentLang === code && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.langFlag}>{flag}</Text>
              <Text style={[styles.langLabel, { color: theme.text }, currentLang === code && { color: theme.primaryDark }]}>
                {label}
              </Text>
              {currentLang === code && <Text style={[styles.langCheck, { color: theme.primaryDark }]}>✓</Text>}
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: spacing.sm, backgroundColor: theme.background }}>
        <PulseButton onPress={onNext} label={t('onbContinue')} theme={theme} active />
      </View>
    </Animated.View>
  );
}
