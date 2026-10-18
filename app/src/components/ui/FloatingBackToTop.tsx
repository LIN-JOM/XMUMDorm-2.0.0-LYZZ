/**
 * FloatingBackToTop —— 列表右下角的「回到顶部」悬浮按钮
 *
 * 为什么抽成组件：二手 / 跑腿的搜索与筛选行改成**随内容滚走**之后，
 * 用户滑到深处需要一个一键回顶的入口（所有者 2026-10-18 裁决）。
 *
 * 纪律：
 * - ⛔ 不用 FAB 做「发布」等主行动（发布唯一入口是底栏第 5 格，宪法 4.1）；
 * - 只在列表真正滚过一屏时出现，由调用方按 `onScrollOffset` 决定 `visible`；
 * - 滚动本身由 `ListScreen` 的 `scrollToTopSignal` 承担，本组件只负责「看得见、点得到」。
 */

import * as React from 'react';
import { View } from 'react-native';
import ArrowUp from 'lucide-react-native/icons/arrow-up';

import { useTheme } from '@/design-system/theme';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Surface } from './Surface';

export type FloatingBackToTopProps = {
  visible: boolean;
  onPress: () => void;
  /** 读屏文案（调用方注入 i18n） */
  label: string;
  testID?: string;
};

export function FloatingBackToTop({
  visible,
  onPress,
  label,
  testID,
}: FloatingBackToTopProps): React.ReactElement | null {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: theme.space('space_4'),
        bottom: theme.space('space_6'),
      }}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ borderRadius: theme.radius('radius_full') }}
      >
        <Surface variant="surface" rounded="radius_full" bordered="strong" padding="space_2">
          <Icon source={ArrowUp} size="body" tint="primary" />
        </Surface>
      </Pressable>
    </View>
  );
}
