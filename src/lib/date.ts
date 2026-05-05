const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInBerlin() {
  return formatter.format(new Date());
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function formatDisplayTime(time: string) {
  return time.slice(0, 5);
}
