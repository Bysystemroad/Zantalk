import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TaskCard } from "@/components/task-card";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export default async function AppHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("task_date", { ascending: false })
    .order("task_time", { ascending: false });

  const tasks = (data ?? []) as Task[];

  return (
    <AppShell title="History">
      <section className="grid gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            Completed
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Task history
          </h1>
        </div>
        <div className="grid gap-3">
          {tasks.length ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          ) : (
            <div className="glass rounded-[8px] p-6 text-center text-sm text-slate-400">
              Done tasks will appear here.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
