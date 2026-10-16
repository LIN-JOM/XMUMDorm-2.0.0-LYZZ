import { Avatar, Button, Card, Chip } from 'heroui-native';
import * as React from 'react';
import { PixelRatio, View } from 'react-native';
import {useI18n} from '@/i18n';
import {levelNameKey} from '@/features/me/profile';
import {useTheme} from '@/design-system/theme';
import type { TreeholePostViewModel } from './treeholePostViewModel';

export type TreeholePostVariant = 'feed' | 'detail';

/** ponytail: large text keeps the complete post visible; no measuring or per-row layout state is needed. */
export function treeholeFeedContentLines(fontScale: number, expanded: boolean): number | undefined {
  return !expanded && fontScale < 2 ? 8 : undefined;
}

function initials(name: string | null, fallback: string): string {
  return Array.from(name || fallback).slice(0, 1).join('').toUpperCase();
}

export function TreeholeAuthor({ post }: { post: Pick<TreeholePostViewModel, 'authorName' | 'avatarUrl' | 'authorLevel'> }): React.ReactElement {
  const {t}=useI18n();const name = post.authorName || t('screen.campus.read.anonymous');
  return <View testID="treehole-author" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Avatar size="sm" color="accent" accessibilityLabel={name}>
      {post.avatarUrl ? <Avatar.Image source={{ uri: post.avatarUrl }} /> : null}
      <Avatar.Fallback>{initials(name,t('screen.campus.read.anonymous'))}</Avatar.Fallback>
    </Avatar>
    <Card.Title numberOfLines={1}>{name}</Card.Title>
    {post.authorLevel !== null ? <Chip testID="treehole-author-level" size="sm" variant="soft" color="accent"><Chip.Label>{t(levelNameKey(post.authorLevel))}</Chip.Label></Chip> : null}
  </View>;
}

export function TreeholeTags({ tags }: { tags: TreeholePostViewModel['tags'] }): React.ReactElement | null {
  const {locale}=useI18n();
  if (!tags.length) return null;
  return <View testID="treehole-tags" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
    {tags.map(tag => <Chip key={tag.id} size="sm" variant="soft" color="accent"><Chip.Label>{locale==='en'?tag.nameEn||tag.nameZh:tag.nameZh||tag.nameEn}</Chip.Label></Chip>)}
  </View>;
}

export function TreeholeActions({ liked, likeCount, commentCount, onLike, onReply, onReport, testIDPrefix }: {
  liked: boolean;
  likeCount: number | null;
  commentCount: number | null;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  testIDPrefix?: string;
}): React.ReactElement {
  const {t}=useI18n();const likeLabel=t('screen.campus.read.like'),commentLabel=t('screen.campus.read.comments'),reportLabel=t('screen.campus.read.report');
  return <View testID="treehole-actions" style={{ flexDirection: 'row', gap: 8 }}>
    <Button testID={testIDPrefix ? `${testIDPrefix}-like` : 'treehole-like'} size="sm" variant={liked ? 'secondary' : 'ghost'} onPress={onLike} accessibilityState={{ selected: liked }} accessibilityLabel={`${likeLabel} ${likeCount ?? '—'}`}>
      {`${likeCount ?? '—'} ${likeLabel}`}
    </Button>
    <Button testID={testIDPrefix ? `${testIDPrefix}-reply` : 'treehole-reply'} size="sm" variant="ghost" onPress={onReply} accessibilityLabel={`${commentLabel} ${commentCount ?? '—'}`}>
      {`${commentCount ?? '—'} ${commentLabel}`}
    </Button>
    {onReport?<Button testID={testIDPrefix ? `${testIDPrefix}-report` : 'treehole-report'} size="sm" variant="ghost" onPress={onReport} accessibilityLabel={reportLabel}>{reportLabel}</Button>:null}
  </View>;
}

export function TreeholePost({ post, variant, media, onPress, onLike, onReply, onReport, actionTestIDPrefix, metaLabel, titleContent, contentContent }: {
  post: TreeholePostViewModel;
  variant: TreeholePostVariant;
  media?: React.ReactNode;
  onPress?: () => void;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  actionTestIDPrefix?: string;
  metaLabel?: string;
  titleContent?: React.ReactNode;
  contentContent?: React.ReactNode;
}): React.ReactElement {
  const {t}=useI18n();
  const theme=useTheme();const [expanded,setExpanded]=React.useState(false);
  const canExpand=variant==='feed'&&post.content.length>240;
  const feedStyle=variant==='feed'?{borderRadius:0,borderBottomWidth:1,borderBottomColor:theme.color['border-subtle'].value}:undefined;
  return <Card testID={`treehole-post-${variant}`} variant={variant === 'feed' ? 'transparent' : 'default'} animation="disable-all" style={feedStyle}>
    <Card.Header><TreeholeAuthor post={post} /></Card.Header>
    <Card.Body>
      {post.title ? <Card.Title numberOfLines={variant === 'feed' ? 2 : undefined}>{titleContent ?? post.title}</Card.Title> : null}
      <Card.Description numberOfLines={variant === 'feed'?treeholeFeedContentLines(PixelRatio.getFontScale(),expanded):undefined}>{contentContent ?? post.content}</Card.Description>
      {canExpand&&!expanded?<Button testID="treehole-read-more" size="sm" variant="ghost" onPress={()=>setExpanded(true)} accessibilityLabel={t('screen.campus.read.more')}>{t('screen.campus.read.more')}</Button>:null}
      {metaLabel ? <Card.Description>{metaLabel}</Card.Description> : null}
      <TreeholeTags tags={post.tags} />
      {media}
    </Card.Body>
    <Card.Footer><TreeholeActions liked={post.liked} likeCount={post.likeCount} commentCount={post.commentCount} onLike={onLike} onReply={onReply} onReport={onReport} testIDPrefix={actionTestIDPrefix} /></Card.Footer>
    {onPress ? <Button testID={`treehole-open-${variant}`} variant="ghost" onPress={onPress} accessibilityLabel={t('screen.campus.read.comments')}>{t('screen.campus.read.comments')}</Button> : null}
  </Card>;
}
