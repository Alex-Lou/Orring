import { fr, enUS, nl, ru, es, pt, de, ar, zhCN, ja } from 'date-fns/locale';

/**
 * Single source of truth mapping app language codes → date-fns locales.
 * Was previously copy-pasted (map + import line) in six files.
 */
const DATE_LOCALES: Record<string, any> = { fr, en: enUS, nl, ru, es, pt, de, ar, zh: zhCN, ja };

/**
 * Resolve the date-fns locale for a language code, falling back to French
 * (the app's default language) for any unmapped code.
 */
export function getDateFnsLocale(lang: string): any {
  return DATE_LOCALES[lang] ?? fr;
}
