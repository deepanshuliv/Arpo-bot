export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie holding the reader's language choice (read on the server, so no flash). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
