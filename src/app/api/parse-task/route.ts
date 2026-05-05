import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIKeyError, parseTaskTranscript } from "@/lib/server/voice-task-ai";

export const runtime = "nodejs";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Task parsing failed.";
}

export async function POST(request: Request) {
  const missingKey = getOpenAIKeyError();
  if (missingKey) {
    return NextResponse.json({ error: missingKey }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { transcript?: unknown };
    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required." },
        { status: 400 },
      );
    }

    const task = await parseTaskTranscript(transcript);
    console.log("[/api/parse-task] parsed JSON:", JSON.stringify(task));

    return NextResponse.json(task);
  } catch (error) {
    const message = errorMessage(error);
    console.error("[/api/parse-task] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
