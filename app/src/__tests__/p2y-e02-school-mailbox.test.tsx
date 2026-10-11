import * as React from 'react';
import { View } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import SchoolSystemScreen from '@/app/system/[id]';
import { SchoolSystemWebView } from '@/features/tools/SchoolSystemWebView';
import { SCRAPE_KIND } from '@/features/tools/injectedScripts';
import { renderApp } from './helpers/renderApp';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReadSchedule = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: jest.fn(),
  Redirect: jest.fn(() => null),
}));
jest.mock('@/features/tools/SchoolSystemWebView', () => ({ SchoolSystemWebView: jest.fn() }));

const paramsHook = jest.mocked(useLocalSearchParams);
const schoolView = jest.mocked(SchoolSystemWebView);

beforeEach(() => {
  jest.clearAllMocks();
  paramsHook.mockReturnValue({ id: 'ac' });
  schoolView.mockImplementation(function SchoolSystemStub(props) {
    React.useImperativeHandle(props.ref, () => ({
      readSchedule: mockReadSchedule,
      probeSession: jest.fn(),
    }));
    return <View testID={props.testID} />;
  });
});

it('keeps the school-system top bar focused on its own actions', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  expect(view.getByText('工具')).toBeTruthy();
  expect(view.queryByTestId('topbar-mailbox')).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
});

it('keeps the close action independent from opening the mailbox', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  await fireEvent.press(view.getByTestId('school-system-close'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
});

it('preserves AC reading and its import destination after results arrive', async () => {
  const view = await renderApp(<SchoolSystemScreen />);
  await fireEvent.press(view.getByTestId('school-read-schedule'));
  expect(mockReadSchedule).toHaveBeenCalledTimes(1);

  const rows = [['Course', 'Time'], ['Algorithms', '08:00']];
  const props = schoolView.mock.calls[schoolView.mock.calls.length - 1][0];
  await act(async () => props.onScheduleMessage?.(JSON.stringify({ kind: SCRAPE_KIND, rows })));
  expect(view.getByTestId('school-schedule-notice')).toBeTruthy();
  await fireEvent.press(view.getByText('课表导入'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/tools/schedule-import',
    params: { text: 'Course\tTime\nAlgorithms\t08:00' },
  });
  expect(view.queryByTestId('topbar-mailbox')).toBeNull();
});

it('keeps a close action on Moodle without exposing AC reading', async () => {
  paramsHook.mockReturnValue({ id: 'moodle' });
  const view = await renderApp(<SchoolSystemScreen />);
  expect(view.getByTestId('webview-moodle')).toBeTruthy();
  expect(view.queryByTestId('school-read-schedule')).toBeNull();
  expect(view.getByTestId('school-system-close')).toBeTruthy();
  expect(view.queryByTestId('topbar-mailbox')).toBeNull();
});

it('redirects an unknown system to tools without mounting browser controls', async () => {
  paramsHook.mockReturnValue({ id: 'unknown-system' });
  const view = await renderApp(<SchoolSystemScreen />);
  expect(jest.mocked(Redirect).mock.calls.some(([props]) => props.href === '/tools')).toBe(true);
  expect(view.queryByTestId('school-system-close')).toBeNull();
  expect(schoolView).not.toHaveBeenCalled();
});
