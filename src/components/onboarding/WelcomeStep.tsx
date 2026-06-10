import React, { useEffect } from 'react';
import Animated, { FadeIn, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { styles } from './Onboarding.styles';

interface WelcomeStepProps {
  name: string | null;
  onDone: () => void;
  t: (key: string) => string;
  theme: any;
}

// ─── Welcome (smooth appear/disappear + auto to app) ───
export function WelcomeStep({ name, onDone, t, theme }: WelcomeStepProps) {
  useEffect(() => {
    const tm = setTimeout(onDone, 2400);
    return () => clearTimeout(tm);
  }, []);

  const line = name ? `${t('onbWelcome')}, ${name} !` : t('onbWelcomeAnon');

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(500)}
      style={styles.welcomeWrap}
    >
      <Animated.Image
        entering={ZoomIn.delay(150).duration(700).springify()}
        source={require('../../../assets/OrringBluePetNoBgSalute.png')}
        style={styles.welcomeBird}
        resizeMode="contain"
      />
      <Animated.Text entering={FadeInUp.delay(300).duration(600)} style={[styles.welcomeText, { color: theme.primaryDark }]}>
        {line}
      </Animated.Text>
    </Animated.View>
  );
}
