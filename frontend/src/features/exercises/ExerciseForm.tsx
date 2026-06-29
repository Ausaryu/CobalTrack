import { useEffect, useState, type FormEvent } from "react";

import type {
  Exercise,
  ExerciseCreate,
  ExerciseTrackingType,
} from "../../shared/api/types";
import { Button } from "../../shared/components/Button";
import { SelectField } from "../../shared/components/SelectField";
import { TextareaField } from "../../shared/components/TextareaField";
import { TextField } from "../../shared/components/TextField";
import { EXERCISE_TRACKING_TYPE_OPTIONS } from "../../shared/utils/exerciseTracking";

type ExerciseFormTab = "information" | "translations";
type TranslationLanguage = "fr" | "en" | "it" | "tr";
type TranslationDocument = Record<string, Record<string, unknown>>;

const TRANSLATION_LANGUAGES: Array<{ value: TranslationLanguage; label: string }> = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "it", label: "Italiano" },
  { value: "tr", label: "Türkçe" },
];

const TRANSLATED_FIELDS = [
  "name",
  "category",
  "muscle_group",
  "body_part",
  "target",
  "equipment",
  "instructions",
] as const;

type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTranslations(rawTranslations: string | null | undefined): TranslationDocument {
  if (!rawTranslations) return {};
  try {
    const parsed = JSON.parse(rawTranslations) as unknown;
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, Record<string, unknown>] =>
        isRecord(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function serializeTranslations(translations: TranslationDocument): string | null {
  const cleaned: TranslationDocument = {};

  for (const [language, fields] of Object.entries(translations)) {
    const cleanedFields = { ...fields };
    for (const field of TRANSLATED_FIELDS) {
      const value = cleanedFields[field];
      if (typeof value !== "string") continue;
      const normalized = value.trim();
      if (normalized) cleanedFields[field] = normalized;
      else delete cleanedFields[field];
    }
    if (Object.keys(cleanedFields).length > 0) cleaned[language] = cleanedFields;
  }

  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

interface ExerciseFormProps {
  exercise?: Exercise;
  isPending: boolean;
  error?: string;
  onSubmit: (payload: ExerciseCreate) => void;
  onCancel: () => void;
}

export function ExerciseForm({
  exercise,
  isPending,
  error,
  onSubmit,
  onCancel,
}: ExerciseFormProps) {
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [category, setCategory] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [target, setTarget] = useState("");
  const [equipment, setEquipment] = useState("");
  const [trackingType, setTrackingType] =
    useState<ExerciseTrackingType>("WEIGHT_REPS");
  const [instructions, setInstructions] = useState("");
  const [secondaryMuscles, setSecondaryMuscles] = useState("");
  const [activeTab, setActiveTab] = useState<ExerciseFormTab>("information");
  const [translationLanguage, setTranslationLanguage] =
    useState<TranslationLanguage>("fr");
  const [translations, setTranslations] = useState<TranslationDocument>({});
  const [translationsTouched, setTranslationsTouched] = useState(false);

  useEffect(() => {
    setName(exercise?.name || "");
    setExternalId(exercise?.external_id || "");
    setCategory(exercise?.category || "");
    setMuscleGroup(exercise?.muscle_group || "");
    setBodyPart(exercise?.body_part || "");
    setTarget(exercise?.target || "");
    setEquipment(exercise?.equipment || "");
    setTrackingType(exercise?.tracking_type || "WEIGHT_REPS");
    setInstructions(exercise?.instructions || "");
    setSecondaryMuscles(
      exercise?.secondary_muscles.map((muscle) => muscle.muscle_name).join(", ") || "",
    );
    setTranslations(parseTranslations(exercise?.translations));
    setTranslationsTouched(false);
    setActiveTab("information");
    setTranslationLanguage("fr");
  }, [exercise]);

  function getTranslationValue(field: TranslatedField): string {
    const value = translations[translationLanguage]?.[field];
    return typeof value === "string" ? value : "";
  }

  function updateTranslation(field: TranslatedField, value: string) {
    setTranslations((current) => {
      const next = { ...current };
      const localizedFields = { ...(current[translationLanguage] || {}) };
      if (value) localizedFields[field] = value;
      else delete localizedFields[field];

      if (Object.keys(localizedFields).length > 0) next[translationLanguage] = localizedFields;
      else delete next[translationLanguage];
      return next;
    });
    setTranslationsTouched(true);
  }

  function languageHasValues(language: TranslationLanguage): boolean {
    const fields = translations[language];
    return Boolean(
      fields &&
        TRANSLATED_FIELDS.some(
          (field) => typeof fields[field] === "string" && Boolean(fields[field].trim()),
        ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      external_id: externalId.trim() || null,
      category: category.trim() || null,
      muscle_group: muscleGroup.trim() || null,
      body_part: bodyPart.trim() || null,
      target: target.trim() || null,
      equipment: equipment.trim() || null,
      tracking_type: trackingType,
      instructions: instructions.trim() || null,
      translations: translationsTouched
        ? serializeTranslations(translations)
        : exercise?.translations || null,
      secondary_muscles: secondaryMuscles
        .split(",")
        .map((muscle) => muscle.trim())
        .filter(Boolean),
    });
  }

  return (
    <section className="content-panel form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Référentiel global</p>
          <h2>{exercise ? "Modifier l’exercice" : "Nouvel exercice"}</h2>
        </div>
        <Button variant="ghost" size="small" onClick={onCancel}>Fermer</Button>
      </div>

      <p className="notice notice-warning">
        Cet exercice appartient au référentiel global. Ses modifications sont visibles par tous
        les utilisateurs authentifiés du MVP.
      </p>

      <form className="exercise-form" onSubmit={handleSubmit}>
        <div className="exercise-form-tabs" role="tablist" aria-label="Sections du formulaire">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "information"}
            aria-controls="exercise-information-panel"
            className={activeTab === "information" ? "active" : ""}
            onClick={() => setActiveTab("information")}
          >
            Informations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "translations"}
            aria-controls="exercise-translations-panel"
            className={activeTab === "translations" ? "active" : ""}
            onClick={() => setActiveTab("translations")}
          >
            Traductions
          </button>
        </div>

        {activeTab === "information" ? (
          <div
            id="exercise-information-panel"
            className="form-layout exercise-form-tab-panel"
            role="tabpanel"
          >
            <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField
              label="Identifiant externe"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              hint="Optionnel et unique"
            />
            <TextField label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} />
            <TextField
              label="Groupe musculaire"
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
            />
            <TextField label="Partie du corps" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} />
            <TextField label="Cible" value={target} onChange={(e) => setTarget(e.target.value)} />
            <TextField label="Équipement" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
            <SelectField
              label="Type de suivi"
              value={trackingType}
              onChange={(event) =>
                setTrackingType(event.target.value as ExerciseTrackingType)
              }
              options={EXERCISE_TRACKING_TYPE_OPTIONS}
            />
            <TextField
              label="Muscles secondaires"
              value={secondaryMuscles}
              onChange={(e) => setSecondaryMuscles(e.target.value)}
              hint="Séparés par des virgules"
            />
            <TextareaField
              label="Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />
          </div>
        ) : (
          <div
            id="exercise-translations-panel"
            className="exercise-form-tab-panel"
            role="tabpanel"
          >
            <p className="translation-help">
              Ajoutez uniquement les traductions disponibles. Les champs natifs restent inchangés.
            </p>
            <div className="translation-language-tabs" aria-label="Langue de traduction">
              {TRANSLATION_LANGUAGES.map((language) => (
                <button
                  type="button"
                  className={`${translationLanguage === language.value ? "active" : ""}${languageHasValues(language.value) ? " has-values" : ""}`}
                  key={language.value}
                  onClick={() => setTranslationLanguage(language.value)}
                >
                  {language.label}
                </button>
              ))}
            </div>
            <div className="form-layout translation-fields">
              <TextField
                label="Nom traduit"
                value={getTranslationValue("name")}
                onChange={(event) => updateTranslation("name", event.target.value)}
              />
              <TextField
                label="Catégorie"
                value={getTranslationValue("category")}
                onChange={(event) => updateTranslation("category", event.target.value)}
              />
              <TextField
                label="Groupe musculaire"
                value={getTranslationValue("muscle_group")}
                onChange={(event) => updateTranslation("muscle_group", event.target.value)}
              />
              <TextField
                label="Partie du corps"
                value={getTranslationValue("body_part")}
                onChange={(event) => updateTranslation("body_part", event.target.value)}
              />
              <TextField
                label="Cible"
                value={getTranslationValue("target")}
                onChange={(event) => updateTranslation("target", event.target.value)}
              />
              <TextField
                label="Équipement"
                value={getTranslationValue("equipment")}
                onChange={(event) => updateTranslation("equipment", event.target.value)}
              />
              <TextareaField
                label="Instructions"
                value={getTranslationValue("instructions")}
                onChange={(event) => updateTranslation("instructions", event.target.value)}
                rows={5}
              />
            </div>
          </div>
        )}

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? "Enregistrement…" : exercise ? "Enregistrer" : "Créer l’exercice"}
          </Button>
        </div>
      </form>
    </section>
  );
}
