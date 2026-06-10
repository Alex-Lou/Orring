import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { format } from 'date-fns';
import { spacing } from '../../theme';
import { styles } from './Onboarding.styles';
import { PulseButton } from './PulseButton';

interface DateStepProps {
  pickerDate: Date;
  setPickerDate: (d: Date) => void;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onToday: () => void;
  onConfirm: () => void;
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  locale: any;
  t: (key: string) => string;
  theme: any;
}

// ─── Date ───
export function DateStep({ pickerDate, setPickerDate, selectedDay, onSelectDay, onToday, onConfirm, showPicker, setShowPicker, locale, t, theme }: DateStepProps) {
  const insets = useSafeAreaInsets();
  const year = pickerDate.getFullYear();
  const month = pickerDate.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startPad = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const monthLabel = format(pickerDate, 'MMMM yyyy', { locale });
  const weekdays = ['weekdayMon','weekdayTue','weekdayWed','weekdayThu','weekdayFri','weekdaySat','weekdaySun'];

  const prev = () => setPickerDate(new Date(year, month - 1, 1));
  const next = () => {
    const n = new Date(year, month + 1, 1);
    if (n <= today) setPickerDate(n);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.md,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeInDown.duration(500)} style={[styles.stepTitle, { color: theme.text }]}>
          {t('onbDateTitle')}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={[styles.stepSub, { color: theme.textSecondary }]}>
          {t('onbDateSub')}
        </Animated.Text>

        {!showPicker ? (
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.dateQuickWrap}>
            <Pressable
              onPress={onToday}
              style={({ pressed }) => [
                styles.bigChoice,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={styles.bigChoiceEmoji}>📍</Text>
              <Text style={[styles.bigChoiceLabel, { color: '#FFF' }]}>{t('onbDateToday')}</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [
                styles.bigChoice,
                { backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.bigChoiceEmoji}>📅</Text>
              <Text style={[styles.bigChoiceLabel, { color: theme.primaryDark }]}>{t('onbDatePicker')}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.calWrap}>
            <View style={styles.calNav}>
              <Pressable onPress={prev} style={[styles.calNavBtn, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.calNavText, { color: theme.primaryDark }]}>‹</Text>
              </Pressable>
              <Text style={[styles.calMonth, { color: theme.text }]}>
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </Text>
              <Pressable onPress={next} style={[styles.calNavBtn, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.calNavText, { color: theme.primaryDark }]}>›</Text>
              </Pressable>
            </View>

            <View style={styles.calWeekdays}>
              {weekdays.map((k, i) => (
                <Text key={i} style={[styles.calWeekday, { color: theme.textLight }]}>{t(k)}</Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {Array.from({ length: startPad }).map((_, i) => <View key={`p${i}`} style={styles.calCell} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const date = new Date(year, month, d);
                const isFuture = date > today;
                const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isSelected = d === selectedDay;
                return (
                  <View key={d} style={styles.calCell}>
                    <Pressable
                      disabled={isFuture}
                      onPress={() => onSelectDay(d)}
                      style={({ pressed }) => [
                        styles.calDayBubble,
                        isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.primary },
                        isSelected && { backgroundColor: theme.primary },
                        isFuture && { opacity: 0.25 },
                        pressed && !isFuture && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={[
                        styles.calDay,
                        { color: theme.text },
                        isSelected && { color: '#FFF', fontWeight: '800' },
                      ]}>{d}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Pressable onPress={() => setShowPicker(false)} style={styles.calBackBtn}>
              <Text style={[styles.calBackText, { color: theme.textSecondary }]}>← {t('back')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: spacing.sm, backgroundColor: theme.background }}>
        <PulseButton
          onPress={onConfirm}
          label={t('onbConfirm')}
          theme={theme}
          active={selectedDay !== null}
        />
      </View>
    </Animated.View>
  );
}
