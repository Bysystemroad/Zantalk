"use client";

import { ArrowLeft, Loader2, Mic, Pencil, Save, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveTask } from "@/app/actions";
import { categories, type ParsedTask } from "@/lib/types";

type PendingTask = {
  transcript: string;
  task: ParsedTask;
};

type TranscribeResponse = {
  transcript?: string;
  error?: string;
  code?: string;
};

type ParseTaskResponse = ParsedTask & {
  error?: string;
  code?: string;
};

const FINALIZE_RECORDING_DELAY_MS = 700;
const MIN_RECORDING_DURATION_MS = 1000;
const SILENCE_AUTO_STOP_MS = 1800;
const SPEECH_RMS_THRESHOLD = 0.02;
const FREE_LIMIT_MESSAGE =
  "You’ve used your 3 free voice tasks today. Unlock Premium for unlimited voice tasks.";

function displayCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function displayReminder(value: number | undefined) {
  return value && value > 0 ? value : 30;
}

function readPendingTask() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem("zantalk.pendingTask");
  return raw ? (JSON.parse(raw) as PendingTask) : null;
}

function getBestAudioMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function audioFilename(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "zantalk-task.mp4";
  }

  if (mimeType.includes("ogg")) {
    return "zantalk-task.ogg";
  }

  return "zantalk-task.webm";
}

export function NewTaskFlow() {
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef("audio/webm");
  const stopTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStartedAtRef = useRef(0);
  const speechDetectedRef = useRef(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [pending, setPending] = useState<PendingTask | null>(readPendingTask);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "recording" | "uploading" | "parsing" | "error"
  >("idle");
  const [error, setError] = useState("");

  async function startRecording() {
    setError("");
    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      const mimeType = getBestAudioMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
      });
      recorderRef.current = recorder;
      mimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
      chunksRef.current = [];
      recordingStartedAtRef.current = 0;
      speechDetectedRef.current = false;
      silenceStartedAtRef.current = null;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopSilenceDetection();
        stream.getTracks().forEach((track) => track.stop());
        await parseAudio(
          new Blob(chunksRef.current, { type: mimeTypeRef.current }),
          mimeTypeRef.current,
        );
      };

      recorder.start(250);
      startSilenceDetection(stream);
      setStatus("recording");
    } catch {
      setStatus("error");
      setError("Microphone permission is needed to capture a task.");
    }
  }

  function stopRecording() {
    finalizeRecording(FINALIZE_RECORDING_DELAY_MS);
  }

  function finalizeRecording(delayMs = 0) {
    if (!recorderRef.current || stopTimeoutRef.current) {
      return;
    }

    stopTimeoutRef.current = window.setTimeout(() => {
      stopSilenceDetection();
      recorderRef.current?.stop();
      recorderRef.current = null;
      stopTimeoutRef.current = null;
      setStatus("uploading");
    }, delayMs);
  }

  function stopSilenceDetection() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }

  function startSilenceDetection(stream: MediaStream) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const samples = new Uint8Array(analyser.fftSize);

    source.connect(analyser);
    audioContextRef.current = audioContext;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;

      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / samples.length);
      const now = Date.now();
      recordingStartedAtRef.current ||= now;
      const longEnough =
        now - recordingStartedAtRef.current >= MIN_RECORDING_DURATION_MS;

      if (rms > SPEECH_RMS_THRESHOLD) {
        speechDetectedRef.current = true;
        silenceStartedAtRef.current = null;
      } else if (speechDetectedRef.current) {
        silenceStartedAtRef.current ??= now;
      }

      const silentLongEnough =
        speechDetectedRef.current &&
        longEnough &&
        silenceStartedAtRef.current !== null &&
        now - silenceStartedAtRef.current >= SILENCE_AUTO_STOP_MS;

      if (silentLongEnough) {
        finalizeRecording(0);
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }

  function recordAgain() {
    sessionStorage.removeItem("zantalk.pendingTask");
    setPending(null);
    setError("");
    setStatus("idle");
  }

  async function parseAudio(blob: Blob, mimeType: string) {
    if (blob.size === 0) {
      setStatus("error");
      setError("Couldn't hear clearly, try again.");
      return;
    }

    const formData = new FormData();
    formData.set("audio", blob, audioFilename(mimeType));
    setStatus("uploading");

    const transcribeResponse = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const transcribeBody =
      (await transcribeResponse.json().catch(() => null)) as
        | TranscribeResponse
        | null;

    if (!transcribeResponse.ok || !transcribeBody?.transcript) {
      setStatus("error");
      setError(
        transcribeBody?.code === "FREE_LIMIT_REACHED"
          ? FREE_LIMIT_MESSAGE
          : transcribeBody?.error ??
          "Couldn't hear clearly, try again.",
      );
      return;
    }

    setStatus("parsing");
    const parseResponse = await fetch("/api/parse-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcribeBody.transcript }),
    });
    const parseBody = (await parseResponse.json().catch(() => null)) as
      | ParseTaskResponse
      | null;

    if (!parseResponse.ok || !parseBody || parseBody.error) {
      setStatus("error");
      setError(
        parseBody?.code === "FREE_LIMIT_REACHED"
          ? FREE_LIMIT_MESSAGE
          : parseBody?.error ?? "Task parsing failed.",
      );
      return;
    }

    const result: PendingTask = {
      transcript: transcribeBody.transcript,
      task: parseBody,
    };
    sessionStorage.setItem("zantalk.pendingTask", JSON.stringify(result));
    setPending(result);
    setStatus("idle");
  }

  if (!pending) {
    const busy = status === "uploading" || status === "parsing";
    const recording = status === "recording";

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/app"
            aria-label="Back to app"
            className="rounded-full border border-white/10 p-3 text-slate-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold text-white">New task</h1>
          <span className="w-11" />
        </header>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-12 flex h-56 w-56 items-center justify-center rounded-full border border-blue-200/15 bg-blue-300/10 shadow-[0_0_90px_rgba(88,173,255,0.34)]">
            {recording ? (
              <div className="flex h-32 items-center justify-center gap-3">
                <span className="wave-bar h-16" />
                <span className="wave-bar h-28" />
                <span className="wave-bar h-20" />
                <span className="wave-bar h-32" />
                <span className="wave-bar h-16" />
              </div>
            ) : busy ? (
              <Loader2 className="animate-spin text-white" size={64} />
            ) : (
              <Mic className="text-white" size={76} />
            )}
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-blue-100">
            {recording ? "Listening..." : busy ? "Processing..." : "Voice capture"}
          </p>
          <p className="mt-5 max-w-72 text-2xl font-semibold leading-tight text-white">
            {recording ? "Listening..." : "Speak once. Zantalk structures the task."}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={recording ? stopRecording : startRecording}
            className={
              recording
                ? "tap-highlight mt-10 inline-flex items-center gap-2 rounded-full border border-red-200/25 bg-red-300/15 px-8 py-4 text-sm font-bold text-red-50"
                : "tap-highlight mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-slate-950 disabled:opacity-60"
            }
          >
            {recording ? <Square size={16} fill="currentColor" /> : <Mic size={17} />}
            {recording ? "Stop" : busy ? "Processing..." : "Start recording"}
          </button>

          {error ? (
            <div className="mt-5 grid gap-3">
              <p className="rounded-[8px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
              <button
                type="button"
                onClick={recordAgain}
                className="tap-highlight rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white"
              >
                Record again
              </button>
              {error === FREE_LIMIT_MESSAGE ? (
                <Link
                  href="/pricing"
                  className="tap-highlight rounded-[8px] bg-white px-4 py-3 text-sm font-bold text-slate-950"
                >
                  Unlock Premium
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <header className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/app")}
          aria-label="Back to app"
          className="rounded-full border border-white/10 p-3 text-slate-200"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
            Zantalk AI
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">
            Confirm task
          </h1>
        </div>
        <span className="w-11" />
      </header>

      <form action={saveTask} className="grid gap-5">
        <section className="glass rounded-[8px] p-5 shadow-[0_0_70px_rgba(88,173,255,0.13)]">
          <div className="grid gap-3">
            <label className="grid gap-2 rounded-[8px] border border-blue-200/15 bg-blue-300/10 p-4 text-sm font-medium text-slate-400">
              Original transcript:
              <textarea
                name="originalTranscript"
                rows={3}
                readOnly={!editing}
                defaultValue={pending.transcript}
                className="resize-none bg-transparent text-base font-semibold leading-6 text-white outline-none"
              />
            </label>

            <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
              Title:
              <input
                name="title"
                required
                readOnly={!editing}
                defaultValue={pending.task.title}
                className="bg-transparent text-xl font-semibold text-white outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
                Date:
                <input
                  name="date"
                  type={editing ? "date" : "text"}
                  required
                  readOnly={!editing}
                  defaultValue={pending.task.date}
                  className="min-w-0 bg-transparent text-base font-semibold text-white outline-none"
                />
              </label>
              <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
                Time:
                <input
                  name="time"
                  type={editing ? "time" : "text"}
                  required
                  readOnly={!editing}
                  defaultValue={pending.task.time}
                  className="min-w-0 bg-transparent text-base font-semibold text-white outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
                Category:
                {editing ? (
                  <select
                    name="category"
                    defaultValue={pending.task.category}
                    className="min-w-0 bg-[#0b111d] text-base font-semibold text-white outline-none"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {displayCategory(category)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="hidden"
                      name="category"
                      value={pending.task.category}
                    />
                    <span className="text-base font-semibold text-white">
                      {displayCategory(pending.task.category)}
                    </span>
                  </>
                )}
              </label>

              <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
                Reminder:
                {editing ? (
                  <input
                    name="reminderMinutesBefore"
                    type="number"
                    min={0}
                    max={1440}
                    defaultValue={displayReminder(
                      pending.task.reminderMinutesBefore,
                    )}
                    className="min-w-0 bg-transparent text-base font-semibold text-white outline-none"
                  />
                ) : (
                  <>
                    <input
                      type="hidden"
                      name="reminderMinutesBefore"
                      value={displayReminder(pending.task.reminderMinutesBefore)}
                    />
                    <span className="text-base font-semibold text-white">
                      {displayReminder(pending.task.reminderMinutesBefore)} min before
                    </span>
                  </>
                )}
              </label>
            </div>

            <label className="grid gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-4 text-sm font-medium text-slate-400">
              Person:
              <input
                name="person"
                readOnly={!editing}
                defaultValue={pending.task.person}
                placeholder="None"
                className="bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-600"
              />
            </label>
          </div>
        </section>

        <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="tap-highlight flex items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-bold text-white"
          >
            <Pencil size={17} />
            Edit
          </button>
          <button
            type="submit"
            onClick={() => sessionStorage.removeItem("zantalk.pendingTask")}
            className="tap-highlight flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-4 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(140,200,255,0.22)]"
          >
            <Save size={17} />
            Save Task
          </button>
        </div>
      </form>
    </main>
  );
}
