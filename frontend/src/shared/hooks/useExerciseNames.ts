import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getExerciseById } from "../api/exercises";
import type { Exercise } from "../api/types";
import {
  getPreferredExerciseLanguage,
  getTranslatedExerciseName,
} from "../utils/exerciseTranslations";

export function useExercisesById(exerciseIds: number[]): Map<number, Exercise> {
  const uniqueIds = useMemo(
    () => [...new Set(exerciseIds)],
    // Stable dep: join to avoid re-running on same IDs in different order
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseIds.join(",")],
  );

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ["exercise", id] as const,
      queryFn: () => getExerciseById(id),
      staleTime: Infinity,
    })),
  });

  return useMemo(() => {
    const map = new Map<number, Exercise>();
    queries.forEach((query, index) => {
      if (query.data) map.set(uniqueIds[index], query.data);
    });
    return map;
  }, [queries, uniqueIds]);
}

export function useExerciseNames(exerciseIds: number[]): Map<number, string> {
  const preferredLanguage = getPreferredExerciseLanguage();
  const exercises = useExercisesById(exerciseIds);

  return useMemo(() => {
    const names = new Map<number, string>();
    exercises.forEach((exercise, id) => {
      names.set(id, getTranslatedExerciseName(exercise, preferredLanguage));
    });
    return names;
  }, [exercises, preferredLanguage]);
}
