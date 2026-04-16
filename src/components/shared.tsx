import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../theme';

// ─── LegendItem (used in calendar, cycle, CalendarGrid) ───

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.text}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
});

// ─── EmptyState (used across all screens) ───

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={emptyStyles.container}>
      <Animated.Text entering={FadeIn.delay(200).duration(800)} style={emptyStyles.emoji}>
        {emoji}
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={emptyStyles.text}>
        {text}
      </Animated.Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  text: { fontSize: fontSize.lg, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
});

// ─── ModalOverlay (shared modal wrapper) ───

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <Pressable style={modalStyles.overlay} onPress={onClose}>
      <Pressable style={modalStyles.card}>
        {children}
      </Pressable>
    </Pressable>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg,
    width: '100%', maxWidth: 400, ...shadows.strong,
  },
});
