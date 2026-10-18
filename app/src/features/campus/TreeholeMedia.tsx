/* eslint-disable react-hooks/immutability -- Reanimated shared values intentionally mutate outside React state. */
/**
 * TreeholeMedia —— 树洞的唯一媒体组件（feed 静态叠层 / detail 可切图）
 *
 * 设计文档口径（`App树洞HeroUI-Native重构设计与实施计划.md` §媒体布局与手势）：
 * - 单图 = 大图占满正文列，4:5 画幅；两图/三图 = 叠卡外观（后层缩放 + 透明度 + 偏移）；
 * - **feed 不注册任何媒体手势**（横滑留给广场模块切换、纵滑留给列表）；
 * - detail 允许拖拽 + 左右按钮切换、循环、当前位置指示、点击预览；
 * - reduced-motion 时立即换图，不做飞出/旋转/回弹。
 *
 * 实现纪律：
 * - **不用 HeroUI Card 包一层**（旧实现是 Card 套 Card：多一层 16dp 内边距、图片只有 83.6% 宽，违反 9.14）；
 * - 横向拖拽用 PanResponder + Reanimated（与旧实现同一套机制），⛔ 不引入第二套动画库；
 * - feed / detail 拆成两个组件：feed 分支**零 hooks 状态**，避免每条帖子实例化 PanResponder 与共享值。
 */

import * as React from 'react';
import { Modal, PanResponder, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import X from 'lucide-react-native/icons/x';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Pressable as AppPressable } from '@/components/ui/Pressable';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

export type TreeholeMediaMode = 'feed' | 'detail';

/** 详情切图阈值（纯函数）：位移 ≥60 或水平速度 ≥700 才换图 */
export function resolveTreeholeSwipe(dx: number, velocityX = 0): 'next' | 'previous' | null {
  if (dx <= -60 || velocityX <= -700) return 'next';
  if (dx >= 60 || velocityX >= 700) return 'previous';
  return null;
}

/** 帖子 ID 或图片序列变化时的重置键 */
export function treeholeMediaKey(postId: number, urls: readonly string[]): string {
  return `${postId}:${urls.join('|')}`;
}

/** 叠卡画幅：**多图 4:5**（设计文档 §媒体布局与手势）；**单图 4:3**（文档同节"限制极端高度"） */
export function treeholeMediaAspect(count: number): number {
  return count > 1 ? 4 / 5 : 4 / 3;
}

export function TreeholeMedia({
  postId,
  urls,
  mode,
}: {
  postId: number;
  urls: readonly string[];
  mode: TreeholeMediaMode;
}): React.ReactElement | null {
  if (urls.length === 0) return null;
  return mode === 'feed' ? (
    <TreeholeFeedMedia postId={postId} urls={urls} />
  ) : (
    <TreeholeDetailMedia postId={postId} urls={urls} />
  );
}

/** 叠在后面的两层（只表达景深：缩放 + 透明度 + 右上偏移，⛔ 不做实时模糊） */
function StackedLayers({ urls }: { urls: readonly string[] }): React.ReactElement | null {
  const theme = useTheme();
  if (urls.length <= 1) return null;
  return (
    <>
      {urls.length > 2 ? (
        <Image
          source={{ uri: urls[2] }}
          contentFit="cover"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: theme.radius('radius_medium'),
            transform: [{ translateX: 24 }, { translateY: -12 }, { scale: 0.88 }],
            opacity: 0.3,
          }}
        />
      ) : null}
      <Image
        source={{ uri: urls[1] }}
        contentFit="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: theme.radius('radius_medium'),
          transform: [{ translateX: 12 }, { translateY: -6 }, { scale: 0.94 }],
          opacity: 0.6,
        }}
      />
    </>
  );
}

function CountBadge({ label }: { label: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <Surface
      variant="surface"
      rounded="radius_full"
      padding="space_1"
      style={{
        position: 'absolute',
        right: theme.space('space_2'),
        bottom: theme.space('space_2'),
      }}
    >
      <Text role="caption" colorToken="text-secondary" testID="treehole-media-count">
        {label}
      </Text>
    </Surface>
  );
}

/** feed：静态首图 + 数量；⛔ 不注册手势、不提供切图控件（设计文档 R-7） */
function TreeholeFeedMedia({
  postId,
  urls,
}: {
  postId: number;
  urls: readonly string[];
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const label =
    urls.length > 1 ? t('screen.campus.mediaOpenPost', { count: urls.length }) : undefined;
  return (
    <View testID="treehole-media-feed">
      <View
        style={{
          aspectRatio: treeholeMediaAspect(urls.length),
          borderRadius: theme.radius('radius_medium'),
          overflow: 'hidden',
          backgroundColor: theme.color['bg-sunken'].value,
        }}
      >
        {urls.length > 1 ? <StackedLayers urls={urls} /> : null}
        <Image
          testID="treehole-media-feed-image"
          source={{ uri: urls[0] }}
          recyclingKey={`${postId}:${urls[0]}`}
          cachePolicy="memory-disk"
          contentFit="cover"
          accessible={label !== undefined}
          accessibilityLabel={label}
          accessibilityElementsHidden={label === undefined}
          importantForAccessibility={label === undefined ? 'no-hide-descendants' : 'auto'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>
      {urls.length > 1 ? (
        <CountBadge label={t('screen.campus.mediaCount', { count: urls.length })} />
      ) : null}
    </View>
  );
}

/** detail：叠卡 + 拖拽/按钮循环切图 + 预览（设计文档 §媒体布局与手势） */
function TreeholeDetailMedia({
  postId,
  urls,
}: {
  postId: number;
  urls: readonly string[];
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const [index, setIndex] = React.useState(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [retryRevision, setRetryRevision] = React.useState(0);
  const offsetX = useSharedValue(0);
  const key = treeholeMediaKey(postId, urls);
  const current = urls[index] ?? urls[0];
  const next = React.useCallback(
    () => setIndex((value) => (value + 1) % urls.length),
    [urls.length]
  );
  const previous = React.useCallback(
    () => setIndex((value) => (value - 1 + urls.length) % urls.length),
    [urls.length]
  );
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { rotate: `${offsetX.value / 14}deg` }],
  }));
  React.useEffect(() => {
    setIndex(0);
    setPreviewOpen(false);
    setFailed(false);
    offsetX.value = 0;
  }, [key, offsetX]);
  const finishSwipe = React.useCallback(
    (direction: 'next' | 'previous' | null) => {
      if (!direction) {
        offsetX.value = theme.reduceMotion ? 0 : withSpring(0);
        return;
      }
      if (theme.reduceMotion) {
        if (direction === 'next') next();
        else previous();
        offsetX.value = 0;
        return;
      }
      const leaveTo = direction === 'next' ? -140 : 140;
      offsetX.value = withTiming(leaveTo, { duration: 160 }, (done) => {
        if (done) {
          offsetX.value = 0;
          runOnJS(direction === 'next' ? next : previous)();
        }
      });
    },
    [next, offsetX, previous, theme.reduceMotion]
  );
  const panHandlers = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          urls.length > 1 && Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 12,
        onPanResponderMove: (_, gesture) => {
          offsetX.value = gesture.dx;
        },
        onPanResponderRelease: (_, gesture) => {
          finishSwipe(resolveTreeholeSwipe(gesture.dx, gesture.vx * 1000));
        },
        onPanResponderTerminate: () => {
          offsetX.value = theme.reduceMotion ? 0 : withSpring(0);
        },
      }).panHandlers,
    [finishSwipe, offsetX, theme.reduceMotion, urls.length]
  );

  return (
    <View testID="treehole-media-detail" style={{ gap: theme.space('space_2') }}>
      {failed ? (
        <View testID="treehole-media-error" style={{ gap: theme.space('space_2') }}>
          <Text role="body" colorToken="text-secondary">
            {t('screen.campus.mediaFailed')}
          </Text>
          <Button
            testID="treehole-media-retry"
            label={t('action.retry')}
            size="small"
            variant="secondary"
            onPress={() => {
              setFailed(false);
              setRetryRevision((value) => value + 1);
            }}
          />
        </View>
      ) : (
        <View
          style={{
            aspectRatio: treeholeMediaAspect(urls.length),
            borderRadius: theme.radius('radius_medium'),
            overflow: 'hidden',
            backgroundColor: theme.color['bg-sunken'].value,
          }}
        >
          <StackedLayers
            urls={urls.map((_, offset) => urls[(index + offset) % urls.length] as string)}
          />
          <Animated.View
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, animatedStyle]}
            {...panHandlers}
          >
            <AppPressable
              testID="treehole-media-drag-area"
              onPress={() => setPreviewOpen(true)}
              accessibilityRole="image"
              accessibilityLabel={t('screen.campus.mediaPosition', {
                index: index + 1,
                total: urls.length,
              })}
              style={{ flex: 1 }}
            >
              <Image
                key={`${current}:${retryRevision}`}
                testID="treehole-media-detail-image"
                source={{ uri: current }}
                recyclingKey={current}
                cachePolicy="memory-disk"
                contentFit="cover"
                accessible={false}
                onError={() => setFailed(true)}
                style={{ width: '100%', height: '100%' }}
              />
            </AppPressable>
          </Animated.View>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_2') }}>
        {urls.length > 1 ? (
          <>
            <Button
              testID="treehole-media-previous"
              label={t('screen.campus.mediaPrevious')}
              size="small"
              variant="ghost"
              onPress={previous}
            />
            <Button
              testID="treehole-media-next"
              label={t('screen.campus.mediaNext')}
              size="small"
              variant="ghost"
              onPress={next}
            />
          </>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text
          testID="treehole-media-position"
          role="caption"
          colorToken="text-muted"
          accessibilityLiveRegion="polite"
        >
          {urls.length > 1
            ? t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })
            : ''}
        </Text>
        <Button
          testID="treehole-media-preview"
          label={t('screen.campus.mediaPreview')}
          size="small"
          variant="secondary"
          onPress={() => setPreviewOpen((value) => !value)}
        />
      </View>

      <Modal
        visible={previewOpen}
        transparent
        animationType={theme.reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View
          testID="treehole-media-preview-dialog"
          style={{ flex: 1, backgroundColor: theme.color['bg-canvas'].value }}
        >
          <View
            style={{
              paddingTop: theme.space('space_8'),
              paddingHorizontal: theme.space('space_4'),
              alignItems: 'flex-end',
            }}
          >
            <Pressable
              onPress={() => setPreviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('action.close')}
              style={{
                minWidth: theme.touchTarget,
                minHeight: theme.touchTarget,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon source={X} size="body" tint="primary" />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Image
              testID="treehole-media-preview-image"
              source={{ uri: current }}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          {urls.length > 1 ? (
            <View style={{ padding: theme.space('space_4'), alignItems: 'center' }}>
              <Text role="caption" colorToken="text-secondary">
                {t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
