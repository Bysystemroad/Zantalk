import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canCreateVoiceTask, FREE_LIMIT_ERROR } from "@/lib/server/plans";
import { getOpenAIKeyError, transcribeAudio } from "@/lib/server/voice-task-ai";

export const runtime = "nodejs";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Transcription failed.";
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

  const quota = await canCreateVoiceTask(user.id);
  if (!quota.allowed) {
    return NextResponse.json(FREE_LIMIT_ERROR, { status: 402 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "A non-empty audio file is required." },
        { status: 400 },
      );
    }

    console.log("[/api/transcribe] received audio bytes:", audio.size);
    const transcript = await transcribeAudio(audio);
    console.log("[/api/transcribe] OpenAI transcript:", transcript);
    console.log("[/api/transcribe] transcript length:", transcript.length);

    return NextResponse.json({ transcript });
  } catch (error) {
    const message = errorMessage(error);
    console.error("[/api/transcribe] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
