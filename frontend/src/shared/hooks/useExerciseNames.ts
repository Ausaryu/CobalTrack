import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getExerciseById } from "../api/exercises";

export function useExerciseNames(exerciseIds: number[]): Map<number, string> {
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
    const map = new Map<number, string>();
    queries.forEach((query, index) => {
      if (query.data) map.set(uniqueIds[index], query.data.name);
    });
    return map;
  }, [queries, uniqueIds]);
}
