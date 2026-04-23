import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

// `icon` accepte indifféremment une string emoji (ex: "♻️") ou un
// ReactNode (ex: <MetierIcon name="ring" size={40} />). Les strings sont
// enveloppées dans un <Text> pour garder le rendu historique ; tout le
// reste est rendu tel quel.
interface ActionButtonProps {
  icon: string | React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActionButton({ icon, label, color, bgColor, onPress }: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* web fallback */ }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, { backgroundColor: bgColor, borderColor: color }, animatedStyle]}
    >
      {typeof icon === 'string' ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : (
        <View style={styles.iconSlot}>{icon}</View>
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2.5,
    gap: spacing.sm,
    ...shadows.medium,
  },
  icon: {
    fontSize: 40,
  },
  iconSlot: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
