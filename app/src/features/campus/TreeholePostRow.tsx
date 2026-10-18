/**
 * TreeholePostRow —— 树洞信息流的一行（feed 变体）
 *
 * 2026-10-18 版式（所有者裁决）：
 *   身份行（头像 / 昵称 / 等级 / 时间 / **标签**） → 标题 → 媒体 → 计数。
 *
 * 两条硬规则：
 * - ⛔ 信息流**不展示正文**：标题就是这一行唯一的文字（正文只出现在详情页）。
 * - ⛔ 因此也没有"阅读全文"：截断与展开是详情页的事。
 *
 * 标题兜底：没有标题的帖子用**正文首行**当标题 —— 否则整行只剩一张图，用户读不出是什么。
 * （列表数据里确实存在只有 content、没有 title 的帖子，见 `p2x-bing-campus` 的搜索用例。）
 */

import * as React from 'react';
import { View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { TreeholeMedia } from './TreeholeMedia';
import { SearchHighlight } from './SearchHighlight';
import { TreeholeActionBar, TreeholeAuthorLine } from './TreeholePostParts';
import type { TreeholePostViewModel } from './treeholePostViewModel';

/** 行标题：有标题用标题，没有就退回正文首行（空行不渲染） */
function rowTitle(post: TreeholePostViewModel): string {
  const title = post.title.trim();
  if (title) return title;
  return post.content.split('\n')[0]?.trim() ?? '';
}

export type TreeholePostRowProps = {
  post: TreeholePostViewModel;
  timeLabel: string;
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onOpen: () => void;
  onLike: () => void;
  /** 点赞失败/登录提示（由列表行持有状态后传入，行本身不写业务） */
  likeNotice?: React.ReactNode;
  /** 搜索关键词（命中片段加粗） */
  query?: string;
};

export function TreeholePostRow({
  post,
  timeLabel,
  liked,
  likeCount,
  commentCount,
  onOpen,
  onLike,
  likeNotice,
  query,
}: TreeholePostRowProps): React.ReactElement {
  const theme = useTheme();
  const indent = theme.space('space_8') + theme.space('space_2');
  const title = rowTitle(post);
  const openLabel = title.length > 0 ? title : String(post.id);

  return (
    <View
      testID={`treehole-post-${post.id}`}
      style={{
        paddingHorizontal: theme.space('space_4'),
        // 2026-10-18 第六轮：竖向 12 → 8 —— 配合半列媒体，一屏要能**完整**看到 2 篇
        // （604dp 视口 / 每篇 ≤302dp；原 12+12 的行距会把第二篇的互动条挤出屏幕）
        paddingTop: theme.space('space_2'),
        paddingBottom: theme.space('space_2'),
        gap: theme.space('space_2'),
      }}
    >
      {/* 标签跟着身份行（日期右边），不再占正文一行 */}
      <TreeholeAuthorLine
        name={post.authorName}
        avatarUrl={post.avatarUrl}
        level={post.authorLevel}
        timeLabel={timeLabel}
        tags={post.tags}
      />

      <View style={{ paddingLeft: indent, gap: theme.space('space_1') }}>
        {/* 内容区：只有标题可点（动作区是兄弟节点，⛔ 按钮套按钮） */}
        <Pressable
          testID={`campus-row-${post.id}`}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={openLabel}
          contentAlign="stretch"
        >
          {/* 2026-10-18 第五轮（所有者：标题字体小一点）：
              标题从 headline(24sp) 降到 label(16sp) 粗体 —— X 的信息流正文就是 15–17sp；
              昵称同步降到 body(14sp) 常规体，层级仍靠**字号 + 字重 + 颜色**三层区分（16 粗主 / 14 常规次 / 12 弱）。
              ⚠️ `label` 默认带 1.5× 字号放大上限（那是给固定高度的按钮用的）；标题不是固定高度，
              所以这里显式 `maxFontSizeMultiplier={0}`（不设上限），否则 200% 系统字号下
              标题 24sp 会小于昵称 28sp，层级反过来。 */}
          {title.length === 0 ? null : query ? (
            <SearchHighlight
              value={title}
              query={query}
              role="label"
              numberOfLines={2}
              maxFontSizeMultiplier={0}
            />
          ) : (
            <Text
              role="label"
              emphasis="strong"
              colorToken="text-primary"
              numberOfLines={2}
              maxFontSizeMultiplier={0}
            >
              {title}
            </Text>
          )}
        </Pressable>

        {post.mediaUrls.length > 0 ? (
          <Pressable
            testID={`campus-row-${post.id}-media`}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={openLabel}
            contentAlign="stretch"
          >
            <TreeholeMedia postId={post.id} urls={post.mediaUrls} mode="feed" />
          </Pressable>
        ) : null}

        <TreeholeActionBar
          testIDPrefix={`campus-row-${post.id}`}
          liked={liked}
          likeCount={likeCount}
          commentCount={commentCount}
          onLike={onLike}
          onComment={onOpen}
          likeNotice={likeNotice}
        />
      </View>
    </View>
  );
}
