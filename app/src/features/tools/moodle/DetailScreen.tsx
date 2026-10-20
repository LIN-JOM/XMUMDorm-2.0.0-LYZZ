import * as React from 'react';
import { ScrollView, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ListItem } from '@/components/ui/ListItem';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import type { MoodleDetail, MoodleFile } from './detail';

export type MoodleDetailLabels = {
  back: string; original: string; empty: string; locked: string; fileUnknown: string;
  submissionStatus: (value: 'submitted' | 'draft' | 'reopened' | 'unknown') => string;
  gradingStatus: (value: 'graded' | 'not-graded' | 'unknown') => string;
  formatTime: (value: number) => string;
  fileMetadata: (file: MoodleFile) => string;
};

/** P3 detail: one header row, then the kind-specific body; no HTML rendering, no implicit fetch. */
export function MoodleDetailScreen({ detail, labels, onBack, onOriginal, onDiscussion, title }: {
  detail: MoodleDetail; labels: MoodleDetailLabels; onBack: () => void;
  onOriginal: (url: string) => void; onDiscussion: (url: string) => void;
  /** Module name shown in the header; the detail payload carries no title of its own. */
  title?: string;
}): React.ReactElement {
  const theme = useTheme();
  const files = (items: readonly MoodleFile[]) => items.map((file) => <View key={file.url}
    style={{ gap: theme.space('space_2') }}>
    <Text>{file.name}</Text>
    <Text role="caption">{file.mimeType === null && file.size === null && file.modifiedAt === null
      ? labels.fileUnknown : labels.fileMetadata(file)}</Text>
    <Button label={labels.original} variant="link" onPress={() => onOriginal(file.url)} />
  </View>);
  return <ScrollView testID="moodle-detail" contentContainerStyle={{ padding: theme.space('space_4'), gap: theme.space('space_4') }}>
    <View testID="moodle-detail-header" style={{ flexDirection: 'row', alignItems: 'center',
      gap: theme.space('space_2') }}>
      <IconButton testID="moodle-detail-back" Icon={ArrowLeft} accessibilityLabel={labels.back} onPress={onBack} />
      <Text role="headline" emphasis="strong" numberOfLines={2} style={{ flex: 1 }}>{title ?? ''}</Text>
      <IconButton testID="moodle-detail-original" Icon={ExternalLink}
        accessibilityLabel={labels.original} onPress={() => onOriginal(detail.url)} />
    </View>
    {detail.description ? <Text>{detail.description}</Text> : null}
    {detail.kind === 'forum' ? <View style={{ gap: theme.space('space_3') }}>
      {detail.announcements.length === 0 ? <EmptyState kind="firstRun" testID="moodle-empty-original"
        title={labels.empty} actionLabel={labels.original} onAction={() => onOriginal(detail.url)} /> : null}
      {detail.announcements.map((row) => <ListItem key={row.id} testID={`moodle-discussion-${row.id}`}
        title={row.title} subtitle={row.author ?? undefined} onPress={() => onDiscussion(row.url)} />)}
    </View> : null}
    {detail.kind === 'discussion' ? detail.posts.map((post) => <View key={post.id}
      style={{ gap: theme.space('space_2') }}>
      <Text role="headline">{post.title}</Text>
      {post.author ? <Text>{post.author}</Text> : null}
      {post.createdAt ? <Text role="caption">{labels.formatTime(Date.parse(post.createdAt))}</Text> : null}
      <Text>{post.body}</Text>
      {files(post.attachments)}
      <Button testID={`moodle-post-original-${post.id}`} label={labels.original} variant="link" onPress={() => onOriginal(post.url)} />
    </View>) : null}
    {detail.kind === 'assign' ? <View style={{ gap: theme.space('space_2') }}>
      <Text>{labels.submissionStatus(detail.submission)}</Text><Text>{labels.gradingStatus(detail.grading)}</Text>
      {detail.locked ? <Text>{labels.locked}</Text> : null}
      {detail.activityDates ? <Text role="caption">{detail.activityDates}</Text> : null}
      {detail.rows.map((row, index) => <View key={index}>
        <Text role="label">{row.label}</Text><Text>{row.value}</Text>
      </View>)}
      {detail.attachments.length ? files(detail.attachments) : null}
    </View> : null}
    {detail.kind === 'folder' ? detail.files.length ? files(detail.files) : <EmptyState kind="firstRun"
      testID="moodle-empty-folder" title={labels.empty} actionLabel={labels.original}
      onAction={() => onOriginal(detail.url)} /> : null}
    {detail.kind === 'resource' ? detail.file ? files([detail.file]) : <EmptyState kind="broken"
      title={labels.fileUnknown} actionLabel={labels.original} onAction={() => onOriginal(detail.url)} /> : null}
  </ScrollView>;
}
