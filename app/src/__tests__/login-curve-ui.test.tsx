import * as React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, userEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import LoginScreen from '@/app/login';

const mockLogin = jest.fn();
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signedOut', login: mockLogin }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: () => false, back: jest.fn(), replace: jest.fn() },
}));
const router = jest.requireMock('expo-router').router as { push: jest.Mock; replace: jest.Mock };

beforeEach(() => {
  mockLogin.mockReset();
  mockLogin.mockResolvedValue({ ok: true });
});

describe('登录曲面页面', () => {
  it('密码显示切换保留已输入的值', async () => {
    const view = await renderApp(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(view.getByTestId('login-password'), 'sample-password');
    expect(view.getByTestId('login-password')).toHaveProp('secureTextEntry', true);
    await user.press(view.getByRole('button', { name: '显示密码' }));
    expect(view.getByTestId('login-password')).toHaveProp('secureTextEntry', false);
    expect(view.getByTestId('login-password')).toHaveProp('value', 'sample-password');
    await user.press(view.getByRole('button', { name: '隐藏密码' }));
    expect(view.getByTestId('login-password')).toHaveProp('secureTextEntry', true);
    expect(view.getByTestId('login-password')).toHaveProp('value', 'sample-password');
  });

  it.each([
    ['login-to-register', '/register'],
    ['login-to-reset', '/reset-password'],
    ['login-terms', '/me/legal/terms'],
    ['login-privacy', '/me/legal/privacy'],
  ])('%s 可进入 %s', async (testID, route) => {
    const view = await renderApp(<LoginScreen />);
    await userEvent.setup().press(view.getByTestId(testID));
    expect(router.push).toHaveBeenCalledWith(route);
  });

  it('登录未完成时重复点击只发送一个请求', async () => {
    let finish!: (result: { ok: boolean }) => void;
    mockLogin.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = await renderApp(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(view.getByTestId('login-identifier'), 'student@xmu.edu.my');
    await user.type(view.getByTestId('login-password'), 'sample-password');
    await user.press(view.getByTestId('login-submit'));
    await user.press(view.getByTestId('login-submit'));
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('login-submit')).toHaveProp('accessibilityState', expect.objectContaining({ busy: true }));
    await act(async () => finish({ ok: true }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('内容增高或视口缩小时，先缩短空白，保留可滚动表单', async () => {
    const view = await renderApp(<LoginScreen />);
    const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });
    await fireEvent(view.getByTestId('login-form-content'), 'layout', layout(390, 500));
    await fireEvent(view.getByTestId('login-viewport'), 'layout', layout(390, 800));
    const normalBlank = StyleSheet.flatten(view.getByTestId('login-logo-space').props.style).height;
    expect(normalBlank).toBeGreaterThan(0);
    expect(normalBlank).toBeLessThanOrEqual(300);
    await fireEvent(view.getByTestId('login-viewport'), 'layout', layout(390, 360));
    expect(view.getByTestId('login-logo-space')).toHaveStyle({ height: 0 });
    expect(view.getByTestId('login-scroll')).toHaveProp('keyboardShouldPersistTaps', 'handled');
    expect(view.getByTestId('login-background-layer', { includeHiddenElements: true })).toBeEmptyElement();
  });

  it('浅色英文界面保留全部登录操作', async () => {
    const view = await renderApp(<LoginScreen />, { scheme: 'light', locale: 'en' });
    expect(view.getByTestId('login-identifier')).toHaveProp('accessibilityLabel', expect.stringContaining('Student ID or email'));
    expect(view.getByRole('button', { name: 'Show password' })).toBeTruthy();
    expect(view.getByTestId('login-terms')).toBeTruthy();
    expect(view.getByTestId('login-privacy')).toBeTruthy();
  });
});
