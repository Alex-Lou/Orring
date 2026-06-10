import React, { useEffect } from 'react';
import { Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { styles } from './Onboarding.styles';

interface PulseButtonProps {
  onPress: () => void;
  label: string;
  theme: any;
  active: boolean;
}

// ─── Pulse Button (animated when active) ───
export function PulseButton({ onPress, label, theme, active }: PulseButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, false,
      );
      glow.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withTiming(1, { duration: 200 });
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.5,
    shadowRadius: glow.value * 16 + 4,
  }));

  return (
    <Animated.View style={[styles.pulseBtnWrap, animStyle, { shadowColor: theme.primary }]}>
      <Pressable
        onPress={active ? onPress : undefined}
        disabled={!active}
        style={({ pressed }) => [
          styles.pulseBtn,
          { backgroundColor: active ? theme.primary : theme.border },
          pressed && active && { opacity: 0.88, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={[styles.pulseBtnText, { color: active ? '#FFF' : theme.textLight }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
