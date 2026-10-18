import * as React from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import { SQUARE_TABS } from '@/features/navigation/secondaryTabs';
import { CampusFeed } from '@/features/campus/CampusScreens';
import { MarketListScreen } from '@/features/marketplace/MarketScreens';
import { ErrandListScreen } from '@/features/errand/ErrandScreens';
import { GuidesListScreen } from '@/features/guides/GuidesScreens';
import { ClubDiscoveryScreen } from '@/features/clubs/ClubScreens';
import { CanteenHome } from './CanteenHome';

/**
 * ⚠️ 集合来自 `secondaryTabs.ts` 的**唯一真源**（`SQUARE_TABS`），⛔ 不在这里再写一份。
 * 旧实现把 7 个模块硬编码在本文件里，与注册表的 2 项形成"两份定义"（P0-1）。
 */
const TABS = SQUARE_TABS;
type HomeTab = (typeof SQUARE_TABS)[number]['key'];

function readTab(value: unknown): HomeTab {
  return TABS.find(tab => tab.key === value)?.key ?? 'confession';
}

/** 所有者 2026-10-12 指定：首页模块同页切换，并允许内容横滑。 */
export function SquareHome({ tabBarHeight }: { tabBarHeight: number }): React.ReactElement {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const initialTab = readTab(tab);
  const [routeTab, setRouteTab] = React.useState(initialTab);
  const [selected, setSelected] = React.useState<HomeTab>(initialTab);
  const [visited, setVisited] = React.useState<ReadonlySet<HomeTab>>(() => new Set([initialTab]));
  const [width, setWidth] = React.useState(0);
  const pager = React.useRef<ScrollView>(null);
  const dragging = React.useRef(false);
  const selectedIndex = TABS.findIndex(item => item.key === selected);

  const remember = React.useCallback((keys: readonly HomeTab[]) => {
    setVisited(current => keys.every(key => current.has(key)) ? current : new Set([...current, ...keys]));
  }, []);

  // 外部深链接改变时同步选中项，在渲染子模块前完成，避免显示上一模块一帧。
  if (routeTab !== initialTab) {
    setRouteTab(initialTab);
    remember([initialTab]);
    setSelected(initialTab);
  }
  React.useEffect(() => { dragging.current = false; }, [initialTab]);

  const alignPage = React.useCallback(() => {
    if (width > 0 && !dragging.current) {
      // 点击直接切换，避免跨多个模块的整页动画；原生分页处理用户横滑。
      pager.current?.scrollTo({ x: selectedIndex * width, animated: false });
    }
  }, [selectedIndex, width]);
  React.useEffect(alignPage, [alignPage]);

  const select = (key: HomeTab) => {
    remember([key]);
    setSelected(key);
    if (key !== selected) router.setParams({ tab: key });
  };
  const finishSwipe = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragging.current || width <= 0) return;
    dragging.current = false;
    const index = Math.max(0, Math.min(TABS.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
    select(TABS[index].key);
    pager.current?.scrollTo({ x: index * width, animated: false });
  };

  return (
    <Screen testID="screen-square" titleKey="screen.square" bottomMode="tabbar" tabBarHeight={tabBarHeight}>
      <TopTabStrip testID="square-module-tabs" tabs={TABS} selectedKey={selected} onSelect={key => {
        dragging.current = false;
        select(readTab(key));
      }} />
      <View testID="square-module-viewport" style={{ flex: 1, minHeight: 0 }} onLayout={event => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0) {
          dragging.current = false;
          setWidth(nextWidth);
        }
      }}>
        <ScrollView
          ref={pager}
          testID="square-module-pager"
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={width > 0}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'stretch' }}
          onContentSizeChange={alignPage}
          onScrollBeginDrag={() => { dragging.current = true; }}
          onScroll={event => {
            if (!dragging.current || width <= 0) return;
            const position = event.nativeEvent.contentOffset.x / width;
            const keys = [Math.floor(position), Math.ceil(position)]
              .filter(index => index >= 0 && index < TABS.length)
              .map(index => TABS[index].key);
            // 手指拖到邻页时加载它，避免松手后才出现内容；其余模块仍按需加载。
            remember(keys);
          }}
          scrollEventThrottle={16}
          onScrollEndDrag={event => {
            if (event.nativeEvent.velocity?.x === 0) finishSwipe(event);
          }}
          onMomentumScrollEnd={finishSwipe}
        >
          {TABS.map(item => (
            <View
              key={item.key}
              testID={`square-pane-${item.key}`}
              style={{ width, flexShrink: 0, minHeight: 0 }}
              accessibilityElementsHidden={item.key !== selected}
              importantForAccessibility={item.key === selected ? 'auto' : 'no-hide-descendants'}
            >
              {visited.has(item.key) ? <ModuleContent tab={item.key} /> : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

function ModuleContent({ tab }: { tab: HomeTab }): React.ReactElement {
  switch (tab) {
    case 'canteen': return <CanteenHome embedded />;
    case 'market': return <MarketListScreen embedded />;
    case 'errand': return <ErrandListScreen embedded />;
    case 'guides': return <GuidesListScreen embedded />;
    case 'clubs': return <ClubDiscoveryScreen embedded />;
    // 树洞 / 万能墙：模块入口统一由 `CampusFeed` 决定（⛔ 不再有第二个搜索入口/发布入口）
    default: return <CampusFeed kind={tab} />;
  }
}
