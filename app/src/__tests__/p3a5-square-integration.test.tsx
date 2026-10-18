import * as React from 'react';
import { Button, ScrollView } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { SquareHome } from '@/features/square/SquareHome';

function mockModule(name: string) {
  const React = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  const { FeatureScreen } = jest.requireActual<typeof import('@/components/ui/FeatureScreen')>('@/components/ui/FeatureScreen');
  return function Module({ embedded = false }: { embedded?: boolean }) {
    const [value, setValue] = React.useState('');
    return <FeatureScreen embedded={embedded} titleKey="screen.square" testID={`module-${name}`}>
      <TextInput testID={`input-${name}`} value={value} onChangeText={setValue} />
    </FeatureScreen>;
  };
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/features/square/CanteenHome', () => ({ CanteenHome: mockModule('canteen') }));
jest.mock('@/features/marketplace/MarketScreens', () => ({ MarketListScreen: mockModule('market') }));
jest.mock('@/features/errand/ErrandScreens', () => ({ ErrandListScreen: mockModule('errand') }));
jest.mock('@/features/guides/GuidesScreens', () => ({ GuidesListScreen: mockModule('guides') }));
jest.mock('@/features/clubs/ClubScreens', () => ({ ClubDiscoveryScreen: mockModule('clubs') }));
jest.mock('@/features/campus/CampusScreens', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { CampusFeed: ({ kind }: { kind: string }) => <View testID={`feed-${kind}`} /> };
});

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { tab?: string } = {};

beforeEach(() => { mockParams = {}; });
const hidden = { includeHiddenElements: true };
const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 600, x: 0, y: 0 } } });
const scroll = (x: number) => ({ nativeEvent: { contentOffset: { x, y: 0 } } });

describe('首页同页模块 Tab', () => {
  it.each(['canteen', 'market', 'errand', 'guides', 'clubs'])('点击 %s 显示模块，不新增路由或顶栏', async key => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent.press(view.getByTestId(`top-tab-${key}`));
    expect(view.getByTestId(`module-${key}`)).toBeTruthy();
    expect(view.getByTestId(`top-tab-${key}`).props.accessibilityState.selected).toBe(true);
    expect(view.getAllByTestId('screen-content')).toHaveLength(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSetParams).toHaveBeenLastCalledWith({ tab: key });
    for (const other of ['canteen', 'market', 'errand', 'guides', 'clubs'].filter(item => item !== key)) {
      expect(view.queryByTestId(`module-${other}`, hidden)).toBeNull();
    }
  });

  it('保留树洞、万能墙和树洞搜索入口', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(view.getByTestId('feed-confession')).toBeTruthy();
    await fireEvent.press(view.getByTestId('square-campus-search'));
    expect(mockPush).toHaveBeenCalledWith('/campus/search');
    await fireEvent.press(view.getByTestId('top-tab-wall'));
    expect(view.getByTestId('feed-wall')).toBeTruthy();
    expect(view.queryByTestId('square-campus-search')).toBeNull();
  });

  it('切换后保留输入，隐藏模块不进入读屏或可见元素树', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent.press(view.getByTestId('top-tab-market'));
    await fireEvent.changeText(view.getByTestId('input-market'), '保留这个筛选');
    await fireEvent.press(view.getByTestId('top-tab-guides'));
    expect(view.queryByTestId('input-market')).toBeNull();
    expect(view.getByTestId('square-pane-market', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
    await fireEvent.press(view.getByTestId('top-tab-market'));
    expect(view.getByTestId('input-market').props.value).toBe('保留这个筛选');
  });

  it('从食堂左滑到集市、右滑回食堂，选中态和内容一起更新', async () => {
    mockParams = { tab: 'canteen' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(800));
    await fireEvent.scroll(view.getByTestId('square-module-pager'), scroll(1000));
    expect(view.getByTestId('module-market', hidden)).toBeTruthy();
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(1200));
    expect(view.getByTestId('module-market')).toBeTruthy();
    expect(view.getByTestId('top-tab-market').props.accessibilityState.selected).toBe(true);
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(1200));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(800));
    expect(view.getByTestId('module-canteen')).toBeTruthy();
    expect(mockSetParams.mock.calls).toEqual([[{ tab: 'market' }], [{ tab: 'canteen' }]]);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('宽度变化后按新宽度分页，边界回弹不会越界', async () => {
    mockParams = { tab: 'canteen' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(300));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(600));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(900));
    expect(view.getByTestId('module-market')).toBeTruthy();
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(900));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(-50));
    expect(view.getByTestId('feed-confession')).toBeTruthy();
  });

  it('点击后的迟到滚动回调不会覆盖刚选中的模块', async () => {
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(0));
    await fireEvent.press(view.getByTestId('top-tab-clubs'));
    await fireEvent(view.getByTestId('square-module-pager'), 'momentumScrollEnd', scroll(400));
    expect(view.getByTestId('module-clubs')).toBeTruthy();
    expect(view.getByTestId('top-tab-clubs').props.accessibilityState.selected).toBe(true);
  });

  it('缓慢拖动松手且没有惯性回调时仍切换到相邻模块', async () => {
    mockParams = { tab: 'canteen' };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('square-module-viewport'), 'layout', layout(400));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollBeginDrag', scroll(800));
    await fireEvent(view.getByTestId('square-module-pager'), 'scrollEndDrag', {
      nativeEvent: { contentOffset: { x: 1150, y: 0 }, velocity: { x: 0, y: 0 } },
    });
    expect(view.getByTestId('module-market')).toBeTruthy();
    expect(view.getByTestId('top-tab-market').props.accessibilityState.selected).toBe(true);
  });

  it('初始深链接到社团时，测量完成后让选中的 Tab 滚入可见区域', async () => {
    mockParams = { tab: 'clubs' };
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    await fireEvent(view.getByTestId('top-tab-clubs'), 'layout', {
      nativeEvent: { layout: { x: 620, y: 0, width: 100, height: 48 } },
    });
    expect(scrollTo).toHaveBeenCalledWith({ x: expect.any(Number), animated: false });
    const offset = scrollTo.mock.calls.at(-1)?.[0];
    expect(typeof offset === 'object' && offset?.x).toBeGreaterThan(0);
    expect(typeof offset === 'object' && offset?.x).toBeLessThan(620);
  });

  it.each(['wall', 'guides'])('支持首页 tab=%s 深链接', async tab => {
    mockParams = { tab };
    const view = await renderApp(<SquareHome tabBarHeight={60} />);
    expect(view.getByTestId(`top-tab-${tab}`).props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId(tab === 'wall' ? 'feed-wall' : 'module-guides')).toBeTruthy();
  });

  it('外部参数变化切换模块，未知参数回到树洞', async () => {
    function RouteDriver() {
      const [, refresh] = React.useReducer((value: number) => value + 1, 0);
      return <>
        <Button testID="open-clubs" title="open clubs" onPress={() => { mockParams = { tab: 'clubs' }; refresh(); }} />
        <Button testID="open-unknown" title="unknown link" onPress={() => { mockParams = { tab: 'unknown' }; refresh(); }} />
        <SquareHome tabBarHeight={60} />
      </>;
    }
    const view = await renderApp(<RouteDriver />);
    await fireEvent.press(view.getByTestId('open-clubs'));
    expect(view.getByTestId('module-clubs')).toBeTruthy();
    await fireEvent.press(view.getByTestId('open-unknown'));
    expect(view.getByTestId('feed-confession')).toBeTruthy();
  });
});
