import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { getGoogleConnectionStatus } from "@/lib/server/google-calendar";
import { getOnboardingCompleted } from "@/lib/server/onboarding";
import { getUserPlan } from "@/lib/server/plans";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{ google?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { google } = await searchParams;
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

  const plan = await getUserPlan(user.id);
  const googleConnection = plan.isPremium
    ? await getGoogleConnectionStatus(user.id)
    : { connected: false };

  return (
    <AppShell title="Settings">
      <section className="grid gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Integrations
          </h1>
        </div>
        {google === "connected" ? (
          <p className="rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Google Calendar connected.
          </p>
        ) : null}
        <GoogleCalendarCard
          isPremium={plan.isPremium}
          connected={googleConnection.connected}
        />
      </section>
    </AppShell>
  );
}
