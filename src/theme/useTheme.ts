import { useCycleStore } from '../store/cycleStore';

// Lavande/Pervenche palette — match landing page
const LIGHT = {
  // Fond principal : pervenche tenue (volontairement PAS blanc — Alex
  // trouvait le fond encore trop éclatant en #F4F0FA, quasi blanc). On
  // descend nettement vers le lavande pour adoucir la luminosité globale,
  // tout en gardant les surfaces/cartes claires juste au-dessus (contraste
  // doux carte↔fond, sans blanc pétant).
  background: '#E7DDF0',
  backgroundGradientStart: '#E7DDF0',
  backgroundGradientEnd: '#DACEEB',
  // Cards/surfaces: a lavender-tinted off-white, NOT bright white. Once the
  // background went lavender the old near-white #FBF9FE cards became the
  // glaring element; these sit gently above the bg (cards still pop via
  // their shadow) without the harsh white slab.
  surface: '#F2ECF9',
  surfaceElevated: '#EAE2F4',
  text: '#2D2A3A',
  textSecondary: '#8B8696',
  textLight: '#B0AABE',
  border: '#E2DAEC',
  primarySoft: '#EBE3F3',
  primary: '#A697D9',
  primaryDark: '#7F6EBA',
  primaryLight: '#D9D0EC',
  cardBg: '#F2ECF9',
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
