"use client";

import { Bell, Check, Clock, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteTask, markTaskDone } from "@/app/actions";
import { CalendarSyncButton } from "@/components/calendar-sync-button";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import { formatReminderBefore } from "@/lib/reminders";
import type { Task } from "@/lib/types";

export function TaskCard({
  task,
  canUseCalendar = false,
  calendarConnected = false,
}: {
  task: Task;
  canUseCalendar?: boolean;
  calendarConnected?: boolean;
}) {
  const router = useRouter();
  const [isMutating, startTransition] = useTransition();

  function handleDone() {
    startTransition(async () => {
      await markTaskDone(task.id);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${task.title}"?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
    });
  }

  return (
    <article className="glass rounded-[8px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              task.status === "done"
                ? "break-words text-base font-semibold text-slate-400 line-through"
                : "break-words text-base font-semibold text-white"
            }
          >
            {task.title}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1">
              <Clock size={13} />
              {formatDisplayDate(task.task_date)} at{" "}
              {formatDisplayTime(task.task_time)}
            </span>
            {task.person ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1">
                <UserRound size={13} />
                {task.person}
              </span>
            ) : null}
            <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-2.5 py-1 capitalize text-blue-100">
              {task.category}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1">
              <Bell size={13} />
              {formatReminderBefore(task.reminder_minutes_before)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {task.status !== "done" ? (
            <button
              type="button"
              disabled={isMutating}
              aria-label="Mark task done"
              onClick={handleDone}
              className="tap-highlight rounded-full border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-100 disabled:opacity-60"
            >
              <Check size={18} />
            </button>
          ) : null}
          <button
            type="button"
            disabled={isMutating}
            aria-label="Delete task"
            onClick={handleDelete}
            className="tap-highlight rounded-full border border-red-300/20 bg-red-300/10 p-2 text-red-100 disabled:opacity-60"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <CalendarSyncButton
          taskId={task.id}
          initialSynced={Boolean(task.google_calendar_event_id)}
          canUseCalendar={canUseCalendar}
          calendarConnected={calendarConnected}
          compact
        />
      </div>
    </article>
  );
}
