"use client";

import {
  Bell,
  CalendarDays,
  Check,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTask, markTaskDone, updateTask } from "@/app/actions";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import { categories, type Task } from "@/lib/types";

function timeValue(time: string) {
  return time.slice(0, 5);
}

function PendingTaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isMutating, startTransition] = useTransition();

  function handleDone() {
    startTransition(async () => {
      await markTaskDone(task.id);
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${task.title}" from your pending tasks?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateTask(formData);
      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <form action={handleUpdate} className="glass rounded-[8px] p-4">
        <input type="hidden" name="taskId" value={task.id} />
        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Title
            <input
              required
              name="title"
              defaultValue={task.title}
              className="rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-blue-300/50"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Date
              <input
                required
                type="date"
                name="date"
                defaultValue={task.task_date}
                className="rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-blue-300/50"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Time
              <input
                required
                type="time"
                name="time"
                defaultValue={timeValue(task.task_time)}
                className="rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-blue-300/50"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Category
              <select
                name="category"
                defaultValue={task.category}
                className="rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-blue-300/50"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Reminder
              <input
                min={0}
                max={1440}
                type="number"
                name="reminderMinutesBefore"
                defaultValue={task.reminder_minutes_before}
                className="rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none transition focus:border-blue-300/50"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isMutating}
              onClick={() => setIsEditing(false)}
              className="tap-highlight inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.03] text-sm font-semibold text-slate-200 transition hover:border-white/20 disabled:opacity-60"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="tap-highlight inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-blue-200/30 bg-blue-300/15 text-sm font-semibold text-blue-50 shadow-[0_0_24px_rgba(96,165,250,0.18)] transition hover:border-blue-200/50 disabled:opacity-60"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <article className="glass rounded-[8px] p-4 shadow-[0_0_32px_rgba(59,130,246,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-semibold text-white">
            {task.title}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-slate-300">
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-white/10 px-2.5 py-1">
              <CalendarDays size={13} />
              {formatDisplayDate(task.task_date)} at{" "}
              {formatDisplayTime(task.task_time)}
            </span>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-2.5 py-1 capitalize text-blue-100">
                {task.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1">
                <Bell size={13} />
                {task.reminder_minutes_before} min before
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={isMutating}
          onClick={() => setIsEditing(true)}
          className="tap-highlight inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[8px] border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-100 transition hover:border-white/20 disabled:opacity-60"
        >
          <Pencil size={15} />
          Edit
        </button>
        <button
          type="button"
          disabled={isMutating}
          onClick={handleDone}
          className="tap-highlight inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/40 disabled:opacity-60"
        >
          <Check size={15} />
          Done
        </button>
        <button
          type="button"
          disabled={isMutating}
          onClick={handleDelete}
          className="tap-highlight inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[8px] border border-red-300/20 bg-red-300/10 text-xs font-semibold text-red-100 transition hover:border-red-300/40 disabled:opacity-60"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </article>
  );
}

export function PendingTasksSection({ tasks }: { tasks: Task[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Pending Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Edit, complete, or delete open activities.
          </p>
        </div>
        <span className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100">
          {tasks.length} pending
        </span>
      </div>
      {tasks.length > 0 ? (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <PendingTaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-[8px] p-5 text-sm text-slate-400">
          No pending tasks right now.
        </div>
      )}
    </section>
  );
}
