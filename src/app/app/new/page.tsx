import { redirect } from "next/navigation";
import { NewTaskFlow } from "@/app/app/new/new-task-flow";
import {
  getGoogleConnectionStatus,
  GOOGLE_CALENDAR_FEATURE,
} from "@/lib/server/google-calendar";
import { getOnboardingCompleted } from "@/lib/server/onboarding";
import { canUseFeature } from "@/lib/server/plans";
import { FOLLOW_UP_FEATURE } from "@/lib/server/follow-up";
import { createClient } from "@/lib/supabase/server";

export default async function NewTaskPage() {
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

  const canUseFollowUp = await canUseFeature(user.id, FOLLOW_UP_FEATURE);
  const canUseCalendar = await canUseFeature(user.id, GOOGLE_CALENDAR_FEATURE);
  const googleConnection = canUseCalendar
    ? await getGoogleConnectionStatus(user.id)
    : { connected: false };

  return (
    <NewTaskFlow
      canUseFollowUp={canUseFollowUp}
      canUseCalendar={canUseCalendar}
      calendarConnected={googleConnection.connected}
    />
  );
}
