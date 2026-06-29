from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkoutSetInput(BaseModel):
    order_index: int = Field(default=0, ge=0)
    weight: float | None = Field(default=None, ge=0)
    assistance_weight: float | None = Field(default=None, ge=0)
    added_weight: float | None = Field(default=None, ge=0)
    bodyweight: float | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    distance_meters: float | None = Field(default=None, ge=0)
    calories: int | None = Field(default=None, ge=0)
    resistance_level: float | None = Field(default=None, ge=0)
    rpe: float | None = Field(default=None, ge=0, le=10)
    rest_seconds: int | None = Field(default=None, ge=0)
    is_warmup: bool = False
    is_failure: bool = False
    notes: str | None = None


class WorkoutExerciseInput(BaseModel):
    exercise_id: int
    order_index: int = Field(default=0, ge=0)
    notes: str | None = None
    sets: list[WorkoutSetInput] = Field(default_factory=list)


class WorkoutCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    performed_at: date
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None
    perceived_difficulty: int | None = Field(default=None, ge=1, le=10)
    exercises: list[WorkoutExerciseInput] = Field(default_factory=list)


class WorkoutUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    performed_at: date | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None
    perceived_difficulty: int | None = Field(default=None, ge=1, le=10)
    exercises: list[WorkoutExerciseInput] | None = None


class WorkoutListResponse(BaseModel):
    items: list["WorkoutRead"]
    total: int
    limit: int
    offset: int


class WorkoutSetRead(WorkoutSetInput):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_exercise_id: int


class WorkoutExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_session_id: int
    exercise_id: int
    order_index: int
    notes: str | None
    sets: list[WorkoutSetRead]


class WorkoutRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    performed_at: date
    duration_minutes: int | None
    notes: str | None
    perceived_difficulty: int | None
    created_at: datetime
    updated_at: datetime
    exercises: list[WorkoutExerciseRead]
