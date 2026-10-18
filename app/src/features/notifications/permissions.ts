import {Linking, Platform} from 'react-native';
import type * as Notifications from 'expo-notifications';
import {loadNotificationClient, type NotificationClient} from './client';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const CHANNEL_ID = 'class-reminders';

function readStatus(status: Notifications.NotificationPermissionsStatus, client: NotificationClient): NotificationPermission {
  if (status.granted) return 'granted';
  if (Platform.OS === 'ios') {
    const value = status.ios?.status;
    if (value === client.IosAuthorizationStatus.AUTHORIZED ||
      value === client.IosAuthorizationStatus.PROVISIONAL ||
      value === client.IosAuthorizationStatus.EPHEMERAL) return 'granted';
  }
  return status.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureAndroidChannel(client: NotificationClient): Promise<void> {
  if (Platform.OS !== 'android') return;
  await client.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Class reminders',
    importance: client.AndroidImportance.DEFAULT,
  });
}

/** The only App boundary for notification consent; scheduling remains the timetable domain's work. */
export const notificationPermission = {
  async read(): Promise<NotificationPermission> {
    const client = await loadNotificationClient();
    if (!client) return 'unavailable';
    await ensureAndroidChannel(client);
    return readStatus(await client.getPermissionsAsync(), client);
  },
  async request(): Promise<NotificationPermission> {
    const client = await loadNotificationClient();
    if (!client) return 'unavailable';
    await ensureAndroidChannel(client);
    return readStatus(await client.requestPermissionsAsync(), client);
  },
  async openSettings(): Promise<void> {
    await Linking.openSettings();
  },
};
