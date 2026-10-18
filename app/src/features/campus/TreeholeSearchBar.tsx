/**
 * TreeholeSearchBar —— 树洞搜索的**就地展开**（负责人 2026-10-18 裁决）
 *
 * 形态：
 * - 收起态 = 一个 48dp 的"搜索框外观"（图标 + 占位文案），点它**在本页展开**；
 * - 展开态 = 真输入框（`C06 SearchField`）+ 取消；空查询时列出最近搜索；
 * - ⛔ 不再跳独立搜索页（旧实现是整行全宽文字按钮 + 另一个页面，违反所有者 A3）。
 *
 * ⛔ 组件不写死文案：全部由页面传词条。
 */

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Search from 'lucide-react-native/icons/search';

import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';

export type TreeholeSearchBarProps = {
  value: string;
  onChangeText: (next: string) => void;
  expanded: boolean;
  onExpand: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  placeholder: string;
  cancelLabel: string;
  clearLabel: string;
  historyLabel: string;
  clearHistoryLabel: string;
  history: readonly string[];
  onPickHistory: (value: string) => void;
  onClearHistory: () => void;
  testID?: string;
};

export function TreeholeSearchBar({
  value,
  onChangeText,
  expanded,
  onExpand,
  onCancel,
  onSubmit,
  placeholder,
  cancelLabel,
  clearLabel,
  historyLabel,
  clearHistoryLabel,
  history,
  onPickHistory,
  onClearHistory,
  testID,
}: TreeholeSearchBarProps): React.ReactElement {
  const theme = useTheme();

  if (!expanded) {
    return (
      <View style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_2') }}>
        <Pressable
          testID={testID ? `${testID}-toggle` : undefined}
          onPress={onExpand}
          accessibilityRole="search"
          accessibilityLabel={placeholder}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space('space_2'),
            paddingHorizontal: theme.space('space_3'),
            minHeight: theme.touchTarget,
            backgroundColor: theme.color['bg-sunken'].value,
            borderRadius: theme.radius('radius_full'),
          }}
        >
          <Icon source={Search} size="body" tint="secondary" />
          <Text role="body" colorToken="text-muted" numberOfLines={1}>
            {placeholder}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={{ paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_2'), gap: theme.space('space_2') }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        <View style={{ flex: 1 }}>
          <SearchField
            testID={testID ? `${testID}-field` : undefined}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            autoFocus
            onSubmit={onSubmit}
            clearLabel={clearLabel}
            appearance="full"
          />
        </View>
        <Pressable
          testID={testID ? `${testID}-cancel` : undefined}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
          style={{
            minHeight: theme.touchTarget,
            justifyContent: 'center',
            paddingHorizontal: theme.space('space_1'),
          }}
        >
          <Text role="label" colorToken="text-brand">
            {cancelLabel}
          </Text>
        </Pressable>
      </View>

      {value.length === 0 && history.length > 0 ? (
        <View testID={testID ? `${testID}-history` : undefined} style={{ gap: theme.space('space_1') }}>
          <Text role="caption" colorToken="text-muted">
            {historyLabel}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {history.map((item) => (
              <View key={item} style={{ marginRight: theme.space('space_2') }}>
                <Chip label={item} variant="selectable" onPress={() => onPickHistory(item)} />
              </View>
            ))}
            <Chip
              testID={testID ? `${testID}-clear-history` : undefined}
              label={clearHistoryLabel}
              variant="selectable"
              onPress={onClearHistory}
            />
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
