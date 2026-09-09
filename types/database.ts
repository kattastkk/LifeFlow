export interface Profile {
  id: string;
  display_name: string | null;
  line_user_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "Low" | "Medium" | "High";
  category: string;
  status: "To Do" | "In Progress" | "Completed";
  created_at: string;
}

export interface TodayItem {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  date: string;
  created_at: string;
}

export interface DailyHistory {
  id: string;
  user_id: string;
  date: string;
  completed_count: number;
  total_count: number;
  completion_rate: number;
  items: Array<{ id: string; text: string; completed: boolean }>;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  status: string;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
}

export interface HabitCompletion {
  habit_id: string;
  date: string;
}

export interface Mood {
  id: string;
  user_id: string;
  date: string;
  value: 1 | 2 | 3 | 4 | 5;
  note: string | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  prompt: string | null;
  date: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export interface TodoItem {
  id: string;
  user_id: string;
  project_id: string | null;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface WantItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  note: string | null;
  completed: boolean;
  created_at: string;
}
