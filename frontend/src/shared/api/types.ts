export interface User {
  id: number;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  current_bodyweight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export type RegisterPayload = LoginPayload;

export interface UserUpdatePayload {
  current_bodyweight_kg: number | null;
}

export interface SecondaryMuscle {
  id: number;
  muscle_name: string;
}

export type ExerciseTrackingType =
  | "WEIGHT_REPS"
  | "BODYWEIGHT_REPS"
  | "ASSISTED_BODYWEIGHT_REPS"
  | "ADDED_BODYWEIGHT_REPS"
  | "CARDIO"
  | "TIME"
  | "REPS_ONLY";

export interface Exercise {
  id: number;
  external_id: string | null;
  name: string;
  category: string | null;
  body_part: string | null;
  target: string | null;
  muscle_group: string | null;
  equipment: string | null;
  tracking_type: ExerciseTrackingType;
  instructions: string | null;
  translations: string | null;
  image_path: string | null;
  gif_path: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  secondary_muscles: SecondaryMuscle[];
}

export interface ExerciseListResponse {
  items: Exercise[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExerciseFiltersResponse {
  muscle_groups: string[];
  equipment: string[];
}

export interface ExerciseCreate {
  external_id?: string | null;
  name: string;
  category?: string | null;
  body_part?: string | null;
  target?: string | null;
  muscle_group?: string | null;
  equipment?: string | null;
  tracking_type?: ExerciseTrackingType;
  instructions?: string | null;
  translations?: string | null;
  image_path?: string | null;
  gif_path?: string | null;
  source?: string | null;
  secondary_muscles?: string[];
}

export type ExerciseUpdate = Partial<ExerciseCreate>;

export interface UserExerciseUpdate {
  custom_name?: string | null;
  custom_notes?: string | null;
  is_hidden?: boolean;
  is_favorite?: boolean;
}

export interface UserExercise extends Required<UserExerciseUpdate> {
  id: number;
  user_id: number;
  exercise_id: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSet {
  id: number;
  workout_exercise_id: number;
  order_index: number;
  weight: number | null;
  assistance_weight: number | null;
  added_weight: number | null;
  bodyweight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  resistance_level: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  is_warmup: boolean;
  is_failure: boolean;
  notes: string | null;
}

export interface WorkoutExercise {
  id: number;
  workout_session_id: number;
  exercise_id: number;
  order_index: number;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  name: string;
  performed_at: string;
  duration_minutes: number | null;
  notes: string | null;
  perceived_difficulty: number | null;
  created_at: string;
  updated_at: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutListResponse {
  items: WorkoutSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface WorkoutSetCreate {
  order_index?: number;
  weight?: number | null;
  assistance_weight?: number | null;
  added_weight?: number | null;
  bodyweight?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  calories?: number | null;
  resistance_level?: number | null;
  rpe?: number | null;
  rest_seconds?: number | null;
  is_warmup?: boolean;
  is_failure?: boolean;
  notes?: string | null;
}

export interface WorkoutExerciseCreate {
  exercise_id: number;
  order_index?: number;
  notes?: string | null;
  sets?: WorkoutSetCreate[];
}

export interface WorkoutCreate {
  name: string;
  performed_at: string;
  duration_minutes?: number | null;
  notes?: string | null;
  perceived_difficulty?: number | null;
  exercises?: WorkoutExerciseCreate[];
}

export type WorkoutUpdate = Partial<WorkoutCreate>;

export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  order_index: number;
  sets_count: number;
  min_reps: number | null;
  max_reps: number | null;
  target_weight: number | null;
  target_assistance_weight: number | null;
  target_added_weight: number | null;
  target_bodyweight: number | null;
  target_duration_seconds: number | null;
  target_distance_meters: number | null;
  target_calories: number | null;
  target_resistance_level: number | null;
  target_rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface ProgramDay {
  id: number;
  program_id: number;
  name: string;
  order_index: number;
  exercises: ProgramExercise[];
}

export interface Program {
  id: number;
  user_id: number;
  name: string;
  goal: string | null;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  days: ProgramDay[];
}

export interface ProgramListResponse {
  items: Program[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProgramExerciseCreate {
  exercise_id: number;
  order_index?: number;
  sets_count: number;
  min_reps?: number | null;
  max_reps?: number | null;
  target_weight?: number | null;
  target_assistance_weight?: number | null;
  target_added_weight?: number | null;
  target_bodyweight?: number | null;
  target_duration_seconds?: number | null;
  target_distance_meters?: number | null;
  target_calories?: number | null;
  target_resistance_level?: number | null;
  target_rpe?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
}

export interface ProgramDayCreate {
  name: string;
  order_index?: number;
  exercises?: ProgramExerciseCreate[];
}

export interface ProgramCreate {
  name: string;
  goal?: string | null;
  days_per_week: number;
  is_active?: boolean;
  days?: ProgramDayCreate[];
}

export type ProgramUpdate = Partial<ProgramCreate>;

export interface LastWorkoutSummary {
  id: number;
  name: string;
  performed_at: string;
  duration_minutes: number | null;
}

export interface ExerciseRecord {
  exercise_id: number;
  exercise_name: string;
  performed_at: string;
  max_weight: number;
  max_reps: number;
  best_e1rm: number;
}

export interface TopExerciseByVolume {
  exercise_id: number;
  exercise_name: string;
  total_volume: number;
}

export interface DashboardSummary {
  last_workout: LastWorkoutSummary | null;
  workouts_this_week: number;
  weekly_volume: number;
  recent_records: ExerciseRecord[];
  top_exercises_by_volume: TopExerciseByVolume[];
}

export interface ExerciseProgressPoint {
  performed_at: string;
  max_weight: number;
  total_volume: number;
  best_e1rm: number;
}

export interface ExerciseProgress {
  exercise_id: number;
  exercise_name: string;
  total_sessions: number;
  max_weight: number;
  max_reps: number;
  max_volume: number;
  best_e1rm: number;
  history: ExerciseProgressPoint[];
}

export interface ApiConfig {
  appName: string;
  apiVersion: string;
}
