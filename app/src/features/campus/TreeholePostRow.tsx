/**
 * TreeholePostRow —— 树洞信息流的一行（feed 变体）
 *
 * 版式依据：`App树洞HeroUI-Native重构设计与实施计划.md` §页面线框（信息流）
 *   左身份列 + 右内容列 / 标题 → 正文 → 标签 → 媒体 → 计数 / 帖子之间只留细分隔线。
 *
 * 对比旧实现修掉的渲染缺陷：
 * - 旧行把整条帖子包在一个 `Pressable` 里再嵌 like/reply/more 三个按钮（按钮套按钮）；
 *   现在**内容区（题/正文/媒体）各自可点**，动作区是兄弟节点，读屏不再"按钮里套按钮"。
 * - 旧行的"展开"状态存在行组件内，FlashList 回收行后会串到别的帖子；
 *   现在展开状态**由列表按帖子 id 持有**（`expanded` / `onToggleExpand`）。
 * - 旧行截断 8 行却按 240 字判断是否给"阅读全文"（会静默丢内容）；
 *   现在两件事同源（`treeholePreview`）。
 */

import * as React from 'react';
import { PixelRatio, View } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { TreeholeMedia } from './TreeholeMedia';
import { SearchHighlight } from './SearchHighlight';
import { TreeholeActionBar, TreeholeAuthorLine, TreeholeTagList } from './TreeholePostParts';
import type { TreeholePostViewModel } from './treeholePostViewModel';
import { treeholeCanExpand, treeholePreviewLines } from './treeholePreview';

/** 内容列左缩进 = 头像列宽度（space_8）+ 间距（space_2） */

export type TreeholePostRowProps = {
  post: TreeholePostViewModel;
  timeLabel: string;
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  expanded: boolean;
  onToggleExpand: () => void;
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
  expanded,
  onToggleExpand,
  onOpen,
  onLike,
  likeNotice,
  query,
}: TreeholePostRowProps): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  // 只关心字号缩放（不读屏宽）：读屏宽会新增一个"宽度读者"，
  // 而安全区台账把"读宽度"当作**大屏布局**的事实登记（p2d-02 第 6 条）。
  const fontScale = PixelRatio.getFontScale();
  const canExpand = treeholeCanExpand(post.content, fontScale);
  const contentLines = treeholePreviewLines(post.content, fontScale, expanded);
  const indent = theme.space('space_8') + theme.space('space_2');
  const openLabel = post.title.trim().length > 0 ? post.title : t('screen.campus.read.openPost');

  return (
    <View
      testID={`treehole-post-${post.id}`}
      style={{
        paddingHorizontal: theme.space('space_4'),
        paddingTop: theme.space('space_3'),
        paddingBottom: theme.space('space_3'),
        gap: theme.space('space_2'),
      }}
    >
      <TreeholeAuthorLine
        name={post.authorName}
        avatarUrl={post.avatarUrl}
        level={post.authorLevel}
        timeLabel={timeLabel}
      />

      <View style={{ paddingLeft: indent, gap: theme.space('space_2') }}>
        {/* 内容区：题 + 正文各自可点（读屏标签用标题/动作名，⛔ 不再拿整篇正文当标签） */}
        <Pressable
          testID={`campus-row-${post.id}`}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={openLabel}
          style={{ gap: theme.space('space_1') }}
        >
          {post.title.trim().length > 0 ? (
            query ? (
              <SearchHighlight value={post.title} query={query} role="headline" numberOfLines={2} />
            ) : (
              <Text role="headline" emphasis="strong" colorToken="text-primary" numberOfLines={2}>
                {post.title}
              </Text>
            )
          ) : null}
          {query ? (
            <SearchHighlight
              value={post.content}
              query={query}
              role="body"
              colorToken="text-primary"
              numberOfLines={contentLines}
              testID={`treehole-content-${post.id}`}
            />
          ) : (
            <Text
              testID={`treehole-content-${post.id}`}
              role="body"
              colorToken="text-primary"
              numberOfLines={contentLines}
            >
              {post.content}
            </Text>
          )}
        </Pressable>

        {canExpand ? (
          <Pressable
            testID="treehole-read-more"
            onPress={onToggleExpand}
            accessibilityRole="button"
            accessibilityLabel={expanded ? t('screen.campus.read.collapse') : t('screen.campus.read.more')}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text role="caption" colorToken="text-brand">
              {expanded ? t('screen.campus.read.collapse') : t('screen.campus.read.more')}
            </Text>
          </Pressable>
        ) : null}

        <TreeholeTagList tags={post.tags} />

        {post.mediaUrls.length > 0 ? (
          <Pressable
            testID={`campus-row-${post.id}-media`}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={openLabel}
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
