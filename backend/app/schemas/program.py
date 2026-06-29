from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProgramExerciseInput(BaseModel):
    exercise_id: int
    order_index: int = Field(default=0, ge=0)
    sets_count: int = Field(ge=1)
    min_reps: int | None = Field(default=None, ge=0)
    max_reps: int | None = Field(default=None, ge=0)
    target_weight: float | None = Field(default=None, ge=0)
    target_assistance_weight: float | None = Field(default=None, ge=0)
    target_added_weight: float | None = Field(default=None, ge=0)
    target_bodyweight: float | None = Field(default=None, ge=0)
    target_duration_seconds: int | None = Field(default=None, ge=0)
    target_distance_meters: float | None = Field(default=None, ge=0)
    target_calories: int | None = Field(default=None, ge=0)
    target_resistance_level: float | None = Field(default=None, ge=0)
    target_rpe: float | None = Field(default=None, ge=0, le=10)
    rest_seconds: int | None = Field(default=None, ge=0)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_repetition_range(self) -> "ProgramExerciseInput":
        if (
            self.min_reps is not None
            and self.max_reps is not None
            and self.min_reps > self.max_reps
        ):
            raise ValueError("min_reps must be less than or equal to max_reps")
        return self


class ProgramDayInput(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    order_index: int = Field(default=0, ge=0)
    exercises: list[ProgramExerciseInput] = Field(default_factory=list)


class ProgramCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    goal: str | None = Field(default=None, max_length=255)
    days_per_week: int = Field(ge=1, le=7)
    is_active: bool = True
    days: list[ProgramDayInput] = Field(default_factory=list)


class ProgramUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    goal: str | None = Field(default=None, max_length=255)
    days_per_week: int | None = Field(default=None, ge=1, le=7)
    is_active: bool | None = None
    days: list[ProgramDayInput] | None = None


class ProgramListResponse(BaseModel):
    items: list["ProgramRead"]
    total: int
    limit: int
    offset: int


class ProgramExerciseRead(ProgramExerciseInput):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_day_id: int


class ProgramDayRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    name: str
    order_index: int
    exercises: list[ProgramExerciseRead]


class ProgramRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    goal: str | None
    days_per_week: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    days: list[ProgramDayRead]
