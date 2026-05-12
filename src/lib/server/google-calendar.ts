import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";

export const GOOGLE_CALENDAR_FEATURE = "google-calendar-sync";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type GoogleConnection = {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleEventResponse = {
  id?: string;
  error?: {
    message?: string;
  };
};

function env(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function googleRedirectUri() {
  return env("GOOGLE_REDIRECT_URI");
}

function stateSecret() {
  return env("GOOGLE_CLIENT_SECRET");
}

function signStatePayload(payload: string) {
  return createHmac("sha256", stateSecret()).update(payload).digest("hex");
}

export function createGoogleOAuthState(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  const signature = signStatePayload(payload);
  return `${payload}.${signature}`;
}

export function verifyGoogleOAuthState(state: string, userId: string) {
  const parts = state.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [stateUserId, timestamp, signature] = parts;
  if (stateUserId !== userId) {
    return false;
  }

  const createdAt = Number(timestamp);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > STATE_MAX_AGE_MS) {
    return false;
  }

  const expected = signStatePayload(`${stateUserId}.${timestamp}`);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function getGoogleOAuthUrl(userId: string) {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPE,
    state: createGoogleOAuthState(userId),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function tokenExpiresAt(expiresIn = 3600) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

async function requestGoogleToken(params: Record<string, string>) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = (await response.json().catch(() => null)) as TokenResponse | null;

  if (!response.ok || !body?.access_token) {
    throw new Error(
      body?.error_description ??
        body?.error ??
        "Please reconnect Google Calendar",
    );
  }

  return body;
}

export async function exchangeGoogleCode(userId: string, code: string) {
  const tokens = await requestGoogleToken({
    code,
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });

  const supabase = await createClient();
  const existing = await readGoogleConnection(userId);
  const { error } = await supabase.from("google_connections").upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token,
      expires_at: tokenExpiresAt(tokens.expires_in),
      scope: tokens.scope ?? GOOGLE_SCOPE,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getGoogleConnectionStatus(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_connections")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return { connected: Boolean(data) };
}

async function readGoogleConnection(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_connections")
    .select("user_id, access_token, refresh_token, expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as GoogleConnection | null;
}

async function refreshGoogleAccessToken(connection: GoogleConnection) {
  if (!connection.refresh_token) {
    throw new Error("Please reconnect Google Calendar");
  }

  const tokens = await requestGoogleToken({
    refresh_token: connection.refresh_token,
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("google_connections")
    .update({
      access_token: tokens.access_token,
      expires_at: tokenExpiresAt(tokens.expires_in),
      scope: tokens.scope ?? connection.scope,
    })
    .eq("user_id", connection.user_id);

  if (error) {
    throw new Error(error.message);
  }

  return tokens.access_token;
}

export async function getValidGoogleAccessToken(userId: string) {
  const connection = await readGoogleConnection(userId);
  if (!connection?.access_token) {
    throw new Error("Google Calendar is not connected");
  }

  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : 0;
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000) {
    return connection.access_token;
  }

  return refreshGoogleAccessToken(connection);
}

function eventDateTime(task: Task) {
  const time = task.task_time?.slice(0, 5) || "10:00";
  const [hour, minute] = time.split(":").map(Number);
  const endTotalMinutes = (hour || 10) * 60 + (minute || 0) + 30;
  const endHour = Math.floor(endTotalMinutes / 60) % 24;
  const endMinute = endTotalMinutes % 60;
  const endDay =
    endTotalMinutes >= 24 * 60 ? addOneIsoDay(task.task_date) : task.task_date;
  const paddedEndHour = String(endHour).padStart(2, "0");
  const paddedEndMinute = String(endMinute).padStart(2, "0");

  return {
    start: `${task.task_date}T${time}:00`,
    end: `${endDay}T${paddedEndHour}:${paddedEndMinute}:00`,
  };
}

function addOneIsoDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export async function createGoogleCalendarEvent(userId: string, task: Task) {
  const accessToken = await getValidGoogleAccessToken(userId);
  const { start, end } = eventDateTime(task);
  const response = await fetch(GOOGLE_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: task.title,
      description: "Created from Zantalk",
      start: { dateTime: start, timeZone: "Europe/Rome" },
      end: { dateTime: end, timeZone: "Europe/Rome" },
    }),
  });
  const body = (await response.json().catch(() => null)) as
    | GoogleEventResponse
    | null;

  if (!response.ok || !body?.id) {
    const message = body?.error?.message ?? "Could not create calendar event";
    if (response.status === 401 || response.status === 403) {
      throw new Error("Please reconnect Google Calendar");
    }

    throw new Error(message);
  }

  return body.id;
}
