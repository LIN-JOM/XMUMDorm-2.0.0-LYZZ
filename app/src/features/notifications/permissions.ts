import {Linking, Platform} from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

const CHANNEL_ID = 'class-reminders';

function readStatus(status: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (status.granted) return 'granted';
  if (Platform.OS === 'ios') {
    const value = status.ios?.status;
    if (value === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      value === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      value === Notifications.IosAuthorizationStatus.EPHEMERAL) return 'granted';
  }
  return status.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Class reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** The only App boundary for notification consent; scheduling remains the timetable domain's work. */
export const notificationPermission = {
  async read(): Promise<NotificationPermission> {
    await ensureAndroidChannel();
    return readStatus(await Notifications.getPermissionsAsync());
  },
  async request(): Promise<NotificationPermission> {
    await ensureAndroidChannel();
    return readStatus(await Notifications.requestPermissionsAsync());
  },
  async openSettings(): Promise<void> {
    await Linking.openSettings();
  },
};
