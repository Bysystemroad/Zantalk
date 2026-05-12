import type { Task } from "@/lib/types";

export const FOLLOW_UP_DELAYS = [1, 3, 5, 7] as const;
export type FollowUpDelay = (typeof FOLLOW_UP_DELAYS)[number];

export function normalizeFollowUpDelay(value: FormDataEntryValue | number | null) {
  const parsed = Number(value ?? 3);
  return FOLLOW_UP_DELAYS.includes(parsed as FollowUpDelay)
    ? (parsed as FollowUpDelay)
    : 3;
}

export function daysPending(task: Pick<Task, "created_at">) {
  const createdAt = new Date(task.created_at).getTime();
  if (!Number.isFinite(createdAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000));
}

export function isFollowUpEligible(
  task: Pick<
    Task,
    | "status"
    | "created_at"
    | "follow_up_enabled"
    | "follow_up_after_days"
    | "follow_up_suggestion"
    | "follow_up_last_generated_at"
  >,
) {
  if (task.status !== "pending" || !task.follow_up_enabled) {
    return false;
  }

  const createdAt = new Date(task.created_at).getTime();
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const ageMs = Date.now() - createdAt;
  const requiredAgeMs = task.follow_up_after_days * 86_400_000;
  if (ageMs < requiredAgeMs) {
    return false;
  }

  if (!task.follow_up_suggestion || !task.follow_up_last_generated_at) {
    return true;
  }

  const generatedAt = new Date(task.follow_up_last_generated_at).getTime();
  return Number.isFinite(generatedAt) && Date.now() - generatedAt >= 86_400_000;
}
