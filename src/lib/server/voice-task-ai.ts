import * as chrono from "chrono-node";
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

type ChronoDateTime = {
  date: string;
  time: string;
  matchedText: string;
};

const DEFAULT_REMINDER_MINUTES = 30;

const berlinDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function formatBerlinDate(date: Date) {
  return berlinDateFormatter.format(date);
}

function dayPeriodTime(text: string) {
  const lower = text.toLowerCase();

  if (/\bmorning\b/.test(lower)) {
    return "09:00";
  }

  if (/\bafternoon\b/.test(lower)) {
    return "15:00";
  }

  if (/\bevening\b/.test(lower)) {
    return "19:00";
  }

  return null;
}

function hasExplicitMeridiem(text: string) {
  return /\b(a\.?m\.?|p\.?m\.?|am|pm)\b/i.test(text);
}

function parseChronoDateTime(transcript: string): ChronoDateTime | null {
  const referenceDate = new Date();
  const results = [
    ...chrono.en.parse(transcript, referenceDate, { forwardDate: true }),
    ...chrono.it.parse(transcript, referenceDate, { forwardDate: true }),
  ].sort((a, b) => a.index - b.index);

  const result = results[0];
  if (!result) {
    return null;
  }

  const matchedText = result.text;
  const date = formatBerlinDate(result.start.date());
  const mappedDayPeriod = dayPeriodTime(matchedText) ?? dayPeriodTime(transcript);

  if (mappedDayPeriod) {
    return { date, time: mappedDayPeriod, matchedText };
  }

  if (result.start.isCertain("hour")) {
    let hour = result.start.get("hour") ?? 10;
    const minute = result.start.get("minute") ?? 0;
    const ambiguousEarlyHour =
      hour >= 1 &&
      hour <= 7 &&
      !result.start.isCertain("meridiem") &&
      !hasExplicitMeridiem(matchedText);

    if (ambiguousEarlyHour) {
      hour += 12;
    }

    return {
      date,
      time: `${padTime(hour)}:${padTime(minute)}`,
      matchedText,
    };
  }

  return { date, time: "10:00", matchedText };
}

function titleFromTranscript(transcript: string, chronoMatch: string) {
  const title = transcript
    .replace(chronoMatch, "")
    .replace(/\s+/g, " ")
    .trim();

  return title || transcript.trim() || "Untitled task";
}

function explicitlyAllowsZeroReminder(transcript: string) {
  return /\b(no reminder|without reminder|zero minute|zero minutes|0 minute|0 minutes|reminder zero|reminder 0|no notification|without notification|hatirlatma yok|bildirim yok|nessun promemoria|senza promemoria|nessuna notifica)\b/i.test(
    transcript,
  );
}

export function getOpenAIKeyError() {
  return process.env.OPENAI_API_KEY ? null : "Missing OpenAI API key";
}

export function normalizeParsedTask(
  task: ParsedTask,
  options: { allowZeroReminder?: boolean } = {},
): ParsedTask {
  const reminder = Number.isFinite(task.reminderMinutesBefore)
    ? Math.round(task.reminderMinutesBefore)
    : DEFAULT_REMINDER_MINUTES;
  const normalizedReminder =
    reminder === 0 && options.allowZeroReminder
      ? 0
      : Math.max(1, Math.min(1440, reminder || DEFAULT_REMINDER_MINUTES));

  return {
    title: task.title?.trim() || "Untitled task",
    date: /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? task.date : todayInBerlin(),
    time: /^\d{2}:\d{2}$/.test(task.time) ? task.time : "10:00",
    person: task.person?.trim() || "",
    category: task.category || "other",
    reminderMinutesBefore: normalizedReminder,
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

  const chronoDateTime = parseChronoDateTime(cleanTranscript);
  const allowZeroReminder = explicitlyAllowsZeroReminder(cleanTranscript);
  const openai = getOpenAIClient();
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You parse spoken reminders into task JSON. Support English, Turkish, and Italian. Default missing date to the supplied today value. Default missing time to 10:00. Default missing reminderMinutesBefore to 30. Do not return 0 for reminderMinutesBefore unless the user explicitly says no reminder, no notification, zero minutes, or equivalent. Use Europe/Berlin for relative dates. Return only schema-valid JSON.",
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

    const parsed = normalizeParsedTask(
      JSON.parse(response.output_text) as ParsedTask,
      { allowZeroReminder },
    );

    if (!chronoDateTime) {
      return parsed;
    }

    return {
      ...parsed,
      date: chronoDateTime.date,
      time: chronoDateTime.time,
    };
  } catch (error) {
    if (!chronoDateTime) {
      throw error;
    }

    return normalizeParsedTask(
      {
        title: titleFromTranscript(cleanTranscript, chronoDateTime.matchedText),
        date: chronoDateTime.date,
        time: chronoDateTime.time,
        person: "",
        category: "other",
        reminderMinutesBefore: DEFAULT_REMINDER_MINUTES,
      },
      {
        allowZeroReminder,
      },
    );
  }
}
