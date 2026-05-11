import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { getOnboardingCompleted } from "@/lib/server/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const onboardingCompleted = await getOnboardingCompleted(user.id);

  if (onboardingCompleted) {
    redirect("/app");
  }

  return <OnboardingFlow />;
}
