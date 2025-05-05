// src/types/habit.ts
export type HabitUnit = "times" | "hours" | "glasses" | "pages" | "minutes";
export type HabitIcon = "sleep" | "water" | "screen" | "award" | "trending" | "reading" | "workout" | "coffee" | "energy";

export interface Habit {
  id: string;
  name: string;
  goal: number;
  unit: HabitUnit;
  icon: HabitIcon;
  data: { day: string; value: number | null }[];
  streak: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  name: string;
  message?: string;
  type?: string;
}

export interface PerformanceData {
  name: string;
  value: number;
}

export interface ConsistencyData {
  day: string;
  completion: number;
}

export interface RadarData {
  name: string;
  [key: string]: string | number;
}

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
}

export interface RadarDataPoint {
  name: string;       
  Sunday: number;     
  Monday: number;   
  Tuesday: number;   
  Wednesday: number; 
  Thursday: number;  
  Friday: number;    
  Saturday: number;
}

export type AuthMode = "login" | "signup";
export type ActiveTab = "dashboard" | "habits" | "stats";