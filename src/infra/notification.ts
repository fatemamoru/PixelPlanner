export interface ReminderNotification {
  reminderId: string;
  scheduledPostId: string;
  title: string;
  body: string;
}

/** Delivers a reminder notification; returns false on failure. (Spec) */
export interface NotificationAdapter {
  deliver(n: ReminderNotification): Promise<boolean>;
}

/**
 * Uses the Web Notifications API when permitted, otherwise falls back to an
 * in-app banner via the provided callback. Never throws; returns false on
 * failure so the ReminderService can apply its retry policy.
 */
export class BrowserNotificationAdapter implements NotificationAdapter {
  constructor(private onInAppBanner: (n: ReminderNotification) => void) {}

  async deliver(n: ReminderNotification): Promise<boolean> {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(n.title, { body: n.body });
        return true;
      }
      // In-app fallback banner.
      this.onInAppBanner(n);
      return true;
    } catch {
      return false;
    }
  }
}

/** Requests notification permission if the API exists. Safe to call anytime. */
export async function requestNotificationPermission(): Promise<void> {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    // ignore - fallback banner path will be used
  }
}
