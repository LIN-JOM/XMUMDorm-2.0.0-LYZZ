/**
 * 广场 4 个模块入口的**注册表**（唯一真源）。
 *
 * 2026-10-18 所有者裁决：品牌头下方放「课表 / 校园攻略 / 二手 / 社团」四个入口，
 * 点击直达对应页面；因此 `校园攻略 / 二手 / 社团` 从广场 Tab 条移除（独立路由保留）。
 *
 * 三条纪律：
 *   1. 这是**页内功能入口**，不是二级导航；二级导航仍只有 `TopTabStrip`（宪法 4.8）；
 *   2. 图标是第 1 层 Lucide（逐图标子路径导入，宪法 16.5-1），填充色只取语义令牌；
 *   3. ⛔ 页面里不要再写第二份入口数组（`P2A-03` 的源码扫描同款纪律）。
 */

import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Compass from 'lucide-react-native/icons/compass';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Users from 'lucide-react-native/icons/users';

import type { IconComponent, IconTint } from '@/components/ui/Icon';
import type { DarkColorTokenName } from '@/design-system/tokens';
import type { MessageKey } from '@/i18n';

export type SquareModuleRoute = '/tools/timetable' | '/guides' | '/market' | '/clubs';

export type SquareModuleEntry = {
  key: 'schedule' | 'guides' | 'market' | 'clubs';
  labelKey: MessageKey;
  /** 直达路由（⛔ 不新增中间页，也不切成 Tab） */
  route: SquareModuleRoute;
  icon: IconComponent;
  /** 填充块底色令牌（厦大蓝 / 美团黄交替） */
  fill: Extract<DarkColorTokenName, 'action-primary' | 'action-accent'>;
  /** 图标色：蓝底白字、黄底深字（白字在黄底不达标，见 Icon 的 onAccent 注释） */
  iconTint: Extract<IconTint, 'onFill' | 'onAccent'>;
};

export const SQUARE_MODULES: readonly SquareModuleEntry[] = [
  {
    key: 'schedule',
    labelKey: 'square.module.schedule',
    route: '/tools/timetable',
    icon: CalendarDays,
    fill: 'action-primary',
    iconTint: 'onFill',
  },
  {
    key: 'guides',
    labelKey: 'square.module.guides',
    route: '/guides',
    icon: Compass,
    fill: 'action-accent',
    iconTint: 'onAccent',
  },
  {
    key: 'market',
    labelKey: 'square.module.market',
    route: '/market',
    icon: ShoppingBag,
    fill: 'action-primary',
    iconTint: 'onFill',
  },
  {
    key: 'clubs',
    labelKey: 'square.module.clubs',
    route: '/clubs',
    icon: Users,
    fill: 'action-accent',
    iconTint: 'onAccent',
  },
];
