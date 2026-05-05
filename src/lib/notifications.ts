import type { Task } from "@/lib/types";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

export function scheduleLocalTaskReminders(tasks: Task[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return () => undefined;
  }

  const timers = tasks
    .filter((task) => task.status === "pending")
    .map((task) => {
      const dueAt = new Date(`${task.task_date}T${task.task_time}`);
      const notifyAt =
        dueAt.getTime() - task.reminder_minutes_before * 60 * 1000;
      const delay = notifyAt - Date.now();

      if (delay <= 0 || delay > 2147483647) {
        return null;
      }

      return window.setTimeout(async () => {
        const registration = await navigator.serviceWorker?.ready.catch(
          () => null,
        );

        if (registration) {
          registration.showNotification("Zantalk reminder", {
            body: task.title,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { url: "/tasks" },
          });
        } else {
          new Notification("Zantalk reminder", {
            body: task.title,
            icon: "/icon-192.png",
          });
        }
      }, delay);
    })
    .filter((timer): timer is number => timer !== null);

  return () => timers.forEach((timer) => window.clearTimeout(timer));
}
