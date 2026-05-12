export type TaskCategory = "work" | "personal" | "study" | "health" | "other";
export type TaskStatus = "pending" | "done";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  task_time: string;
  person: string | null;
  category: TaskCategory;
  reminder_minutes_before: number;
  original_transcript: string | null;
  status: TaskStatus;
  follow_up_enabled: boolean;
  follow_up_after_days: number;
  follow_up_suggestion: string | null;
  follow_up_last_generated_at: string | null;
  created_at: string;
};

export type ParsedTask = {
  title: string;
  date: string;
  time: string;
  person: string;
  category: TaskCategory;
  reminderMinutesBefore: number;
};

export const categories: TaskCategory[] = [
  "work",
  "personal",
  "study",
  "health",
  "other",
];
