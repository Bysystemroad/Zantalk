"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTask, TaskCategory } from "@/lib/types";

function normalizeReminder(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return 30;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.max(0, Math.min(1440, Math.round(parsed)));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveTask(formData: FormData) {
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

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    task_date: taskDate,
    task_time: taskTime,
    person: String(formData.get("person") ?? "").trim() || null,
    category,
    reminder_minutes_before: normalizeReminder(
      formData.get("reminderMinutesBefore"),
    ),
    original_transcript:
      String(formData.get("originalTranscript") ?? "").trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect("/app");
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
