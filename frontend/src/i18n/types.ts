import { useTranslation } from 'react-i18next';

export type AppLang = 'ru' | 'en';
export const SUPPORTED_LANGS: AppLang[] = ['ru', 'en'];

export function useAppLang(): AppLang {
  const { i18n } = useTranslation();
  // Safe fallback if language is undefined during initial load
  if (!i18n.language) return 'ru';
  
  const lang = i18n.language.split('-')[0];
  return (SUPPORTED_LANGS as string[]).includes(lang) ? (lang as AppLang) : 'ru';
}
