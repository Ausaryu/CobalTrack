from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserUpdate(BaseModel):
    current_bodyweight_kg: float | None = Field(default=None, ge=0, le=400)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    is_active: bool
    is_admin: bool
    current_bodyweight_kg: float | None
    created_at: datetime
    updated_at: datetime
