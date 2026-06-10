// Module-scope time-of-day helpers for the Home / "Mon Cycle" greeting header.
// Extracted verbatim from app/index.tsx (move-only) — behaviour unchanged.

// Time-based greeting
export function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'greetingMorning';
  if (h >= 12 && h < 18) return 'greetingAfternoon';
  if (h >= 18 && h < 21) return 'greetingEvening';
  return 'greetingNight';
}

// Greeting icon per time of day. All four slots share a consistent painterly
// style, tightly framed and uniformly sized.
//   - Morning (5h–12h): Matin.png    (sparrow on a branch, sunrise)
//   - Afternoon (12h–18h): ApresMidi.png (sun through clouds)
//   - Evening (18h–21h): Soir.png   (setting sun over the ocean)
//   - Night (21h–5h): Nuit.png      (crescent moon, starry sky)
export type GreetingIconKey = 'morning' | 'sun' | 'sunset' | 'night';
// Module-scope `require()` registry — Metro resolves each path once, at bundle
// time, and dedupes. Keeping these at the top level (vs. a conditional
// `require()` inside an IIFE) has proved more reliable on Android release
// builds where asset resolution inside deeply-nested render functions
// occasionally misses the static analysis pass.
export const GREETING_ICON_SRCS: Record<GreetingIconKey, number> = {
  morning: require('../../../assets/icones/Matin.png'),
  sun: require('../../../assets/icones/ApresMidi.png'),
  sunset: require('../../../assets/icones/Soir.png'),
  night: require('../../../assets/icones/Nuit.png'),
};
export function getGreetingIconKey(): GreetingIconKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'sun';
  if (h >= 18 && h < 21) return 'sunset';
  return 'night';
}

// Pet next to the greeting — awake variant in daytime, sleeping variant after 18h.
// Night adds a tiny zzz so the rest state is unambiguous.
export type PetState = 'none' | 'awake' | 'evening' | 'night';
export function getPetState(): PetState {
  const h = new Date().getHours();
  if (h >= 5 && h < 18) return 'awake';
  if (h >= 18 && h < 21) return 'evening';
  return 'night'; // 21h–5h
}
