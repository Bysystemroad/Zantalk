import { NextResponse } from "next/server";
import {
  FOLLOW_UP_FEATURE,
  generateFollowUpSuggestion,
} from "@/lib/server/follow-up";
import {
  getSmartFollowUpContext,
  isFollowUpEligible,
  type SmartFollowUpContext,
} from "@/lib/follow-up";
import { canUseFeature } from "@/lib/server/plans";
import { getOpenAIKeyError } from "@/lib/server/voice-task-ai";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const allowed = await canUseFeature(user.id, FOLLOW_UP_FEATURE);
    if (!allowed) {
      return NextResponse.json(
        { error: "Premium required", code: "PREMIUM_REQUIRED" },
        { status: 403 },
      );
    }

    const missingKey = getOpenAIKeyError();
    if (missingKey) {
      return NextResponse.json({ error: missingKey }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as {
      taskId?: string;
      context?: SmartFollowUpContext;
    } | null;
    const taskId = body?.taskId?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = data as Task;
    if (!isFollowUpEligible(task)) {
      return NextResponse.json(
        { error: "Task is not eligible for Smart Follow-up Engine yet" },
        { status: 400 },
      );
    }

    const context = getSmartFollowUpContext(task);
    if (!context || (body?.context && body.context !== context)) {
      return NextResponse.json(
        { error: "Smart follow-up context is no longer current" },
        { status: 400 },
      );
    }

    const suggestion = await generateFollowUpSuggestion(task, context);
    const generatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        follow_up_suggestion: suggestion,
        follow_up_last_generated_at: generatedAt,
      })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      suggestion,
      context,
      followUpLastGeneratedAt: generatedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Smart Follow-up Engine generation failed";
    console.error("[/api/follow-up/generate] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
