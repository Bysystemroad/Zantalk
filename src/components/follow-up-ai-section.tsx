"use client";

import { Clipboard, RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import { daysPending } from "@/lib/follow-up";
import type { Task } from "@/lib/types";

type GenerateResponse = {
  suggestion?: string;
  followUpLastGeneratedAt?: string;
  error?: string;
};

function canRegenerate(task: Task) {
  if (!task.follow_up_last_generated_at) {
    return true;
  }

  return (
    Date.now() - new Date(task.follow_up_last_generated_at).getTime() >=
    86_400_000
  );
}

export function FollowUpAISection({ tasks }: { tasks: Task[] }) {
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState("");
  const [copiedTaskId, setCopiedTaskId] = useState("");
  const [isPending, startTransition] = useTransition();

  function generate(taskId: string) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/follow-up/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const body = (await response.json().catch(() => null)) as
        | GenerateResponse
        | null;

      if (!response.ok || !body?.suggestion) {
        setError(body?.error ?? "Follow-up generation failed.");
        return;
      }

      setItems((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                follow_up_suggestion: body.suggestion ?? null,
                follow_up_last_generated_at:
                  body.followUpLastGeneratedAt ?? new Date().toISOString(),
              }
            : task,
        ),
      );
    });
  }

  async function copySuggestion(task: Task) {
    if (!task.follow_up_suggestion) {
      return;
    }

    await navigator.clipboard.writeText(task.follow_up_suggestion);
    setCopiedTaskId(task.id);
    window.setTimeout(() => setCopiedTaskId(""), 1600);
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            Premium
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Follow-up AI
          </h2>
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100">
          {items.length} ready
        </span>
      </div>
      <div className="grid gap-3">
        {items.length ? (
          items.map((task) => (
            <article
              key={task.id}
              className="glass rounded-[8px] p-4 shadow-[0_0_34px_rgba(88,173,255,0.1)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-white">
                    {task.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDisplayDate(task.task_date)} at{" "}
                    {formatDisplayTime(task.task_time)} -{" "}
                    {daysPending(task)} days pending
                  </p>
                </div>
                <Sparkles size={18} className="shrink-0 text-blue-100" />
              </div>
              {task.follow_up_suggestion ? (
                <div className="mt-4 rounded-[8px] border border-blue-200/15 bg-blue-300/[0.07] p-3">
                  <p className="text-sm leading-6 text-slate-100">
                    {task.follow_up_suggestion}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copySuggestion(task)}
                      className="tap-highlight inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.04] text-xs font-bold text-white"
                    >
                      <Clipboard size={15} />
                      {copiedTaskId === task.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !canRegenerate(task)}
                      onClick={() => generate(task.id)}
                      className="tap-highlight inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-blue-200/25 bg-blue-300/10 text-xs font-bold text-blue-50 disabled:opacity-60"
                    >
                      <RefreshCw size={15} />
                      Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => generate(task.id)}
                  className="tap-highlight mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
                >
                  <Sparkles size={16} />
                  Generate follow-up
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="glass rounded-[8px] p-5 text-sm text-slate-400">
            No pending tasks are eligible for follow-up yet.
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-3 rounded-[8px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}
