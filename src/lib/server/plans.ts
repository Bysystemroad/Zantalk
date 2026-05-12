import { todayInBerlin } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

export type PlanName = "free" | "premium";
export type PremiumFeature =
  | "google-calendar-sync"
  | "google_calendar_sync"
  | "ai-categorization"
  | "task-summaries"
  | "follow-up-suggestions"
  | "follow_up_ai"
  | "smart-reminders"
  | string;

export type UserPlan = {
  id: string;
  plan: PlanName;
  premium_until: string | null;
  daily_voice_count: number;
  last_voice_reset: string;
};

export const FREE_DAILY_VOICE_LIMIT = 3;
export const FREE_LIMIT_ERROR = {
  error: "Daily free limit reached",
  code: "FREE_LIMIT_REACHED",
} as const;

function isActivePremium(profile: Pick<UserPlan, "plan" | "premium_until">) {
  if (profile.plan !== "premium") {
    return false;
  }

  if (!profile.premium_until) {
    return true;
  }

  return new Date(profile.premium_until).getTime() > Date.now();
}

async function ensureProfile(userId: string) {
  const supabase = await createClient();
  const today = todayInBerlin();
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, plan, premium_until, daily_voice_count, last_voice_reset")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!existing) {
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({ id: userId, last_voice_reset: today })
      .select("id, plan, premium_until, daily_voice_count, last_voice_reset")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return created as UserPlan;
  }

  if (existing.last_voice_reset !== today) {
    const { data: reset, error: resetError } = await supabase
      .from("profiles")
      .update({ daily_voice_count: 0, last_voice_reset: today })
      .eq("id", userId)
      .select("id, plan, premium_until, daily_voice_count, last_voice_reset")
      .single();

    if (resetError) {
      throw new Error(resetError.message);
    }

    return reset as UserPlan;
  }

  return existing as UserPlan;
}

export async function getUserPlan(userId: string) {
  const profile = await ensureProfile(userId);
  return {
    ...profile,
    isPremium: isActivePremium(profile),
    remainingFreeVoiceTasks: isActivePremium(profile)
      ? null
      : Math.max(0, FREE_DAILY_VOICE_LIMIT - profile.daily_voice_count),
  };
}

export async function isPremium(userId: string) {
  const plan = await getUserPlan(userId);
  return plan.isPremium;
}

export async function canCreateVoiceTask(userId: string) {
  const plan = await getUserPlan(userId);

  if (plan.isPremium) {
    return { allowed: true, plan } as const;
  }

  return {
    allowed: plan.daily_voice_count < FREE_DAILY_VOICE_LIMIT,
    plan,
  } as const;
}

export async function canUseFeature(userId: string, featureName: PremiumFeature) {
  void featureName;
  return isPremium(userId);
}

export async function incrementDailyVoiceCount(userId: string) {
  const plan = await getUserPlan(userId);

  if (plan.isPremium) {
    return plan;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ daily_voice_count: plan.daily_voice_count + 1 })
    .eq("id", userId)
    .select("id, plan, premium_until, daily_voice_count, last_voice_reset")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserPlan;
}

export async function startCheckout(planInterval: "monthly" | "yearly") {
  return {
    planInterval,
    status: "not_configured",
    message: "Checkout provider is not configured yet.",
  };
}

export async function syncSubscriptionStatus(userId: string) {
  return {
    userId,
    status: "not_configured",
    message: "Subscription sync provider is not configured yet.",
  };
}
