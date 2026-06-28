from datetime import date

from pydantic import BaseModel


class LastWorkoutSummary(BaseModel):
    id: int
    name: str
    performed_at: date
    duration_minutes: int | None


class ExerciseRecord(BaseModel):
    exercise_id: int
    exercise_name: str
    performed_at: date
    max_weight: float
    max_reps: int
    best_e1rm: float


class TopExerciseByVolume(BaseModel):
    exercise_id: int
    exercise_name: str
    total_volume: float


class DashboardSummary(BaseModel):
    last_workout: LastWorkoutSummary | None
    workouts_this_week: int
    weekly_volume: float
    recent_records: list[ExerciseRecord]
    top_exercises_by_volume: list[TopExerciseByVolume]


class ExerciseProgressPoint(BaseModel):
    performed_at: date
    max_weight: float
    total_volume: float
    best_e1rm: float


class ExerciseProgress(BaseModel):
    exercise_id: int
    exercise_name: str
    total_sessions: int
    max_weight: float
    max_reps: int
    max_volume: float
    best_e1rm: float
    history: list[ExerciseProgressPoint]
