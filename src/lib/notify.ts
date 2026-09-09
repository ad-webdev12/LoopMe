// Reminders need permission before iOS will deliver anything. Scheduling
// without it fails silently — the person simply never hears back — so every
// scheduling path goes through here first.
import * as Notifications from 'expo-notifications';

let asked = false;

/** Returns true when we may schedule. Asks once per launch, never twice. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    if (asked || !canAskAgain) return false;
    asked = true;
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: false, allowBadge: false },
    });
    return req.status === 'granted';
  } catch { return false; }
}

/** Schedules a reminder, or resolves null when permission is not granted. */
export async function scheduleReminder(title: string, body: string, seconds: number): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch { return null; }
}

export async function cancelReminders(ids: string[]) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}
