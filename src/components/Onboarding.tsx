import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import { useCycleStore } from '../store/cycleStore';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { styles } from './onboarding/Onboarding.styles';
import { IntroStep } from './onboarding/IntroStep';
import { IntroCarousel } from './onboarding/IntroCarousel';
import { NameStep } from './onboarding/NameStep';
import { WelcomeStep } from './onboarding/WelcomeStep';

type Step = 'intro' | 'carousel' | 'name' | 'welcome';

// The 10 shipped languages. First run follows the phone's language if it's one
// of these, otherwise English.
const SUPPORTED = ['fr', 'en', 'nl', 'ru', 'es', 'pt', 'de', 'ar', 'zh', 'ja'];

interface OnboardingProps {
  onComplete: () => void;
}

/**
 * First-run flow: splash → animated intro carousel → name → welcome → home.
 *
 * Language is auto-detected from the device once, here (the user changes it
 * later in Settings — never re-detected after onboarding). No ring is forced:
 * the user lands on the empty home and inserts it whenever they want.
 */
export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [skipName, setSkipName] = useState(false);

  const theme = useTheme();
  const { t } = useTranslation();
  const { setLanguage, setUserName, completeOnboarding } = useCycleStore();

  // Detect the phone language ONCE on first run. If it's one of the 10 shipped
  // languages, the whole app (intro included) starts in it; otherwise English.
  // Persisted via setLanguage → the root layout keeps i18n in sync on every
  // boot. The user can override it later in Settings; we never re-detect.
  useEffect(() => {
    const device = Localization.getLocales?.()?.[0]?.languageCode?.toLowerCase();
    const lang = device && SUPPORTED.includes(device) ? device : 'en';
    setLanguage(lang);
    i18n.changeLanguage(lang);
  }, []);

  // Splash auto-advance → intro carousel.
  useEffect(() => {
    if (step === 'intro') {
      const tm = setTimeout(() => setStep('carousel'), 2600);
      return () => clearTimeout(tm);
    }
  }, [step]);

  const handleWelcomeDone = () => {
    const finalName = skipName ? null : (name.trim() || null);
    // No ring inserted here — the user starts on the empty home. Just persist
    // the name + mark onboarded.
    setUserName(finalName);
    completeOnboarding();
    onComplete();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {step === 'intro' && <IntroStep />}
      {step === 'carousel' && (
        <IntroCarousel onDone={() => setStep('name')} t={t} theme={theme} />
      )}
      {step === 'name' && (
        <NameStep
          name={name}
          setName={setName}
          skip={skipName}
          setSkip={setSkipName}
          onContinue={() => setStep('welcome')}
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
