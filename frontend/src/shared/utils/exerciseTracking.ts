import type { ExerciseTrackingType, WorkoutSet } from "../api/types";

export const EXERCISE_TRACKING_TYPE_LABELS: Record<ExerciseTrackingType, string> = {
  WEIGHT_REPS: "Poids + répétitions",
  BODYWEIGHT_REPS: "Poids du corps",
  ASSISTED_BODYWEIGHT_REPS: "Assisté",
  ADDED_BODYWEIGHT_REPS: "Lesté",
  CARDIO: "Cardio",
  TIME: "Temps",
  REPS_ONLY: "Répétitions seules",
};

export const EXERCISE_TRACKING_TYPE_OPTIONS = Object.entries(
  EXERCISE_TRACKING_TYPE_LABELS,
).map(([value, label]) => ({
  value: value as ExerciseTrackingType,
  label,
}));

export function getExerciseTrackingTypeLabel(trackingType: ExerciseTrackingType): string {
  return EXERCISE_TRACKING_TYPE_LABELS[trackingType];
}

export interface TrackingFieldVisibility {
  weight: boolean;
  assistanceWeight: boolean;
  addedWeight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
  calories: boolean;
  resistance: boolean;
  rpe: boolean;
  rest: boolean;
}

const NO_FIELDS: TrackingFieldVisibility = {
  weight: false,
  assistanceWeight: false,
  addedWeight: false,
  reps: false,
  duration: false,
  distance: false,
  calories: false,
  resistance: false,
  rpe: false,
  rest: false,
};

export function getWorkoutTrackingFields(
  trackingType: ExerciseTrackingType,
): TrackingFieldVisibility {
  const common = { ...NO_FIELDS, rpe: true };
  switch (trackingType) {
    case "WEIGHT_REPS":
      return { ...common, weight: true, reps: true, rest: true };
    case "BODYWEIGHT_REPS":
      return { ...common, reps: true, rest: true };
    case "ASSISTED_BODYWEIGHT_REPS":
      return {
        ...common,
        assistanceWeight: true,
        reps: true,
        rest: true,
      };
    case "ADDED_BODYWEIGHT_REPS":
      return {
        ...common,
        addedWeight: true,
        reps: true,
        rest: true,
      };
    case "CARDIO":
      return {
        ...common,
        duration: true,
        distance: true,
        calories: true,
        resistance: true,
      };
    case "TIME":
      return { ...common, duration: true, rest: true };
    case "REPS_ONLY":
      return { ...common, reps: true, rest: true };
  }
}

export function getProgramTrackingFields(
  trackingType: ExerciseTrackingType,
): TrackingFieldVisibility {
  switch (trackingType) {
    case "WEIGHT_REPS":
      return { ...NO_FIELDS, weight: true, reps: true, rpe: true, rest: true };
    case "BODYWEIGHT_REPS":
      return { ...NO_FIELDS, reps: true, rpe: true, rest: true };
    case "ASSISTED_BODYWEIGHT_REPS":
      return {
        ...NO_FIELDS,
        assistanceWeight: true,
        reps: true,
        rpe: true,
        rest: true,
      };
    case "ADDED_BODYWEIGHT_REPS":
      return {
        ...NO_FIELDS,
        addedWeight: true,
        reps: true,
        rpe: true,
        rest: true,
      };
    case "CARDIO":
      return {
        ...NO_FIELDS,
        duration: true,
        distance: true,
        calories: true,
        resistance: true,
        rpe: true,
      };
    case "TIME":
      return { ...NO_FIELDS, duration: true, rpe: true, rest: true };
    case "REPS_ONLY":
      return { ...NO_FIELDS, reps: true, rpe: true, rest: true };
  }
}

export function usesBodyweightSnapshot(trackingType: ExerciseTrackingType): boolean {
  return [
    "BODYWEIGHT_REPS",
    "ASSISTED_BODYWEIGHT_REPS",
    "ADDED_BODYWEIGHT_REPS",
  ].includes(trackingType);
}

export function getWorkoutSetEffectiveWeight(
  trackingType: ExerciseTrackingType,
  set: WorkoutSet,
): number {
  switch (trackingType) {
    case "WEIGHT_REPS":
      return set.weight ?? 0;
    case "BODYWEIGHT_REPS":
      return set.bodyweight ?? 0;
    case "ASSISTED_BODYWEIGHT_REPS":
      return set.bodyweight !== null && set.assistance_weight !== null
        ? Math.max(set.bodyweight - set.assistance_weight, 0)
        : 0;
    case "ADDED_BODYWEIGHT_REPS":
      return (set.bodyweight ?? 0) + (set.added_weight ?? 0);
    case "CARDIO":
    case "TIME":
    case "REPS_ONLY":
      return 0;
  }
}

export function calculateWorkoutSetVolume(
  trackingType: ExerciseTrackingType,
  set: WorkoutSet,
): number {
  if (trackingType === "BODYWEIGHT_REPS" || trackingType === "REPS_ONLY") {
    return set.reps ?? 0;
  }
  if (trackingType === "CARDIO" || trackingType === "TIME") return 0;
  return getWorkoutSetEffectiveWeight(trackingType, set) * (set.reps ?? 0);
}
