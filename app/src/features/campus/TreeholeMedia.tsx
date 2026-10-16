/* eslint-disable react-hooks/immutability -- Reanimated shared values intentionally mutate outside React state. */
import { Button, Card, Dialog } from 'heroui-native';
import * as React from 'react';
import { PanResponder, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

export type TreeholeMediaMode = 'feed' | 'detail';

export function resolveTreeholeSwipe(dx: number, velocityX = 0): 'next' | 'previous' | null {
  if (dx <= -60 || velocityX <= -700) return 'next';
  if (dx >= 60 || velocityX >= 700) return 'previous';
  return null;
}

export function treeholeMediaKey(postId: number, urls: readonly string[]): string {
  return `${postId}:${urls.join('|')}`;
}

export function TreeholeMedia({ postId, urls, mode }: { postId: number; urls: readonly string[]; mode: TreeholeMediaMode }): React.ReactElement | null {
  const theme = useTheme();
  const { t } = useI18n();
  const [index, setIndex] = React.useState(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [retryRevision, setRetryRevision] = React.useState(0);
  const offsetX = useSharedValue(0);
  const key = treeholeMediaKey(postId, urls);
  const current = urls[index] ?? urls[0];
  const next = React.useCallback(() => setIndex(value => (value + 1) % urls.length), [urls.length]);
  const previous = React.useCallback(() => setIndex(value => (value - 1 + urls.length) % urls.length), [urls.length]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offsetX.value }, { rotate: `${offsetX.value / 14}deg` }] }));
  React.useEffect(() => { setIndex(0); setPreviewOpen(false); setFailed(false); offsetX.value = 0; }, [key, offsetX]);
  const finishSwipe = React.useCallback((direction: 'next' | 'previous' | null) => {
    if (!direction) { offsetX.value = theme.reduceMotion ? 0 : withSpring(0); return; }
    if (theme.reduceMotion) { if (direction === 'next') next(); else previous(); offsetX.value = 0; return; }
    const leaveTo = direction === 'next' ? -140 : 140;
    offsetX.value = withTiming(leaveTo, { duration: 160 }, done => {
      if (done) { offsetX.value = 0; runOnJS(direction === 'next' ? next : previous)(); }
    });
  }, [next, offsetX, previous, theme.reduceMotion]);
  const panHandlers = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => mode === 'detail' && urls.length > 1 && Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 12,
    onPanResponderMove: (_, gesture) => { offsetX.value = gesture.dx; },
    onPanResponderRelease: (_, gesture) => {
      finishSwipe(resolveTreeholeSwipe(gesture.dx, gesture.vx * 1000));
    },
    onPanResponderTerminate: () => { offsetX.value = theme.reduceMotion ? 0 : withSpring(0); },
  }).panHandlers, [finishSwipe, mode, offsetX, theme.reduceMotion, urls.length]);

  if (!urls.length) return null;

  if (mode === 'feed') return <Card testID="treehole-media-feed" variant="secondary" animation="disable-all">
    <View style={{ position: 'relative', aspectRatio: 4 / 5 }}>
      {urls.length > 2 ? <MediaImage uri={urls[2]} style={{ position: 'absolute', inset: 0, transform: [{ translateX: 24 }, { translateY: -12 }, { scale: 0.88 }], opacity: 0.3 }} /> : null}
      {urls.length > 1 ? <MediaImage uri={urls[1]} style={{ position: 'absolute', inset: 0, transform: [{ translateX: 12 }, { translateY: -6 }, { scale: 0.94 }], opacity: 0.6 }} /> : null}
      <MediaImage testID="treehole-media-feed-image" uri={urls[0]} accessibilityLabel={t('screen.campus.mediaOpenPost', { count: urls.length })} />
    </View>
    {urls.length > 1 ? <ChipLabel label={t('screen.campus.mediaCount', { count: urls.length })} /> : null}
  </Card>;

  return <Card testID="treehole-media-detail" variant="secondary" animation={theme.reduceMotion ? 'disable-all' : undefined}>
    {failed ? <View testID="treehole-media-error"><Card.Description>{t('screen.campus.mediaFailed')}</Card.Description><Button testID="treehole-media-retry" size="sm" variant="outline" onPress={() => { setFailed(false); setRetryRevision(value => value + 1); }}>{t('action.retry')}</Button></View> : <View testID="treehole-media-stack" style={{ position: 'relative', aspectRatio: 4 / 5 }}>
      {urls.length > 2 ? <MediaImage uri={urls[(index + 2) % urls.length]} style={{ position: 'absolute', inset: 0, transform: [{ translateX: 24 }, { translateY: -12 }, { scale: 0.88 }], opacity: 0.3 }} /> : null}
      {urls.length > 1 ? <MediaImage uri={urls[(index + 1) % urls.length]} style={{ position: 'absolute', inset: 0, transform: [{ translateX: 12 }, { translateY: -6 }, { scale: 0.94 }], opacity: 0.6 }} /> : null}
      <Animated.View testID="treehole-media-drag-area" style={[{ position: 'absolute', inset: 0 }, animatedStyle]} {...panHandlers}>
        <MediaImage key={`${current}:${retryRevision}`} testID="treehole-media-detail-image" uri={current} accessibilityLabel={t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })} onError={() => setFailed(true)} />
      </Animated.View>
    </View>
    }
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {urls.length > 1 ? <>
        <Button testID="treehole-media-previous" size="sm" variant="ghost" onPress={previous}>{t('screen.campus.mediaPrevious')}</Button>
        <Button testID="treehole-media-next" size="sm" variant="ghost" onPress={next}>{t('screen.campus.mediaNext')}</Button>
      </> : null}
      <Button testID="treehole-media-preview" size="sm" variant="secondary" onPress={() => setPreviewOpen(value => !value)}>
        {t('screen.campus.mediaPreview')}
      </Button>
    </View>
    {urls.length > 1 ? <ChipLabel label={t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })} /> : null}
    <Dialog isOpen={previewOpen} onOpenChange={setPreviewOpen}>
      {previewOpen ? <Dialog.Portal>
        <Dialog.Overlay isCloseOnPress />
        <Dialog.Content testID="treehole-media-preview-dialog">
          <Dialog.Title>{t('screen.campus.mediaPreview')}</Dialog.Title>
          <MediaImage testID="treehole-media-preview-image" uri={current} accessibilityLabel={t('screen.campus.mediaPosition', { index: index + 1, total: urls.length })} />
          <Dialog.Close accessibilityLabel={t('action.close')} />
        </Dialog.Content>
      </Dialog.Portal> : null}
    </Dialog>
  </Card>;
}

function MediaImage({ uri, testID, accessibilityLabel, style, onError }: { uri: string; testID?: string; accessibilityLabel?: string; style?: object; onError?: () => void }): React.ReactElement {
  return <Image testID={testID} source={{ uri }} cachePolicy="memory-disk" contentFit="cover" accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} style={[{ width: '100%', height: '100%', borderRadius: 12 }, style]} onError={onError} />;
}

function ChipLabel({ label }: { label: string }): React.ReactElement {
  return <Card.Description testID="treehole-media-count">{label}</Card.Description>;
}
