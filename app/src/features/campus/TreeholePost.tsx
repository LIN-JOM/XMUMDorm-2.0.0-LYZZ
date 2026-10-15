import { Avatar, Button, Card, Chip } from 'heroui-native';
import * as React from 'react';
import { View } from 'react-native';
import type { TreeholePostViewModel } from './treeholePostViewModel';

export type TreeholePostVariant = 'feed' | 'detail';

function initials(name: string | null): string {
  return Array.from(name || '匿名同学').slice(0, 1).join('').toUpperCase();
}

export function TreeholeAuthor({ post }: { post: Pick<TreeholePostViewModel, 'authorName' | 'avatarUrl'> }): React.ReactElement {
  const name = post.authorName || '匿名同学';
  return <View testID="treehole-author" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Avatar size="sm" color="accent" accessibilityLabel={name}>
      {post.avatarUrl ? <Avatar.Image source={{ uri: post.avatarUrl }} /> : null}
      <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
    </Avatar>
    <Card.Title numberOfLines={1}>{name}</Card.Title>
  </View>;
}

export function TreeholeTags({ tags }: { tags: readonly string[] }): React.ReactElement | null {
  if (!tags.length) return null;
  return <View testID="treehole-tags" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {tags.map(tag => <Chip key={tag} size="sm" variant="soft" color="accent"><Chip.Label>{tag}</Chip.Label></Chip>)}
  </View>;
}

export function TreeholeActions({ liked, likeCount, commentCount, onLike, onReply }: {
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onLike?: () => void;
  onReply?: () => void;
}): React.ReactElement {
  return <View testID="treehole-actions" style={{ flexDirection: 'row', gap: 8 }}>
    <Button testID="treehole-like" size="sm" variant={liked ? 'secondary' : 'ghost'} onPress={onLike} accessibilityLabel={`点赞 ${likeCount ?? '—'}`}>
      {`${liked ? '已赞' : '点赞'} ${likeCount ?? '—'}`}
    </Button>
    <Button testID="treehole-reply" size="sm" variant="ghost" onPress={onReply} accessibilityLabel={`评论 ${commentCount ?? '—'}`}>
      {`评论 ${commentCount ?? '—'}`}
    </Button>
  </View>;
}

export function TreeholePost({ post, variant, tags = [], media, onPress, onLike, onReply }: {
  post: TreeholePostViewModel;
  variant: TreeholePostVariant;
  tags?: readonly string[];
  media?: React.ReactNode;
  onPress?: () => void;
  onLike?: () => void;
  onReply?: () => void;
}): React.ReactElement {
  return <Card testID={`treehole-post-${variant}`} variant={variant === 'feed' ? 'transparent' : 'default'} animation="disable-all">
    <Card.Header><TreeholeAuthor post={post} /></Card.Header>
    <Card.Body>
      {post.title ? <Card.Title numberOfLines={variant === 'feed' ? 2 : undefined}>{post.title}</Card.Title> : null}
      <Card.Description numberOfLines={variant === 'feed' ? 5 : undefined}>{post.content}</Card.Description>
      <TreeholeTags tags={tags} />
      {media}
    </Card.Body>
    <Card.Footer><TreeholeActions liked={post.liked} likeCount={post.likeCount} commentCount={post.commentCount} onLike={onLike} onReply={onReply} /></Card.Footer>
    {onPress ? <Button testID={`treehole-open-${variant}`} variant="ghost" onPress={onPress} accessibilityLabel="查看帖子">查看帖子</Button> : null}
  </Card>;
}
