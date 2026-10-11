import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { listClubs, getClubProfile } from '../../../../shared/api/clubs';
import { readClubPage, readClubProfile, type ClubProfile, type ClubSummary } from './model';
import { useClubFollow } from './useClubFollow';

function asPositiveId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

function appError(error: unknown): { kind: 'content' | 'permission' | 'unreachable' | 'unknown' } {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) return { kind: 'content' };
  if (status === 401 || status === 403) return { kind: 'permission' };
  return { kind: error instanceof TypeError ? 'unreachable' : 'unknown' };
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
        {basicInfo.viewer.canManage ? (
          <Button testID="club-profile-manage" label={t('clubs.manage')} variant="secondary" onPress={() => router.push(`/clubs/${profile.id}/manage` as never)} />
        ) : null}
      </View>
    </Screen>
  );
}
