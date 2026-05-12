import { NextResponse } from "next/server";
import {
  getGoogleOAuthUrl,
  GOOGLE_CALENDAR_FEATURE,
} from "@/lib/server/google-calendar";
import { canUseFeature } from "@/lib/server/plans";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const allowed = await canUseFeature(user.id, GOOGLE_CALENDAR_FEATURE);
  if (!allowed) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  return NextResponse.redirect(getGoogleOAuthUrl(user.id));
}
