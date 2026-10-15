import * as React from 'react';
import { View } from 'react-native';
import { Avatar, Button, Dialog, TextArea, useToast as useHeroUIToast } from 'heroui-native';

export type TreeholeTracerPost = {
  content: string;
  author?: { avatar?: string; nickname?: string; username?: string } | null;
};

function authorName(post: TreeholeTracerPost): string {
  return post.author?.nickname?.trim() || post.author?.username?.trim() || '匿名同学';
}

function initials(name: string): string {
  return Array.from(name).slice(0, 1).join('').toUpperCase();
}

/**
 * Phase 1 compatibility tracer. It consumes the loaded post, but has no data
 * mutations: existing report and comment flows remain their own source of truth.
 */
export function TreeholeHeroUITracer({ post }: { post: TreeholeTracerPost }): React.ReactElement {
  const { toast: heroToast } = useHeroUIToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const name = authorName(post);
  const avatar = post.author?.avatar?.trim();

  return (
    <View testID="treehole-heroui-tracer" accessibilityLabel={`HeroUI 详情检查：${name}`}>
      <Avatar testID="treehole-heroui-avatar" size="sm" color="accent">
        {avatar ? <Avatar.Image source={{ uri: avatar }} /> : null}
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>
      <Button testID="treehole-heroui-open" variant="tertiary" onPress={() => setIsOpen(true)}>
        查看详情检查
      </Button>
      <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
        {isOpen ? (
          <Dialog.Portal>
            <Dialog.Overlay testID="treehole-heroui-overlay" isCloseOnPress />
            <Dialog.Content testID="treehole-heroui-dialog">
              <Dialog.Title>{name}</Dialog.Title>
              <Dialog.Description numberOfLines={2}>{post.content}</Dialog.Description>
              <TextArea
                testID="treehole-heroui-note"
                value={note}
                onChangeText={setNote}
                placeholder="记录一个只在本地查看的备注"
                accessibilityLabel="详情检查备注"
              />
              <Button
                testID="treehole-heroui-confirm"
                variant="primary"
                onPress={() => {
                  heroToast.show({ label: 'HeroUI 详情检查完成', variant: 'success' });
                  setIsOpen(false);
                }}
              >
                完成检查
              </Button>
              <Dialog.Close accessibilityLabel="关闭详情检查" />
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </Dialog>
    </View>
  );
}
