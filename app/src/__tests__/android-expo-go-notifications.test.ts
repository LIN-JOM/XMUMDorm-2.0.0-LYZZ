// Exercise the real SDK entry point: the global notification mock hides its
// Android Expo Go import-time push registration error.
jest.unmock('expo-notifications');
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  isRunningInExpoGo: () => true,
}));

it('loads the startup reminder host and notification permission boundary in Android Expo Go', () => {
  expect(() => {
    jest.requireActual('@/features/tools/reminders/ReminderRuntimeHost');
    jest.requireActual('@/features/notifications/permissions');
  }).not.toThrow();
});

it('does not load the unsupported SDK when reading/requesting permission or clearing reminders', async () => {
  const { notificationPermission } = jest.requireActual<typeof import('@/features/notifications/permissions')>('@/features/notifications/permissions');
  const { clearReminderOwner } = jest.requireActual<typeof import('@/features/tools/reminders/native')>('@/features/tools/reminders/native');
  await expect(notificationPermission.read()).resolves.toBe('unavailable');
  await expect(notificationPermission.request()).resolves.toBe('unavailable');
  await expect(clearReminderOwner('user:7')).resolves.toBeUndefined();
});
