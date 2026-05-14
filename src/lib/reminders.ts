export const DEFAULT_REMINDER_MINUTES = 30;
export const MAX_REMINDER_MINUTES = 2880;

export const reminderOptions = [
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
] as const;

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  a: 1,
  an: 1,
  bir: 1,
  iki: 2,
  un: 1,
  una: 1,
  due: 2,
};

export function normalizeReminderMinutes(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return DEFAULT_REMINDER_MINUTES;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_REMINDER_MINUTES;
  }

  return Math.max(1, Math.min(MAX_REMINDER_MINUTES, Math.round(parsed)));
}

export function formatReminderBefore(minutes: number) {
  const normalized = normalizeReminderMinutes(minutes);

  if (normalized % 1440 === 0) {
    const days = normalized / 1440;
    return `${days} ${days === 1 ? "day" : "days"} before`;
  }

  if (normalized % 60 === 0) {
    const hours = normalized / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"} before`;
  }

  return `${normalized} min before`;
}

function wordToNumber(value: string) {
  const lower = value.toLowerCase();
  return Number(lower) || numberWords[lower] || null;
}

export function parseReminderMinutesFromText(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ");

  if (
    /\b(the )?day before\b/.test(normalized) ||
    /\bbir gun once\b/.test(normalized) ||
    /\bbir gün önce\b/.test(normalized) ||
    /\bun giorno prima\b/.test(normalized)
  ) {
    return 1440;
  }

  const match = normalized.match(
    /\b(\d+|one|two|a|an|bir|iki|un|una|due)\s*(minutes?|mins?|minuti?|dakika|dk|hours?|saat|ore?|ora|days?|gun|gün|giorn[oi])\s*(before|earlier|prior|once|önce|prima)\b/,
  );

  if (!match) {
    return null;
  }

  const amount = wordToNumber(match[1]);
  if (!amount) {
    return null;
  }

  const unit = match[2];
  if (/minutes?|mins?|minuti?|dakika|dk/.test(unit)) {
    return normalizeReminderMinutes(amount);
  }

  if (/hours?|saat|ore?|ora/.test(unit)) {
    return normalizeReminderMinutes(amount * 60);
  }

  if (/days?|gun|gün|giorn[oi]/.test(unit)) {
    return normalizeReminderMinutes(amount * 1440);
  }

  return null;
}
