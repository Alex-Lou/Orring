import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCycleStore } from '../store/cycleStore';
import { useTheme } from '../theme/useTheme';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { styles } from './onboarding/Onboarding.styles';
import { IntroStep } from './onboarding/IntroStep';
import { LanguageStep } from './onboarding/LanguageStep';
import { NameStep } from './onboarding/NameStep';
import { WelcomeStep } from './onboarding/WelcomeStep';

type Step = 'intro' | 'language' | 'name' | 'welcome';

interface OnboardingProps {
  onComplete: () => void;
}

/**
 * First-run flow: splash → language → name → welcome.
 *
 * It NO LONGER inserts a ring. The user lands on the (empty) home and decides
 * when — or whether — to insert it; ring insertion happens there via
 * ConfirmActionModal. Someone who only wants to track periods, or just explore,
 * is never forced through a ring setup. We only persist language + name and
 * mark `hasOnboarded`.
 */
export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [skipName, setSkipName] = useState(false);

  const theme = useTheme();
  const { t } = useTranslation();
  const { language, setLanguage, setUserName, completeOnboarding } = useCycleStore();

  // Intro auto-advance (splash → language).
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

  const goToName = () => setStep('name');
  const handleNameContinue = () => setStep('welcome');

  const handleWelcomeDone = () => {
    const finalName = skipName ? null : (name.trim() || null);
    // No ring inserted here — the user starts on the empty home and chooses
    // when (or if) to insert. Just persist the name + mark onboarded.
    setUserName(finalName);
    completeOnboarding();
    onComplete();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {step === 'intro' && <IntroStep />}
      {step === 'language' && (
        <LanguageStep
          currentLang={language}
          onPick={handleLanguagePick}
          onNext={goToName}
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
