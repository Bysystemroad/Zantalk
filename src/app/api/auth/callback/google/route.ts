import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  verifyGoogleOAuthState,
} from "@/lib/server/google-calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/app?google=error&message=${encodeURIComponent(error)}`, url),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url));
  }

  if (!code || !state || !verifyGoogleOAuthState(state, user.id)) {
    return NextResponse.redirect(
      new URL("/app?google=error&message=Invalid%20Google%20connection", url),
    );
  }

  try {
    await exchangeGoogleCode(user.id, code);
    return NextResponse.redirect(new URL("/app/settings?google=connected", url));
  } catch (connectError) {
    const message =
      connectError instanceof Error
        ? connectError.message
        : "Could not connect Google Calendar";
    return NextResponse.redirect(
      new URL(
        `/app?google=error&message=${encodeURIComponent(message)}`,
        url,
      ),
    );
  }
}
