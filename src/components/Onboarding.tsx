import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDateFnsLocale } from '../i18n/dateLocales';
import { useCycleStore } from '../store/cycleStore';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { styles } from './onboarding/Onboarding.styles';
import { IntroStep } from './onboarding/IntroStep';
import { LanguageStep } from './onboarding/LanguageStep';
import { DateStep } from './onboarding/DateStep';
import { TimeStep } from './onboarding/TimeStep';
import { NameStep } from './onboarding/NameStep';
import { WelcomeStep } from './onboarding/WelcomeStep';


type Step = 'intro' | 'language' | 'date' | 'time' | 'name' | 'welcome';

interface OnboardingProps {
  onComplete: () => void;
  /**
   * 'ringOnly' = re-anchor the ring after the home "Recommencer" — starts at
   * the date step and skips language/name/welcome (already set). 'full' = a
   * brand-new user (factory state / Settings reset).
   */
  mode?: 'full' | 'ringOnly';
}

export function Onboarding({ onComplete, mode = 'full' }: OnboardingProps) {
  const ringOnly = mode === 'ringOnly';
  const [step, setStep] = useState<Step>(ringOnly ? 'date' : 'intro');
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
  const locale = getDateFnsLocale(i18nHook.language);
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

  // Build the chosen insertion datetime from the date + time steps.
  const buildFinalDate = (): Date => {
    let finalDate: Date;
    if (useToday) {
      finalDate = new Date();
    } else if (selectedDay !== null) {
      finalDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), selectedDay);
    } else {
      finalDate = new Date();
    }
    finalDate.setHours(selHour, selMinute, 0, 0);
    return finalDate;
  };

  const handleTimeConfirm = () => {
    if (ringOnly) {
      // Ring-only re-entry (home "Recommencer"): the cycle is already
      // onboarded, so just re-anchor the ring. Name / language / hasOnboarded
      // stay untouched — no welcome screen.
      insertRing(buildFinalDate().toISOString());
      onComplete();
      return;
    }
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

    // IMPORTANT : completeOnboarding AVANT insertRing pour éviter un état intermédiaire
    // où firstInsertDate est défini mais hasOnboarded=false → MigrationFlow parasite.
    setUserName(finalName);
    completeOnboarding();
    insertRing(buildFinalDate().toISOString());
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
          onChange={(h: number, m: number) => { setSelHour(h); setSelMinute(m); }}
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
