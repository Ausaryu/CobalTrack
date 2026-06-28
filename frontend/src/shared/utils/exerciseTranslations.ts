import type { Exercise } from "../api/types";

export type ExerciseLanguage = "fr" | "en" | "it" | "tr";

export type TranslatedExerciseField =
  | "name"
  | "category"
  | "body_part"
  | "target"
  | "muscle_group"
  | "equipment"
  | "instructions";

const STORAGE_KEY = "cobaltrack.exerciseLanguage";
const SUPPORTED_LANGUAGES: ExerciseLanguage[] = ["fr", "en", "it", "tr"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed !== text) return normalizeText(parsed);
      } catch {
        return null;
      }
    }
    return text;
  }

  if (Array.isArray(value)) {
    const lines = value
      .map((item) => normalizeText(item))
      .filter((item): item is string => item !== null);
    return lines.join("\n") || null;
  }

  return null;
}

function parseTranslations(rawTranslations: string | null): Record<string, unknown> {
  if (!rawTranslations) return {};
  try {
    const parsed = JSON.parse(rawTranslations) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getLanguageField(
  translations: Record<string, unknown>,
  language: string,
  field: TranslatedExerciseField,
): string | null {
  const localizedFields = translations[language];
  if (!isRecord(localizedFields)) return null;
  return normalizeText(localizedFields[field]);
}

function normalizeNativeField(
  value: string | null,
  preferredLanguage: ExerciseLanguage,
): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return text || null;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      return (
        normalizeText(parsed[preferredLanguage]) ||
        normalizeText(parsed.en) ||
        Object.values(parsed).map(normalizeText).find(Boolean) ||
        null
      );
    }
    return normalizeText(parsed);
  } catch {
    return null;
  }
}

export function getPreferredExerciseLanguage(): ExerciseLanguage {
  if (typeof window === "undefined") return "fr";
  try {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(storedLanguage as ExerciseLanguage)
      ? (storedLanguage as ExerciseLanguage)
      : "fr";
  } catch {
    return "fr";
  }
}

export function setPreferredExerciseLanguage(language: ExerciseLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The current page still updates even when storage is unavailable.
  }
}

export function getTranslatedExerciseField(
  exercise: Exercise,
  field: TranslatedExerciseField,
  preferredLanguage: ExerciseLanguage = getPreferredExerciseLanguage(),
): string | null {
  const translations = parseTranslations(exercise.translations);

  return (
    getLanguageField(translations, preferredLanguage, field) ||
    getLanguageField(translations, "en", field) ||
    normalizeNativeField(exercise[field], preferredLanguage) ||
    Object.keys(translations)
      .map((language) => getLanguageField(translations, language, field))
      .find((value): value is string => value !== null) ||
    null
  );
}
