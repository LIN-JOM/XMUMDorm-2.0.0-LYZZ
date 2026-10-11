import * as React from 'react';
import { BackHandler, Button as NativeButton } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { HolidaysContent, upcomingSchoolHolidays } from '@/features/tools/HolidaysScreen';
import { ToolsDashboardContent } from '@/features/tools/ToolsDashboard';
import { clearNamespace } from '@/shared/storage';

jest.mock('expo-router', () => {
  const state = { focused: true };
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    __state: state,
    useFocusEffect: (callback: () => void | (() => void)) => react.useEffect(() => state.focused ? callback() : undefined, [callback, state.focused]),
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  };
});
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ handleAuthFailure: async () => ({ kind: 'unknown' }) }) }));
jest.mock('../../../shared/api/schedule', () => ({ getScheduleWeek: jest.fn(async (week: number) => ({ week, currentWeek: week, days: {} })) }));
jest.mock('../../../shared/api/todos', () => ({ getTodayTodos: jest.fn(async () => ({ total: 0, active: 0, completed: 0, topItems: [] })) }));

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: [
    'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
    'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  ] });
  jest.setSystemTime(new Date('2026-10-11T00:00:00Z'));
  await clearNamespace();
  jest.requireMock('expo-router').__state.focused = true;
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('keeps a holiday through its final school date and drops it on the next date', () => {
  expect(upcomingSchoolHolidays(new Date('2026-11-09T15:59:59Z'))[0]?.id).toBe('deepavali-2026');
  expect(upcomingSchoolHolidays(new Date('2026-11-09T16:00:00Z'))[0]?.id).toBe('selangor-sultan-2026');
});

it('puts holidays directly under courses and opens all upcoming dates from the summary', async () => {
  const view = await renderApp(<ToolsDashboardContent />);
  await waitFor(() => expect(view.getByTestId('tools-today-todos')).toBeTruthy());
  const children = view.getByTestId('tools-dashboard-content').props.children;
  expect(children.slice(0, 3).map((child: React.ReactElement<{ testID?: string }>) => child.props.testID))
    .toEqual(['tools-courses', 'tools-holidays', 'tools-today-todos']);
  await fireEvent.press(view.getByTestId('tools-holiday-open'));
  expect(view.getByTestId('tools-holidays-content')).toBeTruthy();
  expect(view.getByTestId('holiday-deepavali-2026')).toBeTruthy();
  expect(view.getByTestId('holiday-new-year-2028')).toBeTruthy();
  await fireEvent.press(view.getByTestId('tools-holidays-back'));
  expect(view.getByTestId('tools-today-todos')).toBeTruthy();
});

it('closes local holiday content on Android back and removes its handler', async () => {
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => { back = callback; return { remove }; });
  const view = await renderApp(<ToolsDashboardContent />);
  await fireEvent.press(view.getByTestId('tools-holiday-open'));
  expect(back).toBeDefined();
  await act(async () => { expect(back?.({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(true); });
  expect(view.getByTestId('tools-today-todos')).toBeTruthy();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('removes the back handler while the containing route is unfocused', async () => {
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
  const onBack = jest.fn();
  const now = new Date('2026-10-11T00:00:00Z');
  function FocusProbe() {
    const [, refresh] = React.useState(0);
    return <><NativeButton testID="blur-route" title="Blur" onPress={() => {
      jest.requireMock('expo-router').__state.focused = false;
      refresh((value) => value + 1);
    }} /><HolidaysContent now={now} onBack={onBack} /></>;
  }
  const view = await renderApp(<FocusProbe />);
  await fireEvent.press(view.getByTestId('blur-route'));
  expect(remove).toHaveBeenCalledTimes(1);
});

it('shows existing empty copy when the local calendar has no later dates', async () => {
  const view = await renderApp(<HolidaysContent now={new Date('2030-01-01T00:00:00Z')} onBack={jest.fn()} />);
  expect(view.getByText('本地日历暂无后续放假日')).toBeTruthy();
});

it('renders English holiday names using the shared calendar data', async () => {
  const view = await renderApp(<HolidaysContent now={new Date('2026-10-11T00:00:00Z')} onBack={jest.fn()} />, { locale: 'en', scheme: 'light' });
  expect(view.getByText('Deepavali · 2026-11-08 to 2026-11-09')).toBeTruthy();
  expect(view.getByText('Back')).toBeTruthy();
});
