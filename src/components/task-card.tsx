"use client";

import { Check, Clock, Trash2, UserRound } from "lucide-react";
import { deleteTask, markTaskDone } from "@/app/actions";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import type { Task } from "@/lib/types";

export function TaskCard({ task }: { task: Task }) {
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
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {task.status !== "done" ? (
            <button
              type="button"
              aria-label="Mark task done"
              onClick={() => markTaskDone(task.id)}
              className="tap-highlight rounded-full border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-100"
            >
              <Check size={18} />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Delete task"
            onClick={() => deleteTask(task.id)}
            className="tap-highlight rounded-full border border-red-300/20 bg-red-300/10 p-2 text-red-100"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
