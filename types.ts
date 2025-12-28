
export enum AppMode {
  PRO = 'PRO',
  SIMPLE = 'SIMPLE'
}

export enum TaskCategory {
  PRAYER = 'PRAYER',
  MEAL = 'MEAL',
  WORK = 'WORK',
  TRAINING = 'TRAINING',
  REST = 'REST',
  OTHER = 'OTHER'
}

export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum Language {
  EN = 'EN',
  AR = 'AR',
  FR = 'FR'
}

export interface ScheduleTask {
  id: string;
  time: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  details?: string[];
  isCompleted?: boolean;
}

export interface WorkoutExercise {
  name: string;
  reps: string;
  sets: string;
}

export interface WorkoutSplit {
  name: string;
  exercises: WorkoutExercise[];
}

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}
