import { NextResponse } from "next/server";
import { canCreateVoiceTask, FREE_LIMIT_ERROR } from "@/lib/server/plans";
import {
  getOpenAIKeyError,
  parseTaskTranscript,
  transcribeAudio,
} from "@/lib/server/voice-task-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Voice parsing failed.";
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

    console.log("[/api/voice/parse] received audio bytes:", audio.size);
    const transcript = await transcribeAudio(audio);
    console.log("[/api/voice/parse] OpenAI transcript:", transcript);
    console.log("[/api/voice/parse] transcript length:", transcript.length);
    const task = await parseTaskTranscript(transcript);
    console.log("[/api/voice/parse] parsed JSON:", JSON.stringify(task));

    return NextResponse.json({ transcript, task });
  } catch (error) {
    const message = errorMessage(error);
    console.error("[/api/voice/parse] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
