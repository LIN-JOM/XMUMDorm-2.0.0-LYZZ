/**
 * TreeholeTagFilter —— 树洞标签筛选（**下拉列表**，不是一排圆角 Tab）
 *
 * 所有者 2026-10-18 裁决：信息流上方那一行标签 chip 不再展示，改成**下拉列表**自由挑选与筛选。
 * 用 `Select`（C07）：>7 项时就地展开 + 带搜索，折叠态只有一行「标签筛选：全部 ▾」。
 *
 * ⛔ 不再用 `FilterChips` 顶在列表上方：它把 35 个标签摊成一排、把正文挤下去，
 *    而且"圆角按钮"看起来像导航 Tab（宪法 4.8.1-R4：筛选 Chips ≠ 导航 Tab，但视觉上要区分）。
 */

import * as React from 'react';

import { Select } from '@/components/ui/Select';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

/** 只要求服务端标签行的最小展示字段（snake_case，与 `tags` 接口同形） */
export type TreeholeTagOption = {
  id: number;
  name_zh?: string | null;
  name_en?: string | null;
};

/** 标签展示名：当前语言优先，缺一种回退另一种；两者都空返回空串（调用方据此隐藏） */
export function treeholeTagLabel(tag: TreeholeTagOption, locale: 'zh' | 'en'): string {
  const primary = locale === 'en' ? tag.name_en : tag.name_zh;
  const fallback = locale === 'en' ? tag.name_zh : tag.name_en;
  return (primary || fallback)?.trim() ?? '';
}

export const TREEHOLE_TAG_ALL = 'all';

export type TreeholeTagFilterProps = {
  tags: readonly TreeholeTagOption[];
  selectedTagId: number | null;
  onSelect: (tagId: number | null) => void;
  testID?: string;
};

export function TreeholeTagFilter({
  tags,
  selectedTagId,
  onSelect,
  testID = 'campus-tag-filter',
}: TreeholeTagFilterProps): React.ReactElement | null {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const options = React.useMemo(
    () => [
      { value: TREEHOLE_TAG_ALL, label: t('action.all') },
      // 空标签（两种语言都缺）不进入下拉：宁可少一项，也不给一行看不见的选项
      ...tags.flatMap((tag) => {
        const label = treeholeTagLabel(tag, locale);
        return label ? [{ value: String(tag.id), label }] : [];
      }),
    ],
    [locale, t, tags]
  );
  // 标签目录为空（接口失败/未加载）时整条隐藏：⛔ 不阻断阅读
  if (tags.length === 0) return null;
  return (
    <Select
      testID={testID}
      label={t('screen.campus.filter.tags')}
      options={options}
      value={selectedTagId === null ? TREEHOLE_TAG_ALL : String(selectedTagId)}
      withSearch
      placeholder={t('action.all')}
      onChange={(next) => {
        if (next === TREEHOLE_TAG_ALL) {
          onSelect(null);
          return;
        }
        const id = Number(next);
        onSelect(Number.isSafeInteger(id) && id > 0 ? (id === selectedTagId ? null : id) : null);
      }}
      style={{ paddingHorizontal: theme.space('space_4') }}
    />
  );
}
