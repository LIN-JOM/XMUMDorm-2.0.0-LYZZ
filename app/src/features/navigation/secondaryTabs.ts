/**
 * 二级导航（顶部 Tab 条）的**状态与集合声明** —— 纯逻辑，可单测。
 *
 * 宪法 4.8.1 六条硬规则的落地位置：
 *   R2 每个二级 Tab **独立维护**滚动位置 / 分页游标 / 筛选条件 → 本文件的 store
 *   R3 一级 Tab 切换**保留**各自的二级选中项 → 键是 `(一级格, 二级格)`
 *   R4 导航 Tab ≠ 筛选 Chips → 本文件只管"导航也选中的那个"，筛选状态是**另一条维度**（filters）
 *   R5 溢出横向滚动（不在这里，在组件层）；⛔ 不提供把子栏目藏起来的下拉入口
 *
 * ⚠️ 二级 Tab 的**具体集合**逐格拍板：
 *   - 「广场」**已定**（所有者 2026-10-12 裁决，7 个同页模块）
 *   - 「我的」**已定**（所有者 2026-10-18 裁决，4 个内容模块同页横滑 —— C-05 关闭）
 *   - 工具 = TO-CONFIRM **C-04** → 集合留空，⛔ 不预占所有者的决定
 */

import type { MessageKey } from '@/i18n';
import { getTabDefinition, type TabKey } from './tabConfig';

export type SecondaryTabKey = string;

export type SecondaryTabDefinition = {
  key: SecondaryTabKey;
} & ({ labelKey: MessageKey; label?: never } | { label: string; labelKey?: never });

/** 一级格 → 该格的二级 Tab 集合（空数组 = 该格没有二级 Tab，不显示 Tab 条） */
export type SecondaryTabRegistry = Record<string, readonly SecondaryTabDefinition[]>;

/**
 * 「广场」的模块集合 —— **唯一真源**（2026-10-18 收敛）。
 *
 * 所有者 2026-10-12 裁决（骨架规范 §1 顶部横幅 / D-1）：广场首页把
 * 树洞 / 万能墙 / 食堂 / 集市 / 跑腿 / 攻略 / 社团 做成**顶部可横滑的同页模块**。
 * 旧实现把这份集合**又硬编码在 `SquareHome.tsx` 里一份**（7 项 vs 2 项两份定义），
 * 现在只保留这里一份 —— 页面通过 `getSecondaryTabs('square')` / `SQUARE_TABS` 消费。
 *
 * ⛔ 不要把模块集合再写回页面：P2A-03 的源码扫描会让它显式失败。
 */
export const SQUARE_TABS = [
  // 宪法 4.1.1：树洞与万能墙互斥，各自保留分页/排序，只允许导航层合并
  { key: 'confession', labelKey: 'secondary.confession' },
  { key: 'wall', labelKey: 'secondary.wall' },
  { key: 'canteen', labelKey: 'canteen.title' },
  { key: 'market', labelKey: 'screen.market.title' },
  { key: 'errand', labelKey: 'screen.errand.title' },
  { key: 'guides', labelKey: 'square.guides.title' },
  { key: 'clubs', labelKey: 'clubs.title' },
] as const satisfies readonly SecondaryTabDefinition[];

/**
 * 「我的」的四个内容模块 —— **唯一真源**（2026-10-18 拍板，C-05 关闭）。
 *
 * 所有者 2026-10-18 裁决：「我的」一级页把**原本在 `/me/posts` 子页面里**的
 * 树洞 / 二手 / 跑腿 / 点评 做成**顶部可横滑的同页模块**；主页不再有通往子页面
 * 的入口列表。旧实现把这份集合**硬编码在 `PostsScreen.tsx` 的 `CONTENT_TABS`**，
 * 字段级重复 —— 现在只保留这里一份，页面通过 `getSecondaryTabs('me')` 消费。
 *
 * key 与内容域既有键一致（`posts` / `marketplace` / `errands` / `reviews`）：
 * 分页与滚动位置按 `(me, <key>)` 存在 `secondaryTabStore`（R2），换名等于丢状态。
 *
 * ⛔ 不要把模块集合再写回页面：P2A-03 的源码扫描会让它显式失败。
 */
export const ME_CONTENT_TABS = [
  { key: 'posts', labelKey: 'me.content.posts' },
  { key: 'marketplace', labelKey: 'me.content.marketplace' },
  { key: 'errands', labelKey: 'me.content.errands' },
  { key: 'reviews', labelKey: 'me.content.reviews' },
] as const satisfies readonly SecondaryTabDefinition[];

export const SECONDARY_TABS: SecondaryTabRegistry = {
  square: SQUARE_TABS,
  // ⏳ 待确认 C-04：工具的二级集合
  tools: [],
  // ✅ C-05 已拍板（2026-10-18）：「我的」用二级 Tab，四个内容模块同页横滑
  me: ME_CONTENT_TABS,
};

export function getSecondaryTabs(primaryTab: string): readonly SecondaryTabDefinition[] {
  return SECONDARY_TABS[primaryTab] ?? [];
}

/**
 * 这个一级格有没有二级 Tab（P2A-03）。
 * 空集合 ⇒ **不显示 Tab 条**（骨架规范 §2.1：「有子栏目才有它，没有就不占位」）。
 * `TopTabStrip` 自己已经 `return null`，这个纯函数是给**页面**判断用的
 * （页面据此决定要不要占顶部空间），⛔ 两处判断必须同源。
 */
export function hasSecondaryTabs(primaryTab: string): boolean {
  return getSecondaryTabs(primaryTab).length > 0;
}

/**
 * 二级 Tab 集合的不变量（P2A-03）——**"改集合不用动页面"的机器判据**。
 *
 * 四条：
 *   1. 同一一级格下 key 唯一（重复会让"选中哪个"歧义）；
 *   2. `labelKey` 必须在词条表里（否则界面上出现 key 本身）；
 *   3. 集合只能挂**存在的一级格**上（防拼错格名后静默变成"没有二级 Tab"）；
 *   4. ⛔ **动作型格位（中央"发布"）不得有二级 Tab** —— 它没有内容区（宪法 4.9.1）。
 *
 * `registry` 可注入，只为让用例能验证"坏集合会抛"（⛔ 生产调用不传第二个参数）。
 */
export function assertSecondaryTabInvariants(
  dictionaryKeys: readonly string[],
  registry: SecondaryTabRegistry = SECONDARY_TABS
): void {
  for (const [primaryTab, tabs] of Object.entries(registry)) {
    const def = getTabDefinition(primaryTab as TabKey);
    if (!def) {
      throw new Error(`二级 Tab 挂在不存在的格上：${primaryTab}`);
    }
    if (def.isAction) {
      throw new Error(`⛔ 动作型格位不得有二级 Tab（宪法 4.9.1）：${primaryTab}`);
    }

    const keys = tabs.map((tab) => tab.key);
    if (new Set(keys).size !== keys.length) {
      throw new Error(`二级 Tab 的 key 重复：${primaryTab}`);
    }

    for (const tab of tabs) {
      if (typeof tab.labelKey !== 'string' || !dictionaryKeys.includes(tab.labelKey)) {
        throw new Error(`二级 Tab 的 labelKey 不在词条表：${primaryTab}/${tab.key}`);
      }
    }
  }
}

/** 单个二级 Tab 的独立状态（R2） */
export type SecondaryTabState = {
  /** 滚动位置（像素） */
  scrollOffset: number;
  /** 分页游标（由数据层解释，这里只存） */
  cursor: string | null;
  /** 筛选条件（R4：与"选中哪个 Tab"是**两条不同维度**） */
  filters: Readonly<Record<string, string | readonly string[]>>;
};

export const EMPTY_SECONDARY_STATE: SecondaryTabState = {
  scrollOffset: 0,
  cursor: null,
  filters: {},
};

/**
 * 二级 Tab 状态仓库。
 * ⛔ 刻意做成**显式对象**而不是"页面里各写一个 useState"：
 *    否则"切走再切回位置还在"这条（R2）无法被证明，只能靠肉眼。
 */
export class SecondaryTabStore {
  private readonly states = new Map<string, SecondaryTabState>();

  private static key(primaryTab: string, secondaryTab: SecondaryTabKey): string {
    return `${primaryTab}::${secondaryTab}`;
  }

  get(primaryTab: string, secondaryTab: SecondaryTabKey): SecondaryTabState {
    return this.states.get(SecondaryTabStore.key(primaryTab, secondaryTab)) ?? EMPTY_SECONDARY_STATE;
  }

  update(
    primaryTab: string,
    secondaryTab: SecondaryTabKey,
    patch: Partial<SecondaryTabState>
  ): SecondaryTabState {
    const current = this.get(primaryTab, secondaryTab);
    const next: SecondaryTabState = { ...current, ...patch };
    this.states.set(SecondaryTabStore.key(primaryTab, secondaryTab), next);
    return next;
  }

  /** 切换二级 Tab **只改选中键**，不清任何状态（R2 的核心） */
  clear(): void {
    this.states.clear();
  }

  size(): number {
    return this.states.size;
  }
}

/** 动效参数未冻结（宪法 15.4）；`reduceMotion` 为真时**一律 0**（宪法 7.3） */
export function resolveTransitionDuration(reduceMotion: boolean, baseDuration: number): number {
  return reduceMotion ? 0 : baseDuration;
}

/**
 * **应用级实例**（P1-09 补）：R2（切走再切回位置/筛选还在）只有在**所有页面共享同一个实例**时
 * 才成立。⛔ 不要在页面里 `new SecondaryTabStore()` —— 各持一份 = 位置永远丢。
 * `K05 ListScreen` 通过 `scope` 读写它，⛔ 不新建第二套状态仓库（任务包纪律 4）。
 */
export const secondaryTabStore = new SecondaryTabStore();

/**
 * ⛔ R5：溢出时**必须**横向滚动，**不得**用下拉菜单把子栏目藏起来。
 * 这个守卫让"想加下拉"这件事在代码里变成显式失败。
 */
export function assertNoOverflowMenu(hasOverflowMenu: boolean): void {
  if (hasOverflowMenu) {
    throw new Error('⛔ 宪法 4.8.1-R5：子栏目溢出必须横向滚动，不得用下拉菜单隐藏');
  }
}
