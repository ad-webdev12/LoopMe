// Notifications need permission before iOS will deliver anything. Scheduling
// without it fails silently. The person simply never hears back. So every
// scheduling path goes through here first.
import * as Notifications from 'expo-notifications';

let asked = false;

/** Returns true when we may notify. Asks once per launch, never twice. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    if (asked || !canAskAgain) return false;
    asked = true;
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
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

/**
 * The buttons on a family notification. The native side posts the
 * notification with these category names; iOS shows the buttons on the lock
 * screen, and the responses come back through the listener in App.tsx. The
 * two replies do not even open the app.
 */
export async function registerFamilyCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('LOOPME_CHECK', [
      { identifier: 'scam', buttonTitle: 'Tell them it is a scam', options: { opensAppToForeground: false } },
      { identifier: 'safe', buttonTitle: 'Looks fine', options: { opensAppToForeground: false } },
      { identifier: 'call', buttonTitle: 'Call them', options: { opensAppToForeground: true } },
    ]);
    await Notifications.setNotificationCategoryAsync('LOOPME_NOTE', [
      { identifier: 'call', buttonTitle: 'Call them back', options: { opensAppToForeground: true } },
    ]);
  } catch {}
}

/** A local notification right now, for things the app notices while it is open. */
export async function notifyNow(title: string, body: string, data?: Record<string, unknown>) {
  if (!(await ensureNotificationPermission())) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body, data, interruptionLevel: 'timeSensitive' }, trigger: null });
  } catch {}
}
