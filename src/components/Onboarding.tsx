import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, FadeOut,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, withSpring,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import { fr, enUS, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';
import { useCycleStore } from '../store/cycleStore';
import { useTheme } from '../theme/useTheme';
import { LANGUAGES } from '../i18n/translations';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { WheelTimePicker } from './WheelTimePicker';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme';

const DATE_LOCALES: Record<string, any> = { fr, en: enUS, es, pt, de, ar, zh: zhCN, ja };

type Step = 'intro' | 'language' | 'date' | 'time' | 'name' | 'welcome';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [useToday, setUseToday] = useState(false);
  const [selHour, setSelHour] = useState(9);
  const [selMinute, setSelMinute] = useState(0);
  const [name, setName] = useState('');
  const [skipName, setSkipName] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const theme = useTheme();
  const { t, i18n: i18nHook } = useTranslation();
  const locale = DATE_LOCALES[i18nHook.language] || fr;
  const { language, setLanguage, insertRing, setUserName, completeOnboarding } = useCycleStore();

  // Intro auto-advance
  useEffect(() => {
    if (step === 'intro') {
      const tm = setTimeout(() => setStep('language'), 2600);
      return () => clearTimeout(tm);
    }
  }, [step]);

  const handleLanguagePick = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const goToDate = () => setStep('date');

  const handleToday = () => {
    setUseToday(true);
    setSelectedDay(new Date().getDate());
    setPickerDate(new Date());
    setStep('time');
  };

  const handleDateSelected = (day: number) => {
    setSelectedDay(day);
    setUseToday(false);
  };

  const handleConfirmDate = () => {
    if (selectedDay !== null) setStep('time');
  };

  const handleTimeConfirm = () => {
    setStep('name');
  };

  // On enregistre juste le nom temporairement; toutes les écritures importantes
  // (userName store, insertRing, completeOnboarding) sont faites APRÈS l'animation
  // de welcome pour éviter un re-render intermédiaire qui déclencherait MigrationFlow.
  const handleNameContinue = () => {
    setStep('welcome');
  };

  const handleWelcomeDone = () => {
    const finalName = skipName ? null : (name.trim() || null);

    // Build final date
    let finalDate: Date;
    if (useToday) {
      finalDate = new Date();
    } else if (selectedDay !== null) {
      finalDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), selectedDay);
    } else {
      finalDate = new Date();
    }
    finalDate.setHours(selHour, selMinute, 0, 0);

    // IMPORTANT : completeOnboarding AVANT insertRing pour éviter un état intermédiaire
    // où firstInsertDate est défini mais hasOnboarded=false → MigrationFlow parasite.
    setUserName(finalName);
    completeOnboarding();
    insertRing(finalDate.toISOString());
    onComplete();
  };

  // Render step
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {step === 'intro' && <IntroStep />}
      {step === 'language' && (
        <LanguageStep
          currentLang={language}
          onPick={handleLanguagePick}
          onNext={goToDate}
          t={t}
          theme={theme}
        />
      )}
      {step === 'date' && (
        <DateStep
          pickerDate={pickerDate}
          setPickerDate={setPickerDate}
          selectedDay={selectedDay}
          onSelectDay={handleDateSelected}
          onToday={handleToday}
          onConfirm={handleConfirmDate}
          showPicker={showPicker}
          setShowPicker={setShowPicker}
          locale={locale}
          t={t}
          theme={theme}
        />
      )}
      {step === 'time' && (
        <TimeStep
          hour={selHour}
          minute={selMinute}
          onChange={(h, m) => { setSelHour(h); setSelMinute(m); }}
          onConfirm={handleTimeConfirm}
          t={t}
          theme={theme}
        />
      )}
      {step === 'name' && (
        <NameStep
          name={name}
          setName={setName}
          skip={skipName}
          setSkip={setSkipName}
          onContinue={handleNameContinue}
          t={t}
          theme={theme}
        />
      )}
      {step === 'welcome' && (
        <WelcomeStep name={skipName ? null : (name.trim() || null)} onDone={handleWelcomeDone} t={t} theme={theme} />
      )}
    </SafeAreaView>
  );
}

// ─── Intro (2.6s animated logo + title) ───
function IntroStep() {
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
        <Image source={require('../../assets/OrringBluePetNoBgSalute.png')} style={styles.introLogo} resizeMode="contain" />
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

// ─── Language ───
function LanguageStep({ currentLang, onPick, onNext, t, theme }: any) {
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

// ─── Date ───
function DateStep({ pickerDate, setPickerDate, selectedDay, onSelectDay, onToday, onConfirm, showPicker, setShowPicker, locale, t, theme }: any) {
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

// ─── Time ───
function TimeStep({ hour, minute, onChange, onConfirm, t, theme }: any) {
  const insets = useSafeAreaInsets();
  const [touched, setTouched] = useState(false);

  const handleChange = (h: number, m: number) => {
    setTouched(true);
    onChange(h, m);
  };

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
          <WheelTimePicker hour={hour} minute={minute} onChange={handleChange} />
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: spacing.sm, backgroundColor: theme.background }}>
        <PulseButton
          onPress={onConfirm}
          label={t('onbConfirm')}
          theme={theme}
          active={touched || true}
        />
      </View>
    </Animated.View>
  );
}

// ─── Name ───
function NameStep({ name, setName, skip, setSkip, onContinue, t, theme }: any) {
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

// ─── Welcome (smooth appear/disappear + auto to app) ───
function WelcomeStep({ name, onDone, t, theme }: any) {
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
      <Animated.Text entering={FadeInUp.delay(300).duration(600)} style={[styles.welcomeText, { color: theme.primaryDark }]}>
        {line}
      </Animated.Text>
    </Animated.View>
  );
}

// ─── Pulse Button (animated when active) ───
function PulseButton({ onPress, label, theme, active }: any) {
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

// ─── Styles ───
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Intro
  introWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  introLogoWrap: {
    marginBottom: spacing.lg,
  },
  introLogo: {
    width: 140, height: 140, borderRadius: 70,
  },
  introTitle: {
    fontSize: 56, fontWeight: '900', color: '#7F6EBA', letterSpacing: -1.5,
  },
  introTagline: {
    fontSize: 28, marginTop: spacing.sm,
  },

  // Common step
  stepWrap: {
    flex: 1, padding: spacing.xl, paddingBottom: spacing.xl + 24, alignItems: 'center',
  },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.black, textAlign: 'center', letterSpacing: -0.5, marginTop: spacing.xl,
  },
  stepSub: {
    fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },

  // Language
  langGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md,
  },
  langCard: {
    width: 100, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center',
    borderWidth: 2, gap: 4, position: 'relative',
  },
  langFlag: { fontSize: 30 },
  langLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  langCheck: {
    position: 'absolute', top: 4, right: 8, fontSize: 12, fontWeight: '900',
  },

  // Date choices
  dateQuickWrap: {
    width: '100%', gap: spacing.md, marginTop: spacing.md,
  },
  bigChoice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    paddingVertical: 20, borderRadius: borderRadius.xl,
  },
  bigChoiceEmoji: { fontSize: 28 },
  bigChoiceLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold },

  // Calendar
  calWrap: { width: '100%', alignItems: 'center' },
  calNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%',
    marginBottom: spacing.sm,
  },
  calNavBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  calNavText: { fontSize: 24, fontWeight: '800', marginTop: -3 },
  calMonth: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textTransform: 'capitalize' },
  calWeekdays: {
    flexDirection: 'row', width: '100%', marginBottom: 6,
  },
  calWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: fontWeight.bold },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  calDayBubble: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: fontSize.md + 4,
  },
  calBackBtn: { paddingVertical: spacing.md, marginTop: spacing.sm },
  calBackText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  // Time
  timeDisplay: {
    marginTop: spacing.md, marginBottom: spacing.lg,
  },
  timeBig: {
    fontSize: 56, fontWeight: '900', letterSpacing: -2,
  },

  // Name
  nameInput: {
    width: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, borderRadius: borderRadius.lg, borderWidth: 1.5,
    textAlign: 'center', fontWeight: '600',
  },
  skipRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  skipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },

  // Welcome
  welcomeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  welcomeEmoji: { fontSize: 80, marginBottom: spacing.lg },
  welcomeText: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.black, textAlign: 'center', letterSpacing: -0.5,
  },

  // Pulse button
  pulseBtnWrap: {
    width: '100%', marginTop: 'auto', elevation: 0,
  },
  pulseBtn: {
    paddingVertical: 18, borderRadius: borderRadius.full, alignItems: 'center', width: '100%',
  },
  pulseBtnText: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 0.3,
  },
});
