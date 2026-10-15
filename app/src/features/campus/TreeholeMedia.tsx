import { Button, Card, Dialog } from 'heroui-native';
import * as React from 'react';
import { Image, PanResponder, View } from 'react-native';
import { useTheme } from '@/design-system/theme';

export type TreeholeMediaMode = 'feed' | 'detail';

export function resolveTreeholeSwipe(dx: number): 'next' | 'previous' | null {
  if (dx <= -48) return 'next';
  if (dx >= 48) return 'previous';
  return null;
}

export function TreeholeMedia({ urls, mode }: { urls: readonly string[]; mode: TreeholeMediaMode }): React.ReactElement | null {
  const theme = useTheme();
  const [index, setIndex] = React.useState(0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  if (!urls.length) return null;
  const current = urls[index] ?? urls[0];
  const next = () => setIndex(value => (value + 1) % urls.length);
  const previous = () => setIndex(value => (value - 1 + urls.length) % urls.length);
  const panHandlers = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => mode === 'detail' && urls.length > 1 && Math.abs(gesture.dx) > 12,
    onPanResponderRelease: (_, gesture) => {
      if (resolveTreeholeSwipe(gesture.dx) === 'next') next();
      if (resolveTreeholeSwipe(gesture.dx) === 'previous') previous();
    },
  }).panHandlers, [mode, urls.length]);

  if (mode === 'feed') return <Card testID="treehole-media-feed" variant="secondary" animation="disable-all">
    <Image testID="treehole-media-feed-image" source={{ uri: urls[0] }} accessibilityLabel={`帖子图片，共 ${urls.length} 张`} style={{ width: '100%', aspectRatio: 1.6 }} />
    {urls.length > 1 ? <ChipLabel label={`${urls.length} 张图片`} /> : null}
  </Card>;

  return <Card testID="treehole-media-detail" variant="secondary" animation={theme.reduceMotion ? 'disable-all' : undefined}>
    <View testID="treehole-media-drag-area" {...panHandlers}>
      <Image testID="treehole-media-detail-image" source={{ uri: current }} accessibilityLabel={`第 ${index + 1} 张，共 ${urls.length} 张`} style={{ width: '100%', aspectRatio: 1 }} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {urls.length > 1 ? <>
        <Button testID="treehole-media-previous" size="sm" variant="ghost" onPress={previous}>上一张</Button>
        <Button testID="treehole-media-next" size="sm" variant="ghost" onPress={next}>下一张</Button>
      </> : null}
      <Button testID="treehole-media-preview" size="sm" variant="secondary" onPress={() => setPreviewOpen(value => !value)}>
        预览图片
      </Button>
    </View>
    <Dialog isOpen={previewOpen} onOpenChange={setPreviewOpen}>
      {previewOpen ? <Dialog.Portal>
        <Dialog.Overlay isCloseOnPress />
        <Dialog.Content testID="treehole-media-preview-dialog">
          <Dialog.Title>图片预览</Dialog.Title>
          <Image testID="treehole-media-preview-image" source={{ uri: current }} accessibilityLabel={`预览第 ${index + 1} 张，共 ${urls.length} 张`} style={{ width: '100%', aspectRatio: 1 }} />
          <Dialog.Close accessibilityLabel="关闭图片预览" />
        </Dialog.Content>
      </Dialog.Portal> : null}
    </Dialog>
  </Card>;
}

function ChipLabel({ label }: { label: string }): React.ReactElement {
  return <Card.Description testID="treehole-media-count">{label}</Card.Description>;
}
