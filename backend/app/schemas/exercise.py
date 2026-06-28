from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExerciseCreate(BaseModel):
    external_id: str | None = Field(default=None, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    body_part: str | None = Field(default=None, max_length=100)
    target: str | None = Field(default=None, max_length=100)
    muscle_group: str | None = Field(default=None, max_length=100)
    equipment: str | None = Field(default=None, max_length=100)
    instructions: str | None = None
    image_path: str | None = Field(default=None, max_length=500)
    gif_path: str | None = Field(default=None, max_length=500)
    source: str | None = Field(default=None, max_length=255)
    secondary_muscles: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name must not be empty")
        return value

    @field_validator("external_id")
    @classmethod
    def normalize_external_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class ExerciseUpdate(BaseModel):
    external_id: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    body_part: str | None = Field(default=None, max_length=100)
    target: str | None = Field(default=None, max_length=100)
    muscle_group: str | None = Field(default=None, max_length=100)
    equipment: str | None = Field(default=None, max_length=100)
    instructions: str | None = None
    image_path: str | None = Field(default=None, max_length=500)
    gif_path: str | None = Field(default=None, max_length=500)
    source: str | None = Field(default=None, max_length=255)
    secondary_muscles: list[str] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("name must not be empty")
        return value

    @field_validator("external_id")
    @classmethod
    def normalize_external_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SecondaryMuscleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    muscle_name: str


class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None
    name: str
    category: str | None
    body_part: str | None
    target: str | None
    muscle_group: str | None
    equipment: str | None
    instructions: str | None
    image_path: str | None
    gif_path: str | None
    source: str | None
    created_at: datetime
    updated_at: datetime
    secondary_muscles: list[SecondaryMuscleRead]


class UserExerciseUpdate(BaseModel):
    custom_name: str | None = Field(default=None, max_length=255)
    custom_notes: str | None = None
    is_hidden: bool = False
    is_favorite: bool = False


class UserExerciseRead(UserExerciseUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    exercise_id: int
    created_at: datetime
    updated_at: datetime
