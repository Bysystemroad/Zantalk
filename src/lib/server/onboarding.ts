import { createClient } from "@/lib/supabase/server";

export type OnboardingProfile = {
  id: string;
  onboarding_completed: boolean;
};

async function ensureOnboardingProfile(userId: string) {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return existing as OnboardingProfile;
  }

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("id, onboarding_completed")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return created as OnboardingProfile;
}

export async function getOnboardingCompleted(userId: string) {
  const profile = await ensureOnboardingProfile(userId);
  return profile.onboarding_completed;
}

export async function setOnboardingCompleted(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
