import * as React from 'react';
import { ScrollView, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
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

  /** One attachment is one row: name and metadata on the left, the original-page action on the right. */
  const fileRow = (file: MoodleFile, key: string): React.ReactElement =>
    <View key={key} testID={`moodle-file-${key}`} style={{ flexDirection: 'row', alignItems: 'center',
      gap: theme.space('space_3'), paddingHorizontal: theme.space('space_4'), paddingVertical: theme.space('space_2') }}>
      <View style={{ flex: 1, gap: theme.space('space_1') }}>
        <Text role="body" numberOfLines={2}>{file.name}</Text>
        <Text role="caption" colorToken="text-secondary">
          {file.mimeType === null && file.size === null && file.modifiedAt === null
            ? labels.fileUnknown : labels.fileMetadata(file)}
        </Text>
      </View>
      <Button testID={`moodle-file-original-${key}`} label={labels.original} variant="link" size="small"
        onPress={() => onOriginal(file.url)} />
    </View>;

  return <ScrollView testID="moodle-detail" contentContainerStyle={{ padding: theme.space('space_4'),
    gap: theme.space('space_6') }}>
    <View testID="moodle-detail-header" style={{ flexDirection: 'row', alignItems: 'center',
      gap: theme.space('space_2') }}>
      <IconButton testID="moodle-detail-back" Icon={ArrowLeft} accessibilityLabel={labels.back} onPress={onBack} />
      <Text role="headline" emphasis="strong" numberOfLines={2} style={{ flex: 1 }}>{title ?? ''}</Text>
      <IconButton testID="moodle-detail-original" Icon={ExternalLink}
        accessibilityLabel={labels.original} onPress={() => onOriginal(detail.url)} />
    </View>
    {detail.description ? <Text role="body">{detail.description}</Text> : null}
    {detail.kind === 'forum' ? detail.announcements.length === 0
      ? <EmptyState kind="firstRun" testID="moodle-empty-original" title={labels.empty}
        actionLabel={labels.original} onAction={() => onOriginal(detail.url)} />
      : <Card variant="plain" padding="none" testID="moodle-forum">
        {detail.announcements.map((row) => <ListItem key={row.id} testID={`moodle-discussion-${row.id}`}
          title={row.title} subtitle={row.author ?? undefined} onPress={() => onDiscussion(row.url)} />)}
      </Card> : null}
    {detail.kind === 'discussion' ? detail.posts.map((post) =>
      <Card key={post.id} variant="plain" padding="space_3" testID={`moodle-post-${post.id}`}>
        <Text role="headline">{post.title}</Text>
        {post.author || post.createdAt ? <Text role="caption" colorToken="text-secondary">
          {[post.author, post.createdAt ? labels.formatTime(Date.parse(post.createdAt)) : null]
            .filter(Boolean).join(' · ')}
        </Text> : null}
        <Text role="body">{post.body}</Text>
        {post.attachments.map((file, index) => fileRow(file, `${post.id}-${index}`))}
        <Button testID={`moodle-post-original-${post.id}`} label={labels.original} variant="link" size="small"
          onPress={() => onOriginal(post.url)} />
      </Card>) : null}
    {detail.kind === 'assign' ? <View style={{ gap: theme.space('space_3') }}>
      <Card variant="plain" padding="space_3" testID="moodle-assign">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space('space_2') }}>
          <Chip variant="static" label={labels.submissionStatus(detail.submission)} />
          <Chip variant="static" label={labels.gradingStatus(detail.grading)} />
        </View>
        {detail.locked ? <Text role="caption" colorToken="text-warning">{labels.locked}</Text> : null}
        {detail.activityDates ? <Text role="caption" colorToken="text-secondary">{detail.activityDates}</Text> : null}
        {detail.rows.map((row, index) => <View key={index} style={{ gap: theme.space('space_1') }}>
          <Text role="label" colorToken="text-secondary">{row.label}</Text>
          <Text role="body">{row.value}</Text>
        </View>)}
      </Card>
      {detail.attachments.length ? <Card variant="plain" padding="none" testID="moodle-assign-files">
        {detail.attachments.map((file, index) => fileRow(file, `assign-${index}`))}
      </Card> : null}
    </View> : null}
    {detail.kind === 'folder' ? detail.files.length ? <Card variant="plain" padding="none" testID="moodle-folder">
      {detail.files.map((file, index) => fileRow(file, `folder-${index}`))}
    </Card> : <EmptyState kind="firstRun" testID="moodle-empty-folder" title={labels.empty}
      actionLabel={labels.original} onAction={() => onOriginal(detail.url)} /> : null}
    {detail.kind === 'resource' ? detail.file ? <Card variant="plain" padding="none" testID="moodle-resource">
      {fileRow(detail.file, 'resource-0')}
    </Card> : <EmptyState kind="broken" title={labels.fileUnknown} actionLabel={labels.original}
      onAction={() => onOriginal(detail.url)} /> : null}
  </ScrollView>;
}
