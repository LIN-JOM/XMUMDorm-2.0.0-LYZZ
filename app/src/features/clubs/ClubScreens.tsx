import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { LoadingState } from '@/components/ui/LoadingState';
import { MediaGrid } from '@/components/ui/MediaGrid';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { DetailScreen } from '@/proto/P3';
import { listClubs, getClubProfile, getActivityDetail, getClubPostDetail } from '../../../../shared/api/clubs';
import { readClubActivityDetail, readClubPage, readClubPostDetail, readClubProfile, type ClubActivityDetail, type ClubPostDetail, type ClubProfile, type ClubSummary } from './model';
import { useClubActivityRegistration } from './useClubActivityRegistration';
import { useClubFollow } from './useClubFollow';
import { useClubLike } from './useClubLike';

function asPositiveId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

function appError(error: unknown): { kind: 'content' | 'permission' | 'unreachable' | 'unknown' } {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) return { kind: 'content' };
  if (status === 401 || status === 403) return { kind: 'permission' };
  return { kind: error instanceof TypeError ? 'unreachable' : 'unknown' };
}

type ClubActivityPreview = { id: number; title: string };
type ClubPostPreview = { id: number; content: string };

function profileActivities(value: readonly unknown[]): readonly ClubActivityPreview[] {
  return value.flatMap((row) => {
    const data = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
    return data && Number.isSafeInteger(data.id) && Number(data.id) > 0 && typeof data.title === 'string'
      ? [{ id: Number(data.id), title: data.title }]
      : [];
  });
}

function profilePosts(value: readonly unknown[]): readonly ClubPostPreview[] {
  return value.flatMap((row) => {
    const data = row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null;
    return data && Number.isSafeInteger(data.id) && Number(data.id) > 0 && typeof data.content === 'string'
      ? [{ id: Number(data.id), content: data.content }]
      : [];
  });
}

export function ClubDiscoveryScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const { pagination, dispatch } = useListPagination({ initial: { hasMore: true } });
  const [rows, setRows] = React.useState<readonly ClubSummary[]>([]);
  const page = React.useRef(0);
  const pending = React.useRef(false);

  const load = React.useCallback(async (mode: 'refresh' | 'append') => {
    if (pending.current || (mode === 'append' && !pagination.hasMore)) return;
    pending.current = true;
    const nextPage = mode === 'refresh' ? 1 : page.current + 1;
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const data = readClubPage(await listClubs({ page: nextPage, pageSize: 20 }));
      page.current = nextPage;
      setRows((current) => {
        if (mode === 'refresh') return data.rows;
        return [...new Map([...current, ...data.rows].map((row) => [row.id, row])).values()];
      });
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore: data.hasMore });
    } catch (error) {
      dispatch({ type: mode === 'refresh' ? 'refresh:failure' : 'append:failure', error: appError(error) });
    } finally {
      pending.current = false;
    }
  }, [dispatch, pagination.hasMore]);

  React.useEffect(() => {
    void load('refresh');
  }, [load]);

  return (
    <Screen titleKey="clubs.title" showMailbox={false} testID="clubs-screen">
      <ListScreen
        testID="club-list"
        data={rows}
        keyExtractor={(row) => String(row.id)}
        pagination={pagination}
        onRefresh={() => void load('refresh')}
        onEndReached={() => void load('append')}
        onRetryRefresh={() => void load('refresh')}
        onRetryAppend={() => void load('append')}
        labels={{
          retryLabel: t('action.retry'),
          endLabel: t('clubs.end'),
          empty: { kind: 'noResult', title: t('clubs.empty'), actionLabel: t('action.refresh'), onAction: () => void load('refresh') },
        }}
        renderItem={(club) => (
          <Button
            testID={`club-list-row-${club.id}`}
            label={`${club.name} · ${t('clubs.followers', { n: club.followers })}`}
            variant="secondary"
            fullWidth
            onPress={() => router.push(`/clubs/${club.id}` as never)}
          />
        )}
      />
    </Screen>
  );
}

export function ClubProfileScreen({ clubId }: { clubId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const id = asPositiveId(clubId);
  const [profile, setProfile] = React.useState<ClubProfile | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<{ kind: 'content' | 'permission' | 'unreachable' | 'unknown' } | null>(id === null ? { kind: 'content' } : null);
  const follow = useClubFollow({
    clubId: id ?? 0,
    following: profile?.basicInfo.viewer.following ?? false,
    followers: profile?.basicInfo.followers ?? 0,
  });

  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(readClubProfile(await getClubProfile(id)));
    } catch (cause) {
      setProfile(null);
      setError(appError(cause));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const backToDiscovery = (): void => router.replace('/clubs' as never);
  if (id === null) {
    return (
      <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-unavailable">
        <EmptyState kind="noResult" title={t('clubs.unavailable')} actionLabel={t('clubs.back')} onAction={backToDiscovery} />
        <Button testID="club-profile-back" label={t('clubs.back')} variant="link" onPress={backToDiscovery} />
      </Screen>
    );
  }
  if (loading) return <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-loading"><LoadingState /></Screen>;
  if (error || profile === null) {
    return (
      <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile-error">
        <ErrorState error={error ?? { kind: 'unknown' }} onAction={() => void load()} />
      </Screen>
    );
  }

  const { basicInfo, joinInfo, members } = profile;
  const activities = profileActivities(profile.activities);
  const posts = profilePosts(profile.posts);
  return (
    <Screen titleKey="clubs.title" showMailbox={false} testID="club-profile">
      <View style={{ gap: theme.space('space_3') }}>
        <Text role="title" emphasis="strong">{basicInfo.name}</Text>
        <Text role="body">{basicInfo.description}</Text>
        <Text testID="club-profile-followers" role="body">{t('clubs.followers', { n: follow.followers })}</Text>
        <Button
          testID="club-profile-follow"
          label={t(follow.following ? 'clubs.unfollow' : 'clubs.follow')}
          disabled={follow.state === 'working'}
          onPress={() => void follow.toggle()}
        />
        {joinInfo.contactText ? <Text role="body">{joinInfo.contactText}</Text> : null}
        <Text role="caption">{t('clubs.members', { n: members.length })}</Text>
        {activities.length > 0 ? <Text role="headline">{t('clubs.activities')}</Text> : null}
        {activities.map((activity) => (
          <Button key={activity.id} testID={`club-profile-activity-${activity.id}`} label={activity.title} variant="secondary" onPress={() => router.push(`/clubs/activity/${activity.id}` as never)} />
        ))}
        {posts.length > 0 ? <Text role="headline">{t('clubs.posts')}</Text> : null}
        {posts.map((post) => (
          <Button key={post.id} testID={`club-profile-post-${post.id}`} label={post.content} variant="secondary" onPress={() => router.push(`/clubs/post/${post.id}` as never)} />
        ))}
        {basicInfo.viewer.canManage ? (
          <Button testID="club-profile-manage" label={t('clubs.manage')} variant="secondary" onPress={() => router.push(`/clubs/${profile.id}/manage` as never)} />
        ) : null}
      </View>
    </Screen>
  );
}

function detailLabels(t: ReturnType<typeof useI18n>['t']) {
  return {
    back: t('action.back'),
    like: t('square.guides.like'),
    favorite: t('action.save'),
    comment: t('square.guides.comments'),
    report: t('square.guides.more'),
    countPlaceholder: '—',
    anonymous: t('screen.campus.read.anonymous'),
    comments: {
      anonymous: t('screen.campus.read.anonymous'), deleteLabel: t('square.guides.delete'), replyLabel: t('square.guides.reply'),
      likeLabel: t('square.guides.like'), moreReplies: (count: number) => String(count), collapse: t('square.guides.collapse'),
    },
    commentsEnd: t('clubs.end'), commentsRetry: t('action.retry'),
  };
}

function ClubDetailState({
  detail,
  loading,
  error,
  onRetry,
  onBack,
  testID,
}: {
  detail: ClubActivityDetail | ClubPostDetail | null;
  loading: boolean;
  error: ReturnType<typeof appError> | null;
  onRetry: () => void;
  onBack: () => void;
  testID: string;
}): React.ReactElement | null {
  const { t } = useI18n();
  return (
    <DetailScreen
      testID={testID}
      title={t('clubs.title')}
      author={{ kind: 'named', name: t('clubs.title') }}
      interactions={{}}
      onBack={onBack}
      onRetry={onRetry}
      state={loading ? 'loading' : error?.kind === 'content' ? 'empty' : 'error'}
      error={error}
      empty={{ kind: 'noResult', title: t('clubs.unavailable'), actionLabel: t('clubs.back'), onAction: onBack }}
      labels={detailLabels(t)}
    />
  );
}

export function ClubActivityDetailScreen({ activityId }: { activityId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const id = asPositiveId(activityId);
  const [detail, setDetail] = React.useState<ClubActivityDetail | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(id === null ? { kind: 'content' } : null);
  const registration = useClubActivityRegistration(id);
  const like = useClubLike({ targetType: 'activity', targetId: id ?? 0, liked: detail?.viewer.liked ?? false, count: detail?.stats.likes ?? 0 });
  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError(null);
    try { setDetail(readClubActivityDetail(await getActivityDetail(id))); }
    catch (cause) { setDetail(null); setError(appError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const back = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(detail ? `/clubs/${detail.clubId}` as never : '/clubs' as never);
  };
  if (detail === null) return <ClubDetailState detail={detail} loading={loading} error={error} onRetry={() => void load()} onBack={back} testID="club-activity-detail" />;
  const current = registration.snapshot ?? detail.registration;
  return (
    <DetailScreen
      testID="club-activity-detail"
      title={detail.title}
      author={{ kind: 'named', name: detail.clubName }}
      metaLabel={detail.time ?? undefined}
      onBack={back}
      onToggleLike={() => void like.toggle()}
      interactions={{ liked: like.liked, likeCount: like.count, commentCount: detail.stats.comments }}
      hero={detail.images.length > 0 ? <MediaGrid testID="club-activity-media" variant="hero" uris={detail.images} /> : undefined}
      body={<><Text role="body">{detail.summary}</Text><Button testID="club-activity-registration" label={`${t(current.registered ? 'clubs.cancelRegistration' : 'clubs.register')} · ${t('clubs.registrationCount', { n: current.count })}`} loading={registration.state === 'working'} onPress={() => void (current.registered ? registration.cancel() : registration.register())} /></>}
      labels={detailLabels(t)}
    />
  );
}

export function ClubPostDetailScreen({ postId }: { postId: string }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const id = asPositiveId(postId);
  const [detail, setDetail] = React.useState<ClubPostDetail | null>(null);
  const [loading, setLoading] = React.useState(id !== null);
  const [error, setError] = React.useState<ReturnType<typeof appError> | null>(id === null ? { kind: 'content' } : null);
  const like = useClubLike({ targetType: 'post', targetId: id ?? 0, liked: detail?.viewer.liked ?? false, count: detail?.stats.likes ?? 0 });
  const load = React.useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError(null);
    try { setDetail(readClubPostDetail(await getClubPostDetail(id))); }
    catch (cause) { setDetail(null); setError(appError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const back = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(detail ? `/clubs/${detail.clubId}` as never : '/clubs' as never);
  };
  if (detail === null) return <ClubDetailState detail={detail} loading={loading} error={error} onRetry={() => void load()} onBack={back} testID="club-post-detail" />;
  return (
    <DetailScreen
      testID="club-post-detail"
      title={detail.title}
      author={{ kind: 'named', name: detail.clubName }}
      metaLabel={detail.createdAt ?? undefined}
      onBack={back}
      onToggleLike={() => void like.toggle()}
      interactions={{ liked: like.liked, likeCount: like.count, commentCount: detail.stats.comments }}
      hero={detail.images.length > 0 ? <MediaGrid testID="club-post-media" variant="hero" uris={detail.images} /> : undefined}
      body={<Text role="body">{detail.content}</Text>}
      labels={detailLabels(t)}
    />
  );
}
