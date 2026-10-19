import { isRunningInExpoGo, PermissionStatus } from 'expo';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationPermission } from '@/features/notifications/permissions';
import { clearReminderOwner, replaceMoodleReminders } from '@/features/tools/reminders/native';

jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  isRunningInExpoGo: jest.fn(() => false),
}));
jest.mock('@/features/tools/cacheIdentity', () => ({
  timetableIdentity: () => ({ scope: 'user:7:semester:2026-09', epoch: 1, persist: true }),
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'native-reminder'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

it('retains permission consent and native reminder scheduling in an Android development build', async () => {
  await expect(notificationPermission.read()).resolves.toBe('granted');
  await expect(notificationPermission.request()).resolves.toBe('granted');
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', {
    name: 'Reminders', importance: 3,
  });
  const fireAt = Date.now() + 60_000;
  await replaceMoodleReminders([{ id: 'deadline:1', fireAt }],
    { title: 'Moodle deadline', body: 'A Moodle deadline is coming up' });
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
    content: {
      title: 'Moodle deadline', body: 'A Moodle deadline is coming up',
      data: { dormReminder: 'phase3-v1', owner: 'user:7', domain: 'moodle' },
    },
    trigger: new Date(fireAt),
  });
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([{
    identifier: 'native-reminder',
    content: {
      title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null,
      data: { dormReminder: 'phase3-v1', owner: 'user:7', domain: 'moodle' },
    },
    trigger: null,
  }]);
  await clearReminderOwner('user:7');
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('native-reminder');
});

it('reports the scheduler result instead of assuming reminders were planned', async () => {
  const denied = { granted: false, canAskAgain: false } as unknown as Awaited<
    ReturnType<typeof Notifications.getPermissionsAsync>
  >;
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(denied);
  await expect(replaceMoodleReminders([{ id: 'deadline:denied', fireAt: Date.now() + 60_000 }],
    { title: 'Moodle deadline', body: 'A Moodle deadline is coming up' }))
    .resolves.toBe('denied');

  await expect(replaceMoodleReminders([{ id: 'deadline:planned', fireAt: Date.now() + 60_000 }],
    { title: 'Moodle deadline', body: 'A Moodle deadline is coming up' }))
    .resolves.toBe('planned');

  const occupied = Array.from({ length: 50 }, (_, index) => ({
    identifier: `other-${index}`, content: { data: { unrelated: true } },
  }));
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue(occupied as never);
  await expect(replaceMoodleReminders([{ id: 'deadline:partial', fireAt: Date.now() + 60_000 }],
    { title: 'Moodle deadline', body: 'A Moodle deadline is coming up' }))
    .resolves.toBe('partial');
});

it('keeps notification permissions available in iOS Expo Go', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(isRunningInExpoGo).mockReturnValue(true);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
    status: PermissionStatus.DENIED, expires: 'never', granted: false, canAskAgain: false,
    ios: {
      status: Notifications.IosAuthorizationStatus.PROVISIONAL,
      allowsDisplayInNotificationCenter: null, allowsDisplayOnLockScreen: null,
      allowsDisplayInCarPlay: null, allowsAlert: null, allowsBadge: null,
      allowsSound: null, allowsCriticalAlerts: null, alertStyle: 0,
      allowsPreviews: null, providesAppNotificationSettings: null, allowsAnnouncements: null,
    },
  });
  await expect(notificationPermission.read()).resolves.toBe('granted');
  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
});
