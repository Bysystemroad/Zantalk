"use client";

import { Bell, Loader2, Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TaskCard } from "@/components/task-card";
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
};

type ParseTaskResponse = ParsedTask & {
  error?: string;
};

export function DashboardClient({
  todayTasks,
  totalPending,
  totalDone,
}: {
  todayTasks: Task[];
  totalPending: number;
  totalDone: number;
}) {
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<
    "idle" | "recording" | "uploading" | "parsing" | "error"
  >("idle");
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await parseAudio(blob);
      };

      recorder.start();
      setStatus("recording");
    } catch {
      setStatus("error");
      setError("Microphone permission is needed to capture a task.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setStatus("uploading");
  }

  async function parseAudio(blob: Blob) {
    if (blob.size === 0) {
      setStatus("error");
      setError("No audio was captured. Try once more.");
      return;
    }

    const formData = new FormData();
    formData.set("audio", blob, "zantalk-task.webm");
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
      setError(transcribeBody?.error ?? "Transcription failed.");
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
      setError(parseBody?.error ?? "Task parsing failed.");
      return;
    }

    const result: ParseResponse = {
      transcript: transcribeBody.transcript,
      task: parseBody,
    };
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
          &quot;Tomorrow at 3 call Cem&quot;
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
          disabled={busy}
          onClick={startRecording}
          aria-label="Start voice recording"
          className="tap-highlight relative flex h-48 w-48 items-center justify-center rounded-full border border-blue-200/30 bg-blue-300/15 text-white blue-glow disabled:opacity-60"
        >
          {!busy ? (
            <span className="absolute inset-[-18px] rounded-full border border-blue-200/10 shadow-[0_0_90px_rgba(88,173,255,0.32)]" />
          ) : null}
          {busy ? (
            <Loader2 className="animate-spin" size={62} />
          ) : (
            <Mic size={76} />
          )}
        </button>
        <p className="mt-5 text-center text-sm font-semibold text-slate-200">
          {busy
            ? status === "uploading"
              ? "Preparing audio..."
              : "Transcribing and parsing..."
            : "Tap and speak"}
        </p>
        {error ? (
          <p className="mt-4 rounded-[8px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-center text-sm text-red-100">
            {error}
          </p>
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
            todayTasks.map((task) => <TaskCard key={task.id} task={task} />)
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
