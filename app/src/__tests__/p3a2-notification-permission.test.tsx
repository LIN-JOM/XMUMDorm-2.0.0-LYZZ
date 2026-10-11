import * as React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderApp} from './helpers/renderApp';
import {SettingsScreen} from '@/features/me/SettingsScreen';

jest.mock('@/features/notifications/permissions', () => ({
  notificationPermission: {
    read: jest.fn(),
    request: jest.fn(),
    openSettings: jest.fn(),
  },
}));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ logout: jest.fn() }),
}));

const mockPermission = jest.requireMock('@/features/notifications/permissions').notificationPermission as {
  read: jest.Mock;
  request: jest.Mock;
  openSettings: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.read.mockResolvedValue('undetermined');
  mockPermission.request.mockResolvedValue('granted');
});

it('先解释用途，再请求通知权限并显示服务端外的系统回执', async () => {
  const view = await renderApp(<SettingsScreen />);

  await waitFor(() => expect(view.getByText('上课提醒与重要消息')).toBeTruthy());
  expect(view.getByText('仅在你开启后发送课程提醒和重要校园消息')).toBeTruthy();

  await fireEvent.press(view.getByTestId('settings-notifications-request'));

  await waitFor(() => expect(mockPermission.request).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByText('通知已开启')).toBeTruthy());
});

it('拒绝后保留系统设置修复入口', async () => {
  mockPermission.read.mockResolvedValue('denied');
  const view = await renderApp(<SettingsScreen />);

  await waitFor(() => expect(view.getByText('通知未开启')).toBeTruthy());
  await fireEvent.press(view.getByTestId('settings-notifications-open-settings'));
  expect(mockPermission.openSettings).toHaveBeenCalledTimes(1);
});
