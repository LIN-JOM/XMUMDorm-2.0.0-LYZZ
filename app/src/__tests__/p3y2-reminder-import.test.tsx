import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { ToastProvider } from '@/components/ui/Toast';
import { clearNamespace } from '@/shared/storage';
import ImportScreen from '@/app/tools/schedule-import';
import { configureTimetableReminderRefresh } from '@/features/tools/reminders/runtime';
import * as scheduleApi from '../../../shared/api/schedule';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: jest.fn() }),
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => ({ text: 'Course\tCS101\tAlgorithms\tMonday\t08:00' }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error }) }));
jest.mock('@/features/mailbox/useUnread', () => ({ useMailboxBadge: () => ({ unreadCount: 0, onMailboxPress: jest.fn() }) }));
jest.mock('../../../shared/api/schedule', () => ({ previewScheduleImport: jest.fn(), commitScheduleImport: jest.fn() }));
const api = jest.mocked(scheduleApi);
let dispose: (() => void) | undefined;
beforeEach(async () => {
  await clearNamespace(); jest.clearAllMocks();
  api.previewScheduleImport.mockResolvedValue({ courses: [{ course_code: 'CS101', course_name: 'Algorithms' }], meetings: [], errors: [] });
  api.commitScheduleImport.mockResolvedValue({});
});
afterEach(() => { dispose?.(); dispose = undefined; });

async function submit() {
  const view = await renderApp(<ToastProvider><ImportScreen /></ToastProvider>);
  await fireEvent.press(view.getByTestId('import-preview'));
  await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
  await fireEvent.press(view.getByTestId('import-commit'));
  await fireEvent.press(view.getByText('覆盖'));
  return view;
}

it('refreshes reminders exactly once after an accepted import commit', async () => {
  const refresh = jest.fn(async () => undefined), onError = jest.fn();
  dispose = configureTimetableReminderRefresh({ refresh, onError });
  await submit();
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});
it('does not refresh reminders after a rejected import commit', async () => {
  const refresh = jest.fn(async () => undefined);
  dispose = configureTimetableReminderRefresh({ refresh, onError: jest.fn() });
  api.commitScheduleImport.mockRejectedValue({ kind: 'offline' });
  const view = await submit();
  await waitFor(() => expect(view.getByTestId('import-summary')).toBeTruthy());
  await waitFor(() => expect(api.commitScheduleImport).toHaveBeenCalledTimes(1));
  expect(refresh).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});
it('reports native refresh failure separately without inviting a second successful import', async () => {
  const failure = new Error('native failure'), onError = jest.fn();
  dispose = configureTimetableReminderRefresh({ refresh: async () => { throw failure; }, onError });
  await submit();
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(onError).toHaveBeenCalledWith(failure);
  expect(api.commitScheduleImport).toHaveBeenCalledTimes(1);
});
