/**
 * P3A6 · 广场品牌头与 4 个模块入口
 *
 * 依据：`docs/app/task/广场今日页/T2-品牌头与模块入口.md`
 *   · 品牌头 = 校徽（左）+ `XMUM Dorm`（紧挨其右），不再有 `广场` 面包屑；
 *   · `Screen.header` 仍由 Screen 施加顶部 inset（S1/S2）；
 *   · 4 个入口点击直达对应页面，不切 Tab、不新增路由。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SquareBrandHeader } from '@/features/square/SquareBrandHeader';
import { SquareModuleEntries } from '@/features/square/SquareModuleEntries';
import { SQUARE_MODULES } from '@/features/square/squareModules';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPush = jest.fn();

describe('P3A6 广场品牌头与模块入口', () => {
  it('品牌头：校徽 + XMUM Dorm，同行靠左', async () => {
    const view = await renderApp(<SquareBrandHeader />);
    expect(view.getByTestId('square-brand-emblem')).toBeTruthy();
    expect(view.getByText('XMUM Dorm')).toBeTruthy();
  });

  it('Screen.header：渲染自定义头、不再渲染广场面包屑，内容区仍在', async () => {
    const view = await renderApp(
      <Screen testID="screen-square" header={<SquareBrandHeader />} bottomMode="own">
        <Text testID="pane">内容</Text>
      </Screen>
    );
    expect(view.getByTestId('screen-header')).toBeTruthy();
    expect(view.getByText('XMUM Dorm')).toBeTruthy();
    expect(view.queryByText('广场')).toBeNull();
    expect(view.getByTestId('pane')).toBeTruthy();
  });

  it('Screen.header：顶部偏移仍等于真实 inset（测试机型 24）', async () => {
    const view = await renderApp(
      <Screen header={<SquareBrandHeader />} bottomMode="own">
        <Text>内容</Text>
      </Screen>
    );
    expect(view.getByTestId('screen-header')).toHaveStyle({ paddingTop: 24 });
  });

  it('4 个模块入口都在，且标签来自词条', async () => {
    const view = await renderApp(<SquareModuleEntries />);
    expect(SQUARE_MODULES.map((entry) => entry.key)).toEqual(['schedule', 'guides', 'market', 'clubs']);
    expect(view.getByText('课表')).toBeTruthy();
    expect(view.getByText('校园攻略')).toBeTruthy();
    expect(view.getByText('二手')).toBeTruthy();
    expect(view.getByText('社团')).toBeTruthy();
  });

  it.each([
    ['schedule', '/tools/timetable'],
    ['guides', '/guides'],
    ['market', '/market'],
    ['clubs', '/clubs'],
  ])('点 %s 直达 %s', async (key, route) => {
    const view = await renderApp(<SquareModuleEntries />);
    await fireEvent.press(view.getByTestId(`square-module-${key}`));
    expect(mockPush).toHaveBeenCalledWith(route);
  });
});
