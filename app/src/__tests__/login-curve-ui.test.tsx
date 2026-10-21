import * as React from 'react';
import { StyleSheet, Text as NativeText } from 'react-native';
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import LoginScreen from '@/app/login';
import { useI18n } from '@/i18n';

const mockLogin = jest.fn();
let mockPathname = '/login';
jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signedOut', login: mockLogin }),
}));
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  router: {
    push: jest.fn(),
    canGoBack: () => false,
    back: jest.fn(),
    replace: jest.fn(),
  },
}));
const router = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
};

beforeEach(() => {
  mockPathname = '/login';
  mockLogin.mockReset();
  mockLogin.mockResolvedValue({ ok: true });
});

describe('登录曲面页面', () => {
  it('中文 App 中登录仍为英文，学校邮箱标签输入后始终可见', async () => {
    function OutsideLocale(): React.ReactElement {
      return <NativeText testID="outside-locale">{useI18n().locale}</NativeText>;
    }
    const view = await renderApp(<><LoginScreen /><OutsideLocale /></>);
    expect(view.queryByRole('header')).toBeNull();
    await userEvent.setup().press(view.getByTestId('login-submit'));
    expect(view.getByText('This field is required')).toBeTruthy();
    expect(view.getByTestId('login-identifier')).toHaveProp(
      'accessibilityLabel', 'School email, Required, This field is required'
    );
    await userEvent
      .setup()
      .type(view.getByTestId('login-identifier'), 'student');
    expect(view.getByText('School email *')).toBeTruthy();
    expect(view.getByText('Password *')).toBeTruthy();
    expect(view.getByTestId('login-identifier')).toHaveProp('keyboardType', 'email-address');
    expect(view.getByTestId('outside-locale')).toHaveTextContent('zh');
  });
  it('密码显示切换保留已输入的值', async () => {
    const view = await renderApp(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(view.getByTestId('login-password'), 'sample-password');
    expect(view.getByTestId('login-password')).toHaveProp(
      'secureTextEntry',
      true
    );
    await user.press(view.getByRole('button', { name: 'Show password' }));
    expect(view.getByTestId('login-password')).toHaveProp(
      'secureTextEntry',
      false
    );
    expect(view.getByTestId('login-password')).toHaveProp(
      'value',
      'sample-password'
    );
    await user.press(view.getByRole('button', { name: 'Hide password' }));
    expect(view.getByTestId('login-password')).toHaveProp(
      'secureTextEntry',
      true
    );
    expect(view.getByTestId('login-password')).toHaveProp(
      'value',
      'sample-password'
    );
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
    mockLogin.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = await renderApp(<LoginScreen />);
    const user = userEvent.setup();
    await user.type(view.getByTestId('login-identifier'), 'student@xmu.edu.my');
    await user.type(view.getByTestId('login-password'), 'sample-password');
    await user.press(view.getByTestId('login-submit'));
    await user.press(view.getByTestId('login-submit'));
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('login-submit')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true })
    );
    await act(async () => finish({ ok: true }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('常规屏保留草图留白，矮屏缩短留白并保留可滚动表单', async () => {
    const view = await renderApp(<LoginScreen />);
    const layout = (width: number, height: number) => ({
      nativeEvent: { layout: { x: 0, y: 0, width, height } },
    });
    await fireEvent(
      view.getByTestId('login-form-content'),
      'layout',
      layout(390, 500)
    );
    await fireEvent(
      view.getByTestId('login-viewport'),
      'layout',
      layout(390, 800)
    );
    const normalBlank = StyleSheet.flatten(
      view.getByTestId('login-logo-space').props.style
    ).height;
    // 草图上方约三分之一：800 高的画布保留 256，不能被 500 高的表单挤掉。
    expect(normalBlank).toBe(256);
    const statusBar = jest.requireMock('expo-status-bar').StatusBar as jest.Mock;
    // 夜间插画顶部也是深底，不能再沿用旧浅色插画的黑色状态栏图标。
    expect(statusBar.mock.lastCall?.[0].style).toBe('light');
    expect(
      view.getByTestId('login-background-layer', {
        includeHiddenElements: true,
      })
    ).toHaveProp('pointerEvents', 'none');
    expect(
      view.getByTestId('login-brand-art', { includeHiddenElements: true })
    ).toHaveProp('accessible', false);
    await fireEvent(
      view.getByTestId('login-viewport'),
      'layout',
      layout(390, 360)
    );
    expect(view.getByTestId('login-logo-space')).toHaveStyle({ height: 0 });
    expect(view.getByTestId('login-scroll')).toHaveProp(
      'keyboardShouldPersistTaps',
      'handled'
    );
    expect(
      view.queryByTestId('login-brand-art', { includeHiddenElements: true })
    ).toBeNull();
    expect(statusBar.mock.lastCall?.[0].style).toBe('light');
    // 压栈后登录页可能仍挂载，但不应继续覆盖前台页面的状态栏。
    mockPathname = '/register';
    statusBar.mockClear();
    await fireEvent(view.getByTestId('login-viewport'), 'layout', layout(390, 800));
    expect(statusBar).not.toHaveBeenCalled();
    mockPathname = '/login';
    await fireEvent(view.getByTestId('login-viewport'), 'layout', layout(390, 800));
    expect(statusBar.mock.lastCall?.[0].style).toBe('light');
  });

  it('浅色英文界面保留全部登录操作', async () => {
    const view = await renderApp(<LoginScreen />, {
      scheme: 'light',
      locale: 'en',
    });
    expect(view.getByTestId('login-identifier')).toHaveProp(
      'accessibilityLabel',
      'School email, Required'
    );
    expect(view.getByRole('button', { name: 'Show password' })).toBeTruthy();
    expect(view.getByTestId('login-terms')).toBeTruthy();
    expect(view.getByTestId('login-privacy')).toBeTruthy();
    const statusBar = jest.requireMock('expo-status-bar').StatusBar as jest.Mock;
    expect(statusBar.mock.lastCall?.[0].style).toBe('dark');
  });
});
