import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTheme } from '../theme/useTheme';

const ITEM_HEIGHT = 52;
const VISIBLE_COUNT = 5; // must be odd

interface WheelProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}

function Wheel({ value, onChange, min, max, step = 1, format }: WheelProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const items: number[] = [];
  for (let i = min; i <= max; i += step) items.push(i);

  const padding = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

  useEffect(() => {
    // Scroll to current value on mount
    const idx = items.indexOf(value);
    if (idx >= 0) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false }), 50);
    }
  }, []);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    const newVal = items[clamped];
    if (newVal !== value) onChange(newVal);
    // Snap exactly
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.wheelContainer}>
      {/* Center highlight */}
      <View pointerEvents="none" style={[styles.wheelHighlight, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: padding }}
        nestedScrollEnabled
        overScrollMode="never"
        bounces={false}
      >
        {items.map((item) => {
          const isActive = item === value;
          return (
            <Pressable
              key={item}
              onPress={() => {
                onChange(item);
                const idx = items.indexOf(item);
                scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
              }}
              style={styles.wheelItem}
            >
              <Text style={[
                styles.wheelText,
                { color: isActive ? theme.primaryDark : theme.textLight },
                isActive && styles.wheelTextActive,
              ]}>
                {format ? format(item) : item.toString().padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface WheelTimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function WheelTimePicker({ hour, minute, onChange }: WheelTimePickerProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.wheels}>
        <Wheel value={hour} min={0} max={23} onChange={(h) => onChange(h, minute)} />
        <Text style={[styles.colon, { color: theme.primaryDark }]}>:</Text>
        <Wheel value={minute} min={0} max={55} step={5} onChange={(m) => onChange(hour, m)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  wheelContainer: {
    width: 80,
    height: ITEM_HEIGHT * VISIBLE_COUNT,
    position: 'relative',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2),
    height: ITEM_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    zIndex: -1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 30,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  wheelTextActive: {
    fontSize: 34,
    fontWeight: '800',
  },
  colon: {
    fontSize: 32,
    fontWeight: '800',
    marginHorizontal: 4,
    marginTop: -4,
  },
});
