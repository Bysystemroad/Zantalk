import { NextResponse } from "next/server";
import {
  createGoogleCalendarEvent,
  getGoogleConnectionStatus,
  GOOGLE_CALENDAR_FEATURE,
} from "@/lib/server/google-calendar";
import { canUseFeature } from "@/lib/server/plans";
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

    const allowed = await canUseFeature(user.id, GOOGLE_CALENDAR_FEATURE);
    if (!allowed) {
      return NextResponse.json(
        { error: "This feature requires Premium", code: "PREMIUM_REQUIRED" },
        { status: 403 },
      );
    }

    const connection = await getGoogleConnectionStatus(user.id);
    if (!connection.connected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      taskId?: string;
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
    if (!task.title || !task.task_date) {
      return NextResponse.json(
        { error: "Task needs a title and date before calendar sync" },
        { status: 400 },
      );
    }

    if (task.google_calendar_event_id) {
      return NextResponse.json(
        { error: "Task already synced", code: "TASK_ALREADY_SYNCED" },
        { status: 409 },
      );
    }

    const eventId = await createGoogleCalendarEvent(user.id, task);
    const syncedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        google_calendar_event_id: eventId,
        google_calendar_synced_at: syncedAt,
      })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ ok: true, eventId, syncedAt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create calendar event";
    const friendly =
      message === "Google Calendar is not connected" ||
      message === "This feature requires Premium" ||
      message === "Task already synced" ||
      message === "Please reconnect Google Calendar"
        ? message
        : "Could not create calendar event";
    console.error("[/api/google/create-event] error:", message);
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
