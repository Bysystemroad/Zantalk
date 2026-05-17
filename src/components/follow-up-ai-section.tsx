"use client";

import { Check, Clipboard, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markTaskDone } from "@/app/actions";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import {
  daysPending,
  getSmartFollowUpContext,
  type SmartFollowUpContext,
} from "@/lib/follow-up";
import type { Task } from "@/lib/types";

type GenerateResponse = {
  suggestion?: string;
  followUpLastGeneratedAt?: string;
  context?: SmartFollowUpContext;
  error?: string;
};

const contextCopy: Record<SmartFollowUpContext, { prompt: string; tone: string }> = {
  reminder_due: {
    prompt: "Reminder due now. Need a short message?",
    tone: "Action suggestion",
  },
  overdue_same_day: {
    prompt: "This task is still pending. Want a quick nudge?",
    tone: "Same-day reminder",
  },
  overdue_1_day: {
    prompt: "This task is still pending. Want me to prepare a follow-up message?",
    tone: "Polite follow-up",
  },
  overdue_3_days_plus: {
    prompt: "This task has waited a few days. Need a stronger follow-up?",
    tone: "Professional follow-up",
  },
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
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [error, setError] = useState("");
  const [copiedTaskId, setCopiedTaskId] = useState("");
  const [isPending, startTransition] = useTransition();

  function generate(taskId: string) {
    const task = items.find((item) => item.id === taskId);
    const context = task ? getSmartFollowUpContext(task) : null;
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/follow-up/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, context }),
      });
      const body = (await response.json().catch(() => null)) as
        | GenerateResponse
        | null;

      if (!response.ok || !body?.suggestion) {
        setError(body?.error ?? "Smart Follow-up Engine generation failed.");
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

  function done(taskId: string) {
    startTransition(async () => {
      await markTaskDone(taskId);
      setItems((current) => current.filter((task) => task.id !== taskId));
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            Premium
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Smart Follow-up Engine
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Free reminds you. Premium helps you act.
          </p>
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100">
          {items.length} ready
        </span>
      </div>
      <div className="grid gap-3">
        {items.length ? (
          items.map((task) => {
            const context = getSmartFollowUpContext(task);
            const copy = context ? contextCopy[context] : null;

            return (
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
                    {copy ? (
                      <p className="mt-3 rounded-[8px] border border-blue-200/15 bg-blue-300/10 px-3 py-2 text-sm text-blue-50">
                        {copy.prompt}
                      </p>
                    ) : null}
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
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => done(task.id)}
                      className="tap-highlight mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 text-xs font-bold text-emerald-100 disabled:opacity-60"
                    >
                      <Check size={15} />
                      Mark as done
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => generate(task.id)}
                    className="tap-highlight mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
                  >
                    <Sparkles size={16} />
                    {copy?.tone ?? "Generate suggestion"}
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <div className="glass rounded-[8px] p-5 text-sm text-slate-400">
            No pending tasks need Smart Follow-up Engine yet.
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
