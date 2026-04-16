export const colors = {
  // Primary palette - lavande/pervenche
  primary: '#A697D9',
  primaryLight: '#D9D0EC',
  primaryDark: '#7F6EBA',
  primarySoft: '#F4F0FA',

  // Backgrounds
  background: '#F6F2FB',
  surface: '#FFFFFF',
  surfaceElevated: '#F0EAF7',

  // Status colors (teintes désaturées pour plus de cohérence)
  ringIn: '#9EC6A4',      // Vert sauge doux - anneau en place
  ringInLight: '#E5F0E7',
  ringOut: '#D4A5C5',     // Mauve rosé doux - pause/règles
  ringOutLight: '#F3E8EF',
  changeDay: '#E8B866',   // Doré doux - jour de changement
  changeDayLight: '#F9EDD4',

  // Text
  text: '#2D2A3A',
  textSecondary: '#8B8696',
  textLight: '#B0AABE',
  textOnPrimary: '#FFFFFF',

  // Misc
  border: '#ECE7F1',
  shadow: 'rgba(166, 151, 217, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.3)',
} as const;

export type Colors = typeof colors;
