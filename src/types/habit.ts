export interface HabitEntryDay {
  day: string;
  value: number | null;
}

export interface NewHabitData {
  name: string;
  icon: string;
  goal: number;
  unit: string;
}

export interface FrontendHabit extends NewHabitData {
  id: string;
  streak: number;
  data: HabitEntryDay[];
  entries?: any[];
  reminders?: any[];
  createdAt?: string;
  updatedAt?: string;
}