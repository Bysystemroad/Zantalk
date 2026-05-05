import { todayInBerlin } from "@/lib/date";
import { getOpenAIClient } from "@/lib/openai";
import type { ParsedTask } from "@/lib/types";

const taskSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD" },
    time: { type: "string", description: "HH:mm in 24-hour time" },
    person: { type: "string" },
    category: {
      type: "string",
      enum: ["work", "personal", "study", "health", "other"],
    },
    reminderMinutesBefore: { type: "integer" },
  },
  required: [
    "title",
    "date",
    "time",
    "person",
    "category",
    "reminderMinutesBefore",
  ],
};

export function getOpenAIKeyError() {
  return process.env.OPENAI_API_KEY ? null : "Missing OpenAI API key";
}

export function normalizeParsedTask(task: ParsedTask): ParsedTask {
  return {
    title: task.title?.trim() || "Untitled task",
    date: /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? task.date : todayInBerlin(),
    time: /^\d{2}:\d{2}$/.test(task.time) ? task.time : "10:00",
    person: task.person?.trim() || "",
    category: task.category || "other",
    reminderMinutesBefore: Number.isFinite(task.reminderMinutesBefore)
      ? Math.max(0, Math.min(1440, Math.round(task.reminderMinutesBefore)))
      : 15,
  };
}

export async function transcribeAudio(audio: File) {
  const missingKey = getOpenAIKeyError();
  if (missingKey) {
    throw new Error(missingKey);
  }

  const openai = getOpenAIClient();
  const transcription = await openai.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    file: audio,
    response_format: "json",
  });

  const transcript = transcription.text?.trim() ?? "";
  if (!transcript) {
    throw new Error("No speech was detected. Try recording again.");
  }

  return transcript;
}

export async function parseTaskTranscript(transcript: string) {
  const missingKey = getOpenAIKeyError();
  if (missingKey) {
    throw new Error(missingKey);
  }

  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    throw new Error("Transcript is required.");
  }

  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You parse spoken reminders into task JSON. Support English, Turkish, and Italian. Default missing date to the supplied today value. Default missing time to 10:00. Use Europe/Berlin for relative dates. Return only schema-valid JSON.",
      },
      {
        role: "user",
        content: `Today is ${todayInBerlin()} in Europe/Berlin. Transcript: ${cleanTranscript}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "zantalk_task",
        strict: true,
        schema: taskSchema,
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty task parse response.");
  }

  const parsed = JSON.parse(response.output_text) as ParsedTask;
  return normalizeParsedTask(parsed);
}
