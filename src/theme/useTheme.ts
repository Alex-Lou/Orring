import { useCycleStore } from '../store/cycleStore';

// Lavande/Pervenche palette — match landing page
const LIGHT = {
  // Fond : pervenche très clair (pas blanc pétant)
  background: '#F6F2FB',
  backgroundGradientStart: '#F6F2FB',
  backgroundGradientEnd: '#EAE2F5',
  surface: '#FFFFFF',
  surfaceElevated: '#F8F5FC',
  text: '#2D2A3A',
  textSecondary: '#8B8696',
  textLight: '#B0AABE',
  border: '#E2DAEC',
  primarySoft: '#EBE3F3',
  primary: '#A697D9',
  primaryDark: '#7F6EBA',
  primaryLight: '#D9D0EC',
  cardBg: '#FFFFFF',
};

const DARK = {
  background: '#1C1829',
  backgroundGradientStart: '#1C1829',
  backgroundGradientEnd: '#251F38',
  surface: '#2A2440',
  surfaceElevated: '#342E4D',
  text: '#EEE8F8',
  textSecondary: '#BDB4D2',
  textLight: '#8F86A8',
  border: '#443A5E',
  primarySoft: '#2E2746',
  primary: '#B5A5E2',
  primaryDark: '#C9BCEC',
  primaryLight: 'rgba(181,165,226,0.22)',
  cardBg: '#2A2440',
};

export function useTheme() {
  const dark = useCycleStore(s => s.darkMode);
  return dark ? DARK : LIGHT;
}
