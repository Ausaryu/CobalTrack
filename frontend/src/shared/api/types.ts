export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

export interface SecondaryMuscle {
  id: number;
  muscle_name: string;
}

export interface Exercise {
  id: number;
  external_id: string | null;
  name: string;
  category: string | null;
  body_part: string | null;
  target: string | null;
  muscle_group: string | null;
  equipment: string | null;
  instructions: string | null;
  image_path: string | null;
  gif_path: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  secondary_muscles: SecondaryMuscle[];
}

export interface WorkoutSet {
  id: number;
  workout_exercise_id: number;
  order_index: number;
  weight: number | null;
  reps: number | null;
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

export interface ProgramExercise {
  id: number;
  program_day_id: number;
  exercise_id: number;
  order_index: number;
  sets_count: number;
  min_reps: number | null;
  max_reps: number | null;
  target_weight: number | null;
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
