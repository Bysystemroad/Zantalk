import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { TaskTabs } from "@/app/tasks/task-tabs";
import { todayInBerlin } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

type AppPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const { tab } = await searchParams;
  const initialTab =
    tab === "upcoming" || tab === "done" || tab === "today" ? tab : "today";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = todayInBerlin();
  const [
    { data: todayTasks },
    { data: allTasks },
    { count: pendingCount },
    { count: doneCount },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("task_date", today)
      .order("task_time", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("task_date", { ascending: true })
      .order("task_time", { ascending: true }),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done"),
  ]);

  return (
    <AppShell title="Zantalk">
      <div className="grid gap-8">
        <DashboardClient
          todayTasks={(todayTasks ?? []) as Task[]}
          totalPending={pendingCount ?? 0}
          totalDone={doneCount ?? 0}
        />
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-white">Tasks</h2>
            <span className="text-sm text-slate-500">Today / Upcoming / Done</span>
          </div>
          <TaskTabs
            tasks={(allTasks ?? []) as Task[]}
            initialTab={initialTab}
          />
        </section>
      </div>
    </AppShell>
  );
}
