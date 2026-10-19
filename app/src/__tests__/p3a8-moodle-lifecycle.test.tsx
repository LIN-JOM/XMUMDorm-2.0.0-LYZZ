/**
 * P3A8 · Moodle 生命周期清理（审计 P-3 / D-3）
 *
 * 设计文档承诺：登出、过期、换账号的公共生命周期**立即**清 Moodle 缓存与磁盘快照。
 * 现状：只清 `xmumdorm:` 命名空间，快照用 `@dorm:moodle:v1:` 前缀，登出后仍留在盘上。
 */
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { SessionProvider, useSession } from '@/features/auth/session';
import { saveToken } from '@/features/auth/tokenStore';
import {
  clearMoodleCache, confirmMoodleSchoolIdentity, moodleCacheGeneration, persistMoodleSnapshot,
  readMoodleCache, selectMoodleCourses, settleMoodleStorage, writeMoodleCache,
} from '@/features/tools/moodle/cache';
import { clearSchoolSession } from '@/features/tools/schoolSession';
import { renderApp } from './helpers/renderApp';

jest.mock('../../../shared/api/auth', () => ({ login: jest.fn(), register: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  Redirect: () => null,
}));
jest.mock('@/features/tools/reminders/native', () => ({ clearMoodleReminders: jest.fn() }));

const loginApi = require('../../../shared/api/auth').login as jest.Mock;
const reminderNative = require('@/features/tools/reminders/native') as { clearMoodleReminders: jest.Mock };

const SNAPSHOT_PREFIX = '@dorm:moodle:v1:';
async function snapshotKeys(): Promise<string[]> {
  return (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SNAPSHOT_PREFIX));
}

async function seedSnapshot(): Promise<void> {
  confirmMoodleSchoolIdentity(123);
  selectMoodleCourses([1]);
  writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course one', visible: true }], nextOffset: 0 },
    moodleCacheGeneration());
  await persistMoodleSnapshot();
  await settleMoodleStorage();
  expect(await snapshotKeys()).toHaveLength(1);
}

function StatusProbe(): React.ReactElement {
  const session = useSession();
  return <Text role="body">{`status=${session.status}`}</Text>;
}

function LogoutProbe(): React.ReactElement {
  const session = useSession();
  return <Pressable testID="logout" onPress={() => { void session.logout(); }}>
    <StatusProbe />
  </Pressable>;
}

function ExpireProbe(): React.ReactElement {
  const session = useSession();
  return <Pressable testID="expire" onPress={() => {
    void session.handleAuthFailure({ status: 403, body: { message: '令牌无效或已过期' } });
  }}>
    <StatusProbe />
  </Pressable>;
}

function LoginProbe(): React.ReactElement {
  const session = useSession();
  return <Pressable testID="login" onPress={() => { void session.login('a@b.c', 'pw'); }}>
    <StatusProbe />
  </Pressable>;
}

beforeEach(async () => {
  clearMoodleCache();
  await settleMoodleStorage();
  await AsyncStorage.clear();
  reminderNative.clearMoodleReminders.mockReset();
  loginApi.mockReset();
});

it('p3a8 logout clears the Moodle snapshot and memory', async () => {
  await saveToken('jwt-existing');
  await seedSnapshot();
  const view = await renderApp(<SessionProvider><LogoutProbe /></SessionProvider>);
  await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
  const user = require('@testing-library/react-native').userEvent.setup();
  await user.press(view.getByTestId('logout'));
  await waitFor(() => expect(view.getByText(/status=signedOut/)).toBeTruthy());
  await settleMoodleStorage();
  expect(await snapshotKeys()).toEqual([]);
  expect(readMoodleCache().courses).toEqual([]);
});

it('p3a8 expiry clears the Moodle snapshot', async () => {
  await saveToken('jwt-existing');
  await seedSnapshot();
  const view = await renderApp(<SessionProvider><ExpireProbe /></SessionProvider>);
  await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
  const user = require('@testing-library/react-native').userEvent.setup();
  await user.press(view.getByTestId('expire'));
  await waitFor(() => expect(view.getByText(/status=expired/)).toBeTruthy());
  await settleMoodleStorage();
  expect(await snapshotKeys()).toEqual([]);
});

it('p3a8 account switch drops the previous snapshot', async () => {
  loginApi.mockResolvedValue({ success: true, token: 'jwt-new-account' });
  await seedSnapshot();
  const view = await renderApp(<SessionProvider><LoginProbe /></SessionProvider>);
  await waitFor(() => expect(view.getByText(/status=signedOut/)).toBeTruthy());
  const user = require('@testing-library/react-native').userEvent.setup();
  await user.press(view.getByTestId('login'));
  await waitFor(() => expect(view.getByText(/status=signedIn/)).toBeTruthy());
  await settleMoodleStorage();
  expect(await snapshotKeys()).toEqual([]);
});

it('p3a8 clearing the viewed Moodle session also clears its reminders', async () => {
  await clearSchoolSession('moodle');
  expect(reminderNative.clearMoodleReminders).toHaveBeenCalledTimes(1);
  expect(readMoodleCache().courses).toEqual([]);
});

it('p3a8 clearing the AC session leaves Moodle data alone', async () => {
  confirmMoodleSchoolIdentity(123);
  selectMoodleCourses([1]);
  writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course one', visible: true }], nextOffset: 0 },
    moodleCacheGeneration());
  await clearSchoolSession('ac');
  expect(readMoodleCache().courses).toHaveLength(1);
  expect(reminderNative.clearMoodleReminders).not.toHaveBeenCalled();
});
