from dataclasses import dataclass
from enum import Enum


class ExerciseTrackingType(str, Enum):
    WEIGHT_REPS = "WEIGHT_REPS"
    BODYWEIGHT_REPS = "BODYWEIGHT_REPS"
    ASSISTED_BODYWEIGHT_REPS = "ASSISTED_BODYWEIGHT_REPS"
    ADDED_BODYWEIGHT_REPS = "ADDED_BODYWEIGHT_REPS"
    CARDIO = "CARDIO"
    TIME = "TIME"
    REPS_ONLY = "REPS_ONLY"


BODYWEIGHT_TRACKING_TYPES = {
    ExerciseTrackingType.BODYWEIGHT_REPS,
    ExerciseTrackingType.ASSISTED_BODYWEIGHT_REPS,
    ExerciseTrackingType.ADDED_BODYWEIGHT_REPS,
}


@dataclass(frozen=True)
class SetTrackingMetrics:
    display_load: float | None
    effective_weight: float
    volume: float
    best_strength_value: float
    e1rm: float


def _e1rm(weight: float, reps: int | None) -> float:
    if weight <= 0 or not reps or reps <= 0:
        return 0.0
    return weight * (1 + reps / 30)


def calculate_set_tracking_metrics(
    tracking_type: ExerciseTrackingType,
    *,
    weight: float | None = None,
    assistance_weight: float | None = None,
    added_weight: float | None = None,
    bodyweight: float | None = None,
    reps: int | None = None,
    duration_seconds: int | None = None,
    distance_meters: float | None = None,
    calories: int | None = None,
    resistance_level: float | None = None,
) -> SetTrackingMetrics:
    effective_weight = 0.0
    display_load: float | None = None
    volume = 0.0
    best_strength_value = 0.0
    e1rm = 0.0

    if tracking_type == ExerciseTrackingType.WEIGHT_REPS:
        effective_weight = weight or 0.0
        display_load = weight
        volume = effective_weight * (reps or 0)
        e1rm = _e1rm(effective_weight, reps)
        best_strength_value = e1rm
    elif tracking_type == ExerciseTrackingType.BODYWEIGHT_REPS:
        effective_weight = bodyweight or 0.0
        display_load = bodyweight
        volume = float(reps or 0)
        best_strength_value = float(reps or 0)
    elif tracking_type == ExerciseTrackingType.ASSISTED_BODYWEIGHT_REPS:
        if bodyweight is not None and assistance_weight is not None:
            effective_weight = max(bodyweight - assistance_weight, 0.0)
        display_load = assistance_weight
        volume = effective_weight * (reps or 0)
        e1rm = _e1rm(effective_weight, reps)
        best_strength_value = effective_weight
    elif tracking_type == ExerciseTrackingType.ADDED_BODYWEIGHT_REPS:
        effective_weight = (bodyweight or 0.0) + (added_weight or 0.0)
        display_load = added_weight
        volume = effective_weight * (reps or 0)
        e1rm = _e1rm(effective_weight, reps)
        best_strength_value = added_weight or 0.0
    elif tracking_type == ExerciseTrackingType.CARDIO:
        display_load = resistance_level
        best_strength_value = float(
            distance_meters or duration_seconds or calories or resistance_level or 0
        )
    elif tracking_type == ExerciseTrackingType.TIME:
        best_strength_value = float(duration_seconds or 0)
    elif tracking_type == ExerciseTrackingType.REPS_ONLY:
        volume = float(reps or 0)
        best_strength_value = float(reps or 0)

    return SetTrackingMetrics(
        display_load=display_load,
        effective_weight=round(effective_weight, 2),
        volume=round(volume, 2),
        best_strength_value=round(best_strength_value, 2),
        e1rm=round(e1rm, 2),
    )


_EQUIPMENT_TRACKING_TYPES: dict[str, ExerciseTrackingType] = {
    "assisted": ExerciseTrackingType.ASSISTED_BODYWEIGHT_REPS,
    "body weight": ExerciseTrackingType.BODYWEIGHT_REPS,
    "stability ball": ExerciseTrackingType.BODYWEIGHT_REPS,
    "bosu ball": ExerciseTrackingType.BODYWEIGHT_REPS,
    "roller": ExerciseTrackingType.BODYWEIGHT_REPS,
    "wheel roller": ExerciseTrackingType.BODYWEIGHT_REPS,
    "weighted": ExerciseTrackingType.ADDED_BODYWEIGHT_REPS,
    "elliptical machine": ExerciseTrackingType.CARDIO,
    "stationary bike": ExerciseTrackingType.CARDIO,
    "stepmill machine": ExerciseTrackingType.CARDIO,
    "skierg machine": ExerciseTrackingType.CARDIO,
    "upper body ergometer": ExerciseTrackingType.CARDIO,
    "barbell": ExerciseTrackingType.WEIGHT_REPS,
    "dumbbell": ExerciseTrackingType.WEIGHT_REPS,
    "kettlebell": ExerciseTrackingType.WEIGHT_REPS,
    "cable": ExerciseTrackingType.WEIGHT_REPS,
    "ez barbell": ExerciseTrackingType.WEIGHT_REPS,
    "olympic barbell": ExerciseTrackingType.WEIGHT_REPS,
    "smith machine": ExerciseTrackingType.WEIGHT_REPS,
    "trap bar": ExerciseTrackingType.WEIGHT_REPS,
    "leverage machine": ExerciseTrackingType.WEIGHT_REPS,
    "hammer": ExerciseTrackingType.WEIGHT_REPS,
    "medicine ball": ExerciseTrackingType.WEIGHT_REPS,
    "tire": ExerciseTrackingType.WEIGHT_REPS,
    "rope": ExerciseTrackingType.WEIGHT_REPS,
    "sled machine": ExerciseTrackingType.WEIGHT_REPS,
    "band": ExerciseTrackingType.WEIGHT_REPS,
    "resistance band": ExerciseTrackingType.WEIGHT_REPS,
}


def normalize_equipment(equipment: str | None) -> str:
    return " ".join((equipment or "").strip().lower().split())


def infer_tracking_type(equipment: str | None) -> ExerciseTrackingType:
    return _EQUIPMENT_TRACKING_TYPES.get(
        normalize_equipment(equipment),
        ExerciseTrackingType.WEIGHT_REPS,
    )


def resolve_tracking_type(
    raw_tracking_type: object,
    equipment: str | None,
) -> ExerciseTrackingType:
    if isinstance(raw_tracking_type, ExerciseTrackingType):
        return raw_tracking_type
    if isinstance(raw_tracking_type, str):
        try:
            return ExerciseTrackingType(raw_tracking_type.strip().upper())
        except ValueError:
            pass
    return infer_tracking_type(equipment)
