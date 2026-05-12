"use client";

import { Bell, Mic, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TaskCard } from "@/components/task-card";
import {
  AiProcessingState,
  type AiProcessingStep,
} from "@/components/voice-ai-states";
import { formatDisplayTime } from "@/lib/date";
import {
  requestNotificationPermission,
  scheduleLocalTaskReminders,
} from "@/lib/notifications";
import type { ParsedTask, Task } from "@/lib/types";

type ParseResponse = {
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function DashboardClient({
  todayTasks,
  totalPending,
  totalDone,
  canUseCalendar = false,
  calendarConnected = false,
}: {
  todayTasks: Task[];
  totalPending: number;
  totalDone: number;
  canUseCalendar?: boolean;
  calendarConnected?: boolean;
}) {
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
  const [status, setStatus] = useState<
    "idle" | "recording" | "uploading" | "parsing" | "error"
  >("idle");
  const [processingStep, setProcessingStep] =
    useState<AiProcessingStep>("understood");
  const [error, setError] = useState("");
  const [permission, setPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  useEffect(() => {
    return scheduleLocalTaskReminders(todayTasks);
  }, [todayTasks]);

  async function askForNotifications() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

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
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        await parseAudio(blob, mimeTypeRef.current);
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
    const processingStartedAt = Date.now();
    setProcessingStep("understood");
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

    setProcessingStep("analyzing");
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

    const result: ParseResponse = {
      transcript: transcribeBody.transcript,
      task: parseBody,
    };
    setProcessingStep("ready");
    await sleep(Math.max(450, 1500 - (Date.now() - processingStartedAt)));
    sessionStorage.setItem("zantalk.pendingTask", JSON.stringify(result));
    router.push("/app/new");
  }

  const recording = status === "recording";
  const busy = status === "uploading" || status === "parsing";

  if (recording) {
    return (
      <section className="flex min-h-[calc(100vh-11rem)] flex-col items-center justify-center text-center">
        <div className="relative mb-12 flex h-56 w-56 items-center justify-center rounded-full border border-blue-200/15 bg-blue-300/10 shadow-[0_0_90px_rgba(88,173,255,0.34)]">
          <div className="absolute inset-8 rounded-full border border-blue-100/10" />
          <div className="flex h-32 items-center justify-center gap-3">
            <span className="wave-bar h-16" />
            <span className="wave-bar h-28" />
            <span className="wave-bar h-20" />
            <span className="wave-bar h-32" />
            <span className="wave-bar h-18" />
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.34em] text-blue-100">
          Listening...
        </p>
        <p className="mt-5 max-w-64 text-2xl font-semibold leading-tight text-white">
          Listening...
        </p>
        <button
          type="button"
          onClick={stopRecording}
          className="tap-highlight mt-10 inline-flex items-center gap-2 rounded-full border border-red-200/25 bg-red-300/15 px-8 py-4 text-sm font-bold text-red-50 shadow-[0_0_34px_rgba(248,113,113,0.2)]"
        >
          <Square size={16} fill="currentColor" />
          Stop
        </button>
      </section>
    );
  }

  if (busy) {
    return (
      <section className="flex min-h-[calc(100vh-11rem)] flex-col items-center justify-center text-center">
        <AiProcessingState step={processingStep} />
      </section>
    );
  }

  return (
    <div className="grid gap-7">
      <section>
        <p className="text-[2rem] font-semibold leading-tight text-white">
          Good morning,
        </p>
        <p className="text-[2rem] font-semibold leading-tight text-blue-100">
          Canberk
        </p>
      </section>

      <section className="glass rounded-[8px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Today</h2>
          <span className="rounded-full border border-blue-200/15 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100">
            {totalPending} active
          </span>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {todayTasks.length ? (
            todayTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="grid grid-cols-[4rem_1fr] gap-3 py-3">
                <span className="font-mono text-sm text-blue-100">
                  {formatDisplayTime(task.task_time)}
                </span>
                <span
                  className={
                    task.status === "done"
                      ? "break-words text-sm text-slate-500 line-through"
                      : "break-words text-sm font-medium text-slate-100"
                  }
                >
                  {task.title}
                </span>
              </div>
            ))
          ) : (
            <div className="py-5 text-center text-sm text-slate-400">
              No tasks yet today.
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-[8px] bg-white/[0.035] px-3 py-3">
            <p className="text-2xl font-semibold text-white">{totalPending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="rounded-[8px] bg-white/[0.035] px-3 py-3">
            <p className="text-2xl font-semibold text-white">{totalDone}</p>
            <p className="text-xs text-slate-500">Done</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center py-2">
        <button
          type="button"
          onClick={startRecording}
          aria-label="Start voice recording"
          className="tap-highlight relative flex h-48 w-48 items-center justify-center rounded-full border border-blue-200/30 bg-blue-300/15 text-white blue-glow"
        >
          <span className="absolute inset-[-18px] rounded-full border border-blue-200/10 shadow-[0_0_90px_rgba(88,173,255,0.32)]" />
          <Mic size={76} />
        </button>
        <p className="mt-5 text-center text-sm font-semibold text-slate-200">
          Tap and speak
        </p>
        {error ? (
          <div className="mt-4 grid gap-3">
            <p className="rounded-[8px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-center text-sm text-red-100">
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
                className="tap-highlight rounded-[8px] bg-white px-4 py-3 text-center text-sm font-bold text-slate-950"
              >
                Unlock Premium
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <button
        type="button"
        onClick={askForNotifications}
        className="tap-highlight flex items-center justify-between rounded-[8px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200"
      >
        <span className="inline-flex items-center gap-2">
          <Bell size={18} className="text-blue-100" />
          Notifications
        </span>
        <span className="capitalize text-slate-400">{permission}</span>
      </button>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Today Tasks</h2>
          <span className="text-sm text-slate-500">{todayTasks.length}</span>
        </div>
        <div className="grid gap-3">
          {todayTasks.length ? (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canUseCalendar={canUseCalendar}
                calendarConnected={calendarConnected}
              />
            ))
          ) : (
            <div className="glass rounded-[8px] p-5 text-center text-sm text-slate-400">
              Your day is clear. Speak a task to start.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
