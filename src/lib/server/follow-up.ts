import { getOpenAIClient } from "@/lib/openai";
import { isFollowUpEligible } from "@/lib/follow-up";
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

export async function generateFollowUpSuggestion(task: Task) {
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "Generate a short, polite follow-up message for this task. The message should be professional, clear, and ready to copy. Do not mention Zantalk. Return only the message text.",
      },
      {
        role: "user",
        content: [
          `Task title: ${task.title}`,
          `Task date: ${task.task_date}`,
          `Task time: ${task.task_time}`,
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
