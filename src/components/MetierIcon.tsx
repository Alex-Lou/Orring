import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// Petites icônes métier — un endroit unique pour résoudre les PNG du
// dossier `assets/iconesMetier/`, afin que chaque appelant se contente
// de choisir un nom sémantique et une taille. Les sources sont `require`
// une seule fois (dédup Metro) même si on en utilise plusieurs dizaines.
const SOURCES = {
  ring: require('../../assets/iconesMetier/IconeAnneau.png'),
  ringOut: require('../../assets/iconesMetier/IconeRetraitAnneau.png'),
  calendar: require('../../assets/iconesMetier/IconeCalendrier.png'),
  history: require('../../assets/iconesMetier/IconeHistorique.png'),
} as const;

export type MetierIconName = keyof typeof SOURCES;

interface MetierIconProps {
  name: MetierIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function MetierIcon({ name, size = 24, style }: MetierIconProps) {
  return (
    <Image
      source={SOURCES[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
