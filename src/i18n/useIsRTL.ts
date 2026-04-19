import { useTranslation } from 'react-i18next';

/**
 * True when the active UI language reads right-to-left (Arabic, Hebrew, Farsi,
 * Urdu, …). i18next's built-in `dir()` already knows the canonical RTL code
 * list, so we defer to it instead of maintaining our own.
 *
 * Used to mirror mascot + emoji placement so the layout feels natural in both
 * reading directions — the bird that lives on the left of a title in French
 * should live on the right of that title in Arabic.
 */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return i18n.dir() === 'rtl';
}
