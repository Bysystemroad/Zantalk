"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeReminderMinutes } from "@/lib/reminders";
import {
  canCreateVoiceTask,
  canUseFeature,
  incrementDailyVoiceCount,
} from "@/lib/server/plans";
import { normalizeFollowUpDelay } from "@/lib/follow-up";
import { FOLLOW_UP_FEATURE } from "@/lib/server/follow-up";
import { setOnboardingCompleted } from "@/lib/server/onboarding";
import { createClient } from "@/lib/supabase/server";
import { categories, type ParsedTask, type TaskCategory } from "@/lib/types";

function normalizeReminder(value: FormDataEntryValue | null) {
  return normalizeReminderMinutes(value);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await setOnboardingCompleted(user.id);
  revalidatePath("/app");
  redirect("/app");
}

async function insertTaskFromForm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const taskDate = String(formData.get("date") ?? "").trim();
  const taskTime = String(formData.get("time") ?? "").trim();
  const category = String(formData.get("category") ?? "other") as TaskCategory;

  if (!title || !taskDate || !taskTime) {
    throw new Error("Title, date, and time are required.");
  }

  const originalTranscript =
    String(formData.get("originalTranscript") ?? "").trim() || null;
  const followUpRequested = formData.get("followUpEnabled") === "on";
  const followUpAllowed =
    followUpRequested && (await canUseFeature(user.id, FOLLOW_UP_FEATURE));
  const isVoiceTask = Boolean(originalTranscript);
  if (isVoiceTask) {
    const quota = await canCreateVoiceTask(user.id);
    if (!quota.allowed) {
      throw new Error("Daily free limit reached");
    }
  }

  const { data: createdTask, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title,
      task_date: taskDate,
      task_time: taskTime,
      person: String(formData.get("person") ?? "").trim() || null,
      category,
      reminder_minutes_before: normalizeReminder(
        formData.get("reminderMinutesBefore"),
      ),
      original_transcript: originalTranscript,
      follow_up_enabled: followUpAllowed,
      follow_up_after_days: normalizeFollowUpDelay(
        formData.get("followUpAfterDays"),
      ),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (isVoiceTask) {
    await incrementDailyVoiceCount(user.id);
  }

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return createdTask.id as string;
}

export async function saveTask(formData: FormData) {
  await insertTaskFromForm(formData);
  redirect("/app");
}

export async function saveTaskWithSuccess(formData: FormData) {
  const taskId = await insertTaskFromForm(formData);
  return { ok: true, taskId };
}

export async function createTaskFromParsed(task: ParsedTask, transcript: string) {
  const data = new FormData();
  data.set("title", task.title);
  data.set("date", task.date);
  data.set("time", task.time);
  data.set("person", task.person);
  data.set("category", task.category);
  data.set("reminderMinutesBefore", String(task.reminderMinutesBefore));
  data.set("originalTranscript", transcript);

  await saveTask(data);
}

export async function markTaskDone(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const taskDate = String(formData.get("date") ?? "").trim();
  const taskTime = String(formData.get("time") ?? "").trim();
  const categoryValue = String(formData.get("category") ?? "other").trim();
  const category = categories.includes(categoryValue as TaskCategory)
    ? (categoryValue as TaskCategory)
    : "other";
  const followUpRequested = formData.get("followUpEnabled") === "on";
  const followUpAllowed =
    followUpRequested && (await canUseFeature(user.id, FOLLOW_UP_FEATURE));

  if (!taskId || !title || !taskDate || !taskTime) {
    throw new Error("Task, title, date, and time are required.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      task_date: taskDate,
      task_time: taskTime,
      category,
      reminder_minutes_before: normalizeReminder(
        formData.get("reminderMinutesBefore"),
      ),
      follow_up_enabled: followUpAllowed,
      follow_up_after_days: normalizeFollowUpDelay(
        formData.get("followUpAfterDays"),
      ),
    })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}
