import { MINECRAFT_LANGUAGES } from "@/lib/minecraft-languages";

export type LocaleOption = {
  localeCode: string;
  englishName: string;
  nameInGame: string;
};

const LOCALE_PATTERN = /^[a-z]{2}_[a-z]{2}$/;

function uniqueLocaleOptions() {
  const seen = new Set<string>();
  const options: LocaleOption[] = [];

  for (const language of MINECRAFT_LANGUAGES) {
    const localeCode = language.localeCode.toLowerCase();
    if (!LOCALE_PATTERN.test(localeCode) || seen.has(localeCode)) continue;
    seen.add(localeCode);
    options.push({
      localeCode,
      englishName: language.englishName,
      nameInGame: language.nameInGame,
    });
  }

  return options.sort((left, right) => {
    if (left.englishName !== right.englishName) {
      return left.englishName.localeCompare(right.englishName);
    }
    return left.localeCode.localeCompare(right.localeCode);
  });
}

export const SUPPORTED_LOCALE_OPTIONS: readonly LocaleOption[] = uniqueLocaleOptions();
const SUPPORTED_LOCALE_SET = new Set(SUPPORTED_LOCALE_OPTIONS.map((item) => item.localeCode));

export function normalizeLocaleCode(value: string): string {
  return value.trim().toLowerCase();
}

export function isSupportedLocaleCode(value: string): boolean {
  return SUPPORTED_LOCALE_SET.has(normalizeLocaleCode(value));
}
