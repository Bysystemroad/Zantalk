"use client";

import Link from "next/link";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { useState, useTransition } from "react";

type CreateEventResponse = {
  ok?: boolean;
  eventId?: string;
  error?: string;
};

export function CalendarSyncButton({
  taskId,
  initialSynced = false,
  canUseCalendar = false,
  calendarConnected = false,
  compact = false,
}: {
  taskId: string;
  initialSynced?: boolean;
  canUseCalendar?: boolean;
  calendarConnected?: boolean;
  compact?: boolean;
}) {
  const [synced, setSynced] = useState(initialSynced);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!canUseCalendar) {
    return null;
  }

  if (synced) {
    return (
      <div className="grid gap-2">
        <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-bold text-emerald-100">
          <CalendarCheck size={15} />
          Synced to Google Calendar
        </span>
      </div>
    );
  }

  if (!calendarConnected) {
    return (
      <Link
        href="/api/google/connect"
        className="tap-highlight inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-blue-200/25 bg-blue-300/10 px-3 text-xs font-bold text-blue-50"
      >
        <CalendarPlus size={15} />
        Connect Calendar
      </Link>
    );
  }

  function syncTask() {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/google/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const body = (await response.json().catch(() => null)) as
        | CreateEventResponse
        | null;

      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "Could not create calendar event");
        return;
      }

      setSynced(true);
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={syncTask}
        className={
          compact
            ? "tap-highlight inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-blue-200/25 bg-blue-300/10 px-3 text-xs font-bold text-blue-50 disabled:opacity-60"
            : "tap-highlight inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
        }
      >
        <CalendarPlus size={15} />
        {isPending ? "Adding..." : "Add to Google Calendar"}
      </button>
      {error ? (
        <p className="rounded-[8px] border border-red-300/20 bg-red-300/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
