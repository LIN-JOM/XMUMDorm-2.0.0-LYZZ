import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

export type NotificationClient = typeof import('expo-notifications');

/**
 * SDK 57's public entry point registers a push-token listener while importing,
 * which throws in Android Expo Go even when we only need local reminders.
 * Keep that entry point out of the preview's startup and permission paths.
 */
export async function loadNotificationClient(): Promise<NotificationClient | null> {
  if (Platform.OS === 'android' && isRunningInExpoGo()) return null;
  // Keep the load conditional while supporting both Metro and the Jest CJS runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const client: NotificationClient = require('expo-notifications');
  return client;
}
