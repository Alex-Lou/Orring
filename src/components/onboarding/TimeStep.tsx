import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { WheelTimePicker } from '../WheelTimePicker';
import { spacing } from '../../theme';
import { styles } from './Onboarding.styles';
import { PulseButton } from './PulseButton';

interface TimeStepProps {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  onConfirm: () => void;
  t: (key: string) => string;
  theme: any;
}

// ─── Time ───
export function TimeStep({ hour, minute, onChange, onConfirm, t, theme }: TimeStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeInDown.duration(500)} style={[styles.stepTitle, { color: theme.text }]}>
          {t('onbTimeTitle')}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={[styles.stepSub, { color: theme.textSecondary }]}>
          {t('onbTimeSub')}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.timeDisplay}>
          <Text style={[styles.timeBig, { color: theme.primaryDark }]}>
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(500)}>
          <WheelTimePicker hour={hour} minute={minute} onChange={onChange} />
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: spacing.sm, backgroundColor: theme.background }}>
        <PulseButton
          onPress={onConfirm}
          label={t('onbConfirm')}
          theme={theme}
          active
        />
      </View>
    </Animated.View>
  );
}
