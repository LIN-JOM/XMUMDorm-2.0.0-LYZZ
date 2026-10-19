/**
 * P3A7 · 课表页面骨架（周次条 + 底部操作）
 *
 * 依据：`docs/app/task/课表重做/T4-周次条与页面骨架.md`
 *   · 上一周/下一周按 1 周步进；· 底部收成一行（导入 / 刷新）；· 周次选中态仍可读。
 */
import * as React from 'react';
import { userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import TimetableScreen from '@/app/tools/timetable';
import { clampWeek, currentTeachingWeek } from '../../../shared/config/semesters';

jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn() }));
jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[] };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      back: () => undefined,
      canGoBack: () => false,
      replace: () => undefined,
    }),
    useLocalSearchParams: () => ({}),
  };
});

const api = jest.requireMock('../../../shared/api/schedule') as { getScheduleWeek: jest.Mock };
const routerState = jest.requireMock('expo-router').__state as { pushed: unknown[] };

const payload = (week: number) => ({
  week,
  currentWeek: week,
  totalWeeks: 20,
  days: {
    1: [{ course_code: 'G0173', course_name: '大学英语', day_of_week: 1, start_time: '08:00', end_time: '10:00', venue: 'A5#G11' }],
  },
});

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

beforeEach(() => {
  api.getScheduleWeek.mockReset().mockImplementation(async (week: number) => payload(week));
  routerState.pushed.length = 0;
});

describe('P3A7 课表页面骨架', () => {
  it('下一周按 1 周步进，而不是一段 5 周', async () => {
    const initial = clampWeek(currentTeachingWeek(new Date()) ?? 1, 20);
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-grid')).toBeTruthy());
    const user = userEvent.setup();
    await user.press(view.getByTestId('timetable-next'));
    await waitFor(() => expect(api.getScheduleWeek).toHaveBeenCalledWith(clampWeek(initial + 1, 20)));
  });

  it('上一周同样按 1 周步进（不会跳到第 0 周）', async () => {
    const initial = clampWeek(currentTeachingWeek(new Date()) ?? 1, 20);
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-grid')).toBeTruthy());
    const user = userEvent.setup();
    await user.press(view.getByTestId('timetable-prev'));
    await waitFor(() => expect(api.getScheduleWeek).toHaveBeenCalledWith(clampWeek(initial - 1, 20)));
  });

  it('底部收成一行：导入课表 + 刷新，点导入去导入页', async () => {
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-import')).toBeTruthy());
    expect(view.getByTestId('timetable-refresh')).toBeTruthy();
    // 旧的说明段落已移除
    expect(view.queryByText('周次按学校所在地时区计算')).toBeNull();
    const user = userEvent.setup();
    await user.press(view.getByTestId('timetable-import'));
    expect(routerState.pushed).toContain('/tools/schedule-import');
  });

  it('当前周在周次条里是选中态（读屏可感知）', async () => {
    const view = await renderApp(withProviders(<TimetableScreen />));
    await waitFor(() => expect(view.getByTestId('timetable-grid')).toBeTruthy());
    const initial = clampWeek(currentTeachingWeek(new Date()) ?? 1, 20);
    expect(view.getByTestId(`week-number-${initial}`).props.accessibilityState.selected).toBe(true);
  });
});
