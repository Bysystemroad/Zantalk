"use client";

import { useMemo, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { todayInBerlin } from "@/lib/date";
import type { Task } from "@/lib/types";

type Tab = "today" | "upcoming" | "done";

export function TaskTabs({
  tasks,
  initialTab = "today",
}: {
  tasks: Task[];
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const today = todayInBerlin();

  const groups = useMemo(
    () => ({
      today: tasks.filter(
        (task) => task.status === "pending" && task.task_date === today,
      ),
      upcoming: tasks.filter(
        (task) => task.status === "pending" && task.task_date > today,
      ),
      done: tasks.filter((task) => task.status === "done"),
    }),
    [tasks, today],
  );

  const activeTasks = groups[tab];

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-3 rounded-[8px] border border-white/10 bg-white/[0.04] p-1">
        {(["today", "upcoming", "done"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={
              tab === item
                ? "tap-highlight rounded-[7px] bg-blue-300/15 px-2 py-3 text-sm font-semibold capitalize text-blue-100"
                : "tap-highlight rounded-[7px] px-2 py-3 text-sm font-semibold capitalize text-slate-400"
            }
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {activeTasks.length ? (
          activeTasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="glass rounded-[8px] p-6 text-center text-sm text-slate-400">
            No {tab} tasks.
          </div>
        )}
      </div>
    </div>
  );
}
