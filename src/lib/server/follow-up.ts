import { getOpenAIClient } from "@/lib/openai";
import {
  getSmartFollowUpContext,
  isFollowUpEligible,
  type SmartFollowUpContext,
} from "@/lib/follow-up";
import { canUseFeature } from "@/lib/server/plans";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export const FOLLOW_UP_FEATURE = "follow_up_ai";

export async function getEligibleFollowUpTasks(userId: string) {
  const allowed = await canUseFeature(userId, FOLLOW_UP_FEATURE);
  if (!allowed) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq("follow_up_enabled", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Task[]).filter(isFollowUpEligible);
}

function contextInstruction(context: SmartFollowUpContext) {
  switch (context) {
    case "reminder_due":
      return "The task reminder is due now. Suggest a short next action or message the user can send immediately.";
    case "overdue_same_day":
      return "The task is overdue but still on the same day. Use a short, helpful reminder tone.";
    case "overdue_1_day":
      return "The task is about 1 day overdue. Use a polite follow-up tone.";
    case "overdue_3_days_plus":
      return "The task is 3 or more days overdue. Use a stronger but still professional follow-up tone.";
  }
}

export async function generateFollowUpSuggestion(
  task: Task,
  context = getSmartFollowUpContext(task),
) {
  if (!context) {
    throw new Error("Task is not eligible for Smart Follow-up Engine yet.");
  }

  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "Generate a short, practical follow-up or action suggestion for this task. Use the task title, date/time, overdue status, context, and optional person/category. Return only the message text. Keep it professional, clear, and copy-ready. Do not mention Zantalk. Do not imply anything has been sent automatically.",
      },
      {
        role: "user",
        content: [
          `Context: ${context}`,
          `Context instruction: ${contextInstruction(context)}`,
          `Task title: ${task.title}`,
          `Task date: ${task.task_date}`,
          `Task time: ${task.task_time}`,
          `Overdue status: ${context}`,
          task.person ? `Person: ${task.person}` : null,
          `Category: ${task.category}`,
          task.original_transcript
            ? `Original transcript: ${task.original_transcript}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const suggestion = response.output_text?.trim();
  if (!suggestion) {
    throw new Error("OpenAI returned an empty follow-up suggestion.");
  }

  return suggestion;
}
