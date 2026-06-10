import React from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { spacing } from '../../theme';
import { styles } from './Onboarding.styles';
import { PulseButton } from './PulseButton';

interface NameStepProps {
  name: string;
  setName: (v: string) => void;
  skip: boolean;
  setSkip: (v: boolean) => void;
  onContinue: () => void;
  t: (key: string) => string;
  theme: any;
}

// ─── Name ───
export function NameStep({ name, setName, skip, setSkip, onContinue, t, theme }: NameStepProps) {
  const insets = useSafeAreaInsets();
  const canContinue = skip || name.trim().length > 0;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.Text entering={FadeInDown.duration(500)} style={[styles.stepTitle, { color: theme.text }]}>
          {t('onbNameTitle')}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={[styles.stepSub, { color: theme.textSecondary }]}>
          {t('onbNameSub')}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={{ width: '100%' }}>
          <TextInput
            value={name}
            onChangeText={(v) => { setName(v); if (v.length > 0) setSkip(false); }}
            placeholder={t('onbNamePlaceholder')}
            placeholderTextColor={theme.textLight}
            editable={!skip}
            style={[
              styles.nameInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
              skip && { opacity: 0.45 },
            ]}
            maxLength={24}
          />

          <Pressable
            onPress={() => { setSkip(!skip); if (!skip) setName(''); }}
            style={styles.skipRow}
          >
            <View style={[
              styles.checkbox,
              { borderColor: theme.primary },
              skip && { backgroundColor: theme.primary },
            ]}>
              {skip && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.skipLabel, { color: theme.textSecondary }]}>{t('onbSkipName')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: spacing.sm, backgroundColor: theme.background }}>
        <PulseButton onPress={onContinue} label={t('onbContinue')} theme={theme} active={canContinue} />
      </View>
    </Animated.View>
  );
}
