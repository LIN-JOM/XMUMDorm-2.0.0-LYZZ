/**
 * 我的帖子（`M-04`）—— 页面级组合（P2C-04）
 *
 * 形态依据：
 *   · **骨架**：`P2` 列表 → `K05 ListScreen`（四态与分页状态机只在骨架里）
 *   · **两步取数**：先 `/api/users/me` 拿自己的 `id`，再取该 id 的 profile（⛔ 不猜 id、⛔ 没有 `?mine` 这种接口）
 *   · **空态**用 `firstRun`（引导去发布），不是 `noResult`
 *
 * ⚠️ 两处如实登记：
 *   1. 行**不可点**：帖子详情（`C-02`）是丙的页面，App 里还没有这个路由 —— ⛔ 不跳到 404；
 *   2. 删帖成功后**本地先移除**：服务端 profile 有 10s 缓存，刷新可能又看到它（缺口，登记在案）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Trash from 'lucide-react-native/icons/trash';

import { AlertDialog } from '@/components/ui/AlertDialog';
import { EntityCard } from '@/components/ui/EntityCard';
import { IconButton } from '@/components/ui/IconButton';
import { ListScreen, useListPagination } from '@/components/ui/ListScreen';
import { Screen } from '@/components/ui/Screen';
import { TopTabStrip } from '@/components/ui/TopTabStrip';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { getMe, getProfile } from '../../../../shared/api/users';
import { deletePost } from '../../../../shared/api/posts';
import { getMyProductReviews } from '../../../../shared/api/canteen';
import { listMarketplaceMyItems } from '../../../../shared/api/marketplace';
import { listMyErrands } from '../../../../shared/api/errands';
import { toMailboxError } from '@/features/mailbox/conversations';
import { readMarketPage, type MarketItem } from '@/features/marketplace/model';
import { readErrandPage, type ErrandItem } from '@/features/errand/model';
import { readMyReviewPage, type MyReviewRow } from './content';
import {
  mergePostRows,
  normalizeProfilePosts,
  postExcerpt,
  removePostRow,
  type MyPostRow,
} from './posts';

const PAGE_SIZE = 20;
const SCOPE = { primaryTab: 'me', secondaryTab: 'posts' } as const;

type ContentKey = 'posts' | 'marketplace' | 'errands' | 'reviews';
type ContentRow = MarketItem | ErrandItem | MyReviewRow;

const CONTENT_TABS = [
  { key: 'posts', labelKey: 'me.content.posts' },
  { key: 'marketplace', labelKey: 'me.content.marketplace' },
  { key: 'errands', labelKey: 'me.content.errands' },
  { key: 'reviews', labelKey: 'me.content.reviews' },
] as const;

export function PostsScreen(): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();

  const [rows, setRows] = React.useState<readonly MyPostRow[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<ContentKey>('posts');
  const [pendingDelete, setPendingDelete] = React.useState<MyPostRow | null>(null);
  const myIdRef = React.useRef<number | null>(null);
  const pageRef = React.useRef(1);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: SCOPE,
  });

  const load = React.useCallback(
    async (mode: 'refresh' | 'append') => {
      dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
      try {
        if (myIdRef.current === null) {
          const me = await getMe();
          const id = Number((me as { id?: number } | null)?.id);
          if (!Number.isInteger(id) || id <= 0) throw { kind: 'unknown' };
          myIdRef.current = id;
        }
        const page = mode === 'refresh' ? 1 : pageRef.current + 1;
        const payload = await getProfile(myIdRef.current, { page, pageSize: PAGE_SIZE });
        const normalized = normalizeProfilePosts(payload);
        pageRef.current = page;
        setRows((previous) =>
          mode === 'refresh' ? normalized.rows : mergePostRows(previous, normalized.rows)
        );
        dispatch({
          type: mode === 'refresh' ? 'refresh:success' : 'append:success',
          // ⚠️ 用服务端给的 `hasMore`，⛔ 不用"条数 < pageSize"自己推
          hasMore: normalized.hasMore,
        });
      } catch (error) {
        dispatch({
          type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
          error: toMailboxError(error),
        });
      }
    },
    [dispatch]
  );

  React.useEffect(() => {
    void load('refresh');
  }, [load]);

  const confirmDelete = React.useCallback(async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target === null) return;
    // 本地先移除：服务端 profile 有 10s 缓存，等它过期会让用户以为"没删掉"
    setRows((previous) => removePostRow(previous, target.id));
    try {
      await deletePost(target.id);
    } catch {
      // 删失败就把列表拉回来（⛔ 不静默吞掉）
      await load('refresh');
    }
  }, [load, pendingDelete]);

  return (
    <Screen testID="screen-me-posts" titleKey="me.content.title" bottomMode="none">
      <TopTabStrip
        testID="me-content-tabs"
        tabs={CONTENT_TABS}
        selectedKey={selectedKey}
        onSelect={(key) => setSelectedKey(key as ContentKey)}
      />
      {selectedKey === 'posts' ? <View style={{ flex: 1 }}>
          <ListScreen
          testID="me-posts-list"
          data={rows}
          keyExtractor={(row) => String(row.id)}
          pagination={pagination}
          onRefresh={() => void load('refresh')}
          onEndReached={() => void load('append')}
          onRetryRefresh={() => void load('refresh')}
          onRetryAppend={() => void load('append')}
          restoredScrollOffset={restoredScrollOffset}
          onScrollOffset={persistScrollOffset}
          labels={{
            empty: {
              kind: 'firstRun',
              title: t('me.posts.empty.title'),
              description: t('me.posts.empty.description'),
              actionLabel: t('me.posts.empty.action'),
              onAction: () => router.push('/publish-center'),
            },
            errorActionLabel: t('action.retry'),
            retryLabel: t('action.retry'),
            endLabel: t('mailbox.conversations.end'),
          }}
          renderItem={(row) => (
            <View
              testID={`me-post-${row.id}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_1') }}
            >
              <View style={{ flex: 1 }}>
                {/* ⛔ 行不可点：帖子详情（C-02）是丙的页面，App 里还没有这个路由 */}
                <EntityCard
                  domain="post"
                  title={postExcerpt(row.excerpt, t('me.posts.noText'))}
                  subtitle={t('me.posts.meta', { likes: row.likeCount, comments: row.commentCount })}
                  mediaUri={row.imageUri ?? undefined}
                />
              </View>
              <IconButton
                testID={`me-post-delete-${row.id}`}
                Icon={Trash}
                accessibilityLabel={t('me.posts.delete')}
                onPress={() => setPendingDelete(row)}
              />
            </View>
          )}
          />
        </View> : <OwnedContentList key={selectedKey} kind={selectedKey} />}

      <AlertDialog
        testID="me-posts-delete-dialog"
        visible={pendingDelete !== null}
        variant="danger"
        title={t('me.posts.delete.title')}
        body={t('me.posts.delete.body')}
        confirmLabel={t('me.posts.delete.confirm')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </Screen>
  );
}

function OwnedContentList({ kind }: { kind: Exclude<ContentKey, 'posts'> }): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = React.useState<readonly ContentRow[]>([]);
  const pageRef = React.useRef(0);
  const { pagination, dispatch, restoredScrollOffset, persistScrollOffset } = useListPagination({
    scope: { primaryTab: 'me', secondaryTab: kind },
  });

  const load = React.useCallback(async (mode: 'refresh' | 'append') => {
    dispatch({ type: mode === 'refresh' ? 'refresh:start' : 'append:start' });
    try {
      const page = mode === 'refresh' ? 1 : pageRef.current + 1;
      let nextRows: readonly ContentRow[];
      let hasMore: boolean;
      if (kind === 'marketplace') {
        const result = readMarketPage(await listMarketplaceMyItems({ page, pageSize: PAGE_SIZE }));
        nextRows = result.rows;
        hasMore = result.hasMore;
      } else if (kind === 'errands') {
        const result = readErrandPage(await listMyErrands({ page, pageSize: PAGE_SIZE }));
        nextRows = result.rows;
        hasMore = result.hasMore;
      } else {
        const result = readMyReviewPage(await getMyProductReviews({ page, pageSize: PAGE_SIZE }));
        nextRows = result.rows;
        hasMore = result.hasMore;
      }
      pageRef.current = page;
      setRows((previous) => (mode === 'refresh' ? nextRows : mergeContentRows(previous, nextRows)));
      dispatch({ type: mode === 'refresh' ? 'refresh:success' : 'append:success', hasMore });
    } catch (error) {
      dispatch({
        type: mode === 'refresh' ? 'refresh:failure' : 'append:failure',
        error: toMailboxError(error),
      });
    }
  }, [dispatch, kind]);

  React.useEffect(() => {
    void load('refresh');
    return () => {
      pageRef.current = 0;
    };
  }, [load]);

  const emptyCopy = {
    marketplace: ['me.content.marketplace.empty.title', 'me.content.marketplace.empty.description'],
    errands: ['me.content.errands.empty.title', 'me.content.errands.empty.description'],
    reviews: ['me.content.reviews.empty.title', 'me.content.reviews.empty.description'],
  } as const;
  const [titleKey, descriptionKey] = emptyCopy[kind];

  return (
    <View style={{ flex: 1 }}>
      <ListScreen
        testID={`me-content-${kind}`}
        data={rows}
        keyExtractor={(row) => String(row.id)}
        pagination={pagination}
        onRefresh={() => void load('refresh')}
        onEndReached={() => void load('append')}
        onRetryRefresh={() => void load('refresh')}
        onRetryAppend={() => void load('append')}
        restoredScrollOffset={restoredScrollOffset}
        onScrollOffset={persistScrollOffset}
        labels={{
          empty: {
            kind: 'noResult',
            title: t(titleKey),
            description: t(descriptionKey),
            actionLabel: t('action.retry'),
            onAction: () => void load('refresh'),
          },
          errorActionLabel: t('action.retry'),
          retryLabel: t('action.retry'),
          endLabel: t('mailbox.conversations.end'),
        }}
        renderItem={(row) => renderOwnedContentCard(row, kind, t, router)}
      />
    </View>
  );
}

function mergeContentRows(previous: readonly ContentRow[], incoming: readonly ContentRow[]): ContentRow[] {
  const seen = new Set(previous.map((row) => row.id));
  const merged = [...previous];
  for (const row of incoming) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

function renderOwnedContentCard(
  row: ContentRow,
  kind: Exclude<ContentKey, 'posts'>,
  t: ReturnType<typeof useI18n>['t'],
  router: ReturnType<typeof useRouter>
): React.ReactElement {
  if (kind === 'marketplace') {
    const item = row as MarketItem;
    return (
      <EntityCard
        testID={`me-marketplace-${item.id}`}
        domain="listing"
        title={item.title}
        subtitle={item.description}
        mediaUri={item.cover}
        price={item.price}
        status={item.status}
        onPress={() => router.push(`/market/${item.id}` as never)}
      />
    );
  }
  if (kind === 'errands') {
    const item = row as ErrandItem;
    return (
      <EntityCard
        testID={`me-errand-${item.id}`}
        domain="errand"
        title={item.title}
        subtitle={item.location}
        reward={item.reward}
        status={item.status}
        onPress={() => router.push(`/errand/${item.id}` as never)}
      />
    );
  }
  const review = row as MyReviewRow;
  return (
    <EntityCard
      testID={`me-review-${review.id}`}
      domain="review"
      title={review.productName}
      subtitle={[review.shopName, review.rating, review.content].filter(Boolean).join(' · ')}
      mediaUri={review.imageUri}
      onPress={() => router.push(`/canteen/product/${review.productId}` as never)}
    />
  );
}
