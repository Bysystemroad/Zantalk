import type { Task } from "@/lib/types";

export const FOLLOW_UP_DELAYS = [1, 3, 5, 7] as const;
export type FollowUpDelay = (typeof FOLLOW_UP_DELAYS)[number];
export type SmartFollowUpContext =
  | "reminder_due"
  | "overdue_same_day"
  | "overdue_1_day"
  | "overdue_3_days_plus";

export function normalizeFollowUpDelay(value: FormDataEntryValue | number | null) {
  const parsed = Number(value ?? 1);
  return FOLLOW_UP_DELAYS.includes(parsed as FollowUpDelay)
    ? (parsed as FollowUpDelay)
    : 1;
}

export function daysPending(task: Pick<Task, "created_at">) {
  const createdAt = new Date(task.created_at).getTime();
  if (!Number.isFinite(createdAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000));
}

function taskDueAt(task: Pick<Task, "task_date" | "task_time">) {
  const time = task.task_time?.slice(0, 5) || "10:00";
  const dueAt = new Date(`${task.task_date}T${time}:00`);
  return Number.isFinite(dueAt.getTime()) ? dueAt : null;
}

export function getSmartFollowUpContext(
  task: Pick<
    Task,
    | "status"
    | "task_date"
    | "task_time"
    | "reminder_minutes_before"
    | "follow_up_enabled"
  >,
): SmartFollowUpContext | null {
  if (task.status !== "pending" || !task.follow_up_enabled) {
    return null;
  }

  const dueAt = taskDueAt(task);
  if (!dueAt) {
    return null;
  }

  const now = Date.now();
  const dueTime = dueAt.getTime();
  const reminderTime = dueTime - task.reminder_minutes_before * 60 * 1000;

  if (now >= reminderTime && now < dueTime) {
    return "reminder_due";
  }

  if (now < dueTime) {
    return null;
  }

  const overdueDays = Math.floor((now - dueTime) / 86_400_000);

  if (overdueDays >= 3) {
    return "overdue_3_days_plus";
  }

  if (overdueDays >= 1) {
    return "overdue_1_day";
  }

  return "overdue_same_day";
}

export function isFollowUpEligible(
  task: Pick<
    Task,
    | "status"
    | "created_at"
    | "follow_up_enabled"
    | "follow_up_suggestion"
    | "follow_up_last_generated_at"
    | "task_date"
    | "task_time"
    | "reminder_minutes_before"
  >,
) {
  const context = getSmartFollowUpContext(task);
  if (!context) {
    return false;
  }

  if (!task.follow_up_suggestion || !task.follow_up_last_generated_at) {
    return true;
  }

  const generatedAt = new Date(task.follow_up_last_generated_at).getTime();
  return Number.isFinite(generatedAt) && Date.now() - generatedAt >= 86_400_000;
}
