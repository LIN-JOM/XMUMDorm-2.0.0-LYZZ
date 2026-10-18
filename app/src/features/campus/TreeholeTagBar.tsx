/**
 * TreeholeTagBar —— 树洞标签筛选条（**筛选 Chips，不是导航 Tab**，宪法 4.8.1-R4）
 *
 * - 「全部」固定为第 0 项：没有它就只能靠一个独立的"清除"按钮回到全部（旧实现的坑之一）；
 * - 单选语义（后端只接受一个 tagId）：选中即收窄，再点同一项回到「全部」；
 * - 用 `K20 FilterChips` 而不是自拼：角色 `button` + `selected`，⛔ 不是 `tab`、无指示器。
 */

import * as React from 'react';
import { useI18n } from '@/i18n';
import { FilterChips } from '@/components/ui/FilterChips';

/** 只要求标签的最小展示字段（服务端 `tags` 行已够用，不强制 slug） */
export type TreeholeTagOption = {
  id: number;
  nameZh?: string | null;
  nameEn?: string | null;
};

export const TREEHOLE_TAG_ALL = 'all';

export type TreeholeTagBarProps = {
  tags: readonly TreeholeTagOption[];
  selectedTagId: number | null;
  onSelect: (tagId: number | null) => void;
  testID?: string;
};

export function TreeholeTagBar({
  tags,
  selectedTagId,
  onSelect,
  testID = 'campus-tag-filters',
}: TreeholeTagBarProps): React.ReactElement | null {
  const { t, locale } = useI18n();
  const options = React.useMemo(
    () => [
      { key: TREEHOLE_TAG_ALL, label: t('action.all') },
      ...tags.map((tag) => ({
        key: String(tag.id),
        label: (locale === 'en' ? tag.nameEn || tag.nameZh : tag.nameZh || tag.nameEn) ?? '',
      })),
    ],
    [locale, t, tags]
  );
  if (tags.length === 0) return null;

  return (
    <FilterChips
      testID={testID}
      itemTestIDPrefix="filter-chip"
      options={options}
      selected={[selectedTagId === null ? TREEHOLE_TAG_ALL : String(selectedTagId)]}
      onToggle={(key) => {
        if (key === TREEHOLE_TAG_ALL) {
          onSelect(null);
          return;
        }
        const id = Number(key);
        onSelect(Number.isSafeInteger(id) && id > 0 ? (id === selectedTagId ? null : id) : null);
      }}
    />
  );
}
