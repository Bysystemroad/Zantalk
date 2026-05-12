import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FollowUpAISection } from "@/components/follow-up-ai-section";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { PendingTasksSection } from "@/components/pending-tasks-section";
import { PremiumLock } from "@/components/premium-lock";
import { DashboardClient } from "@/app/dashboard/dashboard-client";
import { TaskTabs } from "@/app/tasks/task-tabs";
import { todayInBerlin } from "@/lib/date";
import { getEligibleFollowUpTasks } from "@/lib/server/follow-up";
import { getGoogleConnectionStatus } from "@/lib/server/google-calendar";
import { getOnboardingCompleted } from "@/lib/server/onboarding";
import { getUserPlan } from "@/lib/server/plans";
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

  const onboardingCompleted = await getOnboardingCompleted(user.id);

  if (!onboardingCompleted) {
    redirect("/onboarding");
  }

  const today = todayInBerlin();
  const [
    { data: todayTasks },
    { data: pendingTasks },
    { data: allTasks },
    { count: pendingCount },
    { count: doneCount },
    plan,
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
      .eq("status", "pending")
      .order("task_date", { ascending: true })
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
    getUserPlan(user.id),
  ]);
  const followUpTasks = plan.isPremium
    ? await getEligibleFollowUpTasks(user.id)
    : [];
  const googleConnection = plan.isPremium
    ? await getGoogleConnectionStatus(user.id)
    : { connected: false };

  return (
    <AppShell title="Zantalk">
      <div className="grid gap-8">
        <DashboardClient
          todayTasks={(todayTasks ?? []) as Task[]}
          totalPending={pendingCount ?? 0}
          totalDone={doneCount ?? 0}
          canUseCalendar={plan.isPremium}
          calendarConnected={googleConnection.connected}
        />
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Integrations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect Zantalk with your workflow.
              </p>
            </div>
          </div>
          <GoogleCalendarCard
            isPremium={plan.isPremium}
            connected={googleConnection.connected}
          />
        </section>
        <PendingTasksSection
          tasks={(pendingTasks ?? []) as Task[]}
          canUseFollowUp={plan.isPremium}
          canUseCalendar={plan.isPremium}
          calendarConnected={googleConnection.connected}
        />
        {plan.isPremium ? (
          <FollowUpAISection tasks={followUpTasks} />
        ) : null}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-white">Tasks</h2>
            <span className="text-sm text-slate-500">Today / Upcoming / Done</span>
          </div>
          <TaskTabs
            tasks={(allTasks ?? []) as Task[]}
            initialTab={initialTab}
            canUseCalendar={plan.isPremium}
            calendarConnected={googleConnection.connected}
          />
        </section>
        {!plan.isPremium ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Premium AI
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {plan.remainingFreeVoiceTasks} free voice tasks left today
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <PremiumLock
                title="Google Calendar Sync"
                description="Send confirmed Zantalk tasks into your calendar automatically."
              />
              <PremiumLock
                title="AI Categorization"
                description="Let Zantalk organize work, personal, health, and study tasks for you."
              />
              <PremiumLock
                title="Task Summaries"
                description="Turn your day into a clean AI summary of what matters next."
              />
              <PremiumLock
                title="Follow-up AI Suggestions"
                description="Get suggested next steps after meetings, offers, invoices, and emails."
              />
              <PremiumLock
                title="Smart Reminders"
                description="Use smarter reminders based on urgency, context, and task type."
              />
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
