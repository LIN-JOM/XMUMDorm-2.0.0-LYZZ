import * as React from 'react';
import { AppState } from 'react-native';
import { act, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { remainingTodayCourses } from '@/features/tools/todaySummary';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { clearNamespace } from '@/shared/storage';
import type { TimetableMeeting } from '@/features/tools/timetable';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async (error: unknown) => error }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn(async () => ({ topItems: [] })) }));
const api = jest.requireMock('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const meeting = (courseCode: string, startTime: string | null, endTime: string | null): TimetableMeeting => ({
  courseCode, courseName: courseCode, startTime, endTime, dayOfWeek: 1, lecturer: null, credit: null, venue: null,
});
beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-10-05T01:59:00Z'));
  await clearNamespace();
  api.getScheduleWeek.mockReset().mockImplementation(async (week: number) => ({ week, currentWeek: week,
    days: { 1: [meeting('Ends at ten', '09:00', '10:00'), meeting('Later', '11:00', '12:00')] },
  }));
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('removes ended classes at the exact end while keeping active, future and unknown ends', () => {
  expect(remainingTodayCourses([
    meeting('Past', '08:00', '09:00'), meeting('Exact', '09:00', '10:00'),
    meeting('Active', '09:30', '10:30'), meeting('Future', '11:00', '12:00'),
    meeting('Unknown', '08:00', null), meeting('Invalid', '08:00', '24:00'),
  ], 600).map((item) => item.courseCode)).toEqual(['Active', 'Future', 'Unknown', 'Invalid']);
});

it('keeps second precision and does not guess a next-day end', () => {
  expect(remainingTodayCourses([meeting('Seconds', '09:00', '10:00:30')], 600.25)).toHaveLength(1);
  expect(remainingTodayCourses([meeting('Seconds', '09:00', '10:00:30')], 600.5)).toHaveLength(0);
  expect(remainingTodayCourses([meeting('Cross midnight', '23:30', '00:15')], 1430)).toHaveLength(1);
});

it('shrinks the dashboard when its clock reaches the end time', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Ends at ten')).toBeTruthy());
  await act(async () => { jest.advanceTimersByTime(60_000); });
  await waitFor(() => expect(view.queryByText('Ends at ten')).toBeNull());
  expect(view.getByText('Later')).toBeTruthy();
});

it('uses the school date when UTC is still on the previous date', async () => {
  jest.setSystemTime(new Date('2026-10-04T16:30:00Z'));
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Ends at ten')).toBeTruthy());
  expect(view.getByText('Later')).toBeTruthy();
});

it('refreshes the school clock on foreground activation after a long pause', async () => {
  let change: Parameters<typeof AppState.addEventListener>[1] | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { change = callback; return { remove }; });
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByText('Ends at ten')).toBeTruthy());
  jest.setSystemTime(new Date('2026-10-05T02:15:00Z'));
  await act(async () => { change?.('active'); });
  expect(view.queryByText('Ends at ten')).toBeNull();
  expect(view.getByText('Later')).toBeTruthy();
});
