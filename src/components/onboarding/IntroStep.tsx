import React, { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, {
  FadeIn, FadeInUp, FadeOut,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { styles } from './Onboarding.styles';

// ─── Intro (2.6s animated logo + title) ───
export function IntroStep() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(500)} style={styles.introWrap}>
      <Animated.View style={[styles.introLogoWrap, style]}>
        <Image source={require('../../../assets/OrringBluePetNoBgSalute.png')} style={styles.introLogo} resizeMode="contain" />
      </Animated.View>
      <Animated.Text entering={FadeInUp.delay(400).duration(700)} style={styles.introTitle}>
        Orring
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(900).duration(700)} style={styles.introTagline}>
        ✨
      </Animated.Text>
    </Animated.View>
  );
}
