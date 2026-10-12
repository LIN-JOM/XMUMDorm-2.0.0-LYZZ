/**
 * `S-08` 区域店铺 / Shops in Area（父 `S-07`，原型 `P2`）
 *
 * 页面清单给的接口：`GET /canteen/regions/:id/shops`、`/regions/:id/ranking`
 *   ⚠️ 后者实际是 **`/regions/:regionId/top-products?limit=`**（README §7-2）。
 * 组件：`ListItem` `Card` `RankingRow`。
 *
 * 两个请求**并行**取：店铺列表 + 本区热销榜（`K05` 的列表只承载店铺列表，
 * 榜单是它上面的一节；⛔ 不把两个数据源塞进同一个 list data）。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { CanteenMedia } from './CanteenMedia';
import { RegionRankingScreen } from './RegionRankingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListItem } from '@/components/ui/ListItem';
import { ListScreen } from '@/components/ui/ListScreen';
import { LoadingState } from '@/components/ui/LoadingState';
import { RankingRow } from '@/components/ui/RankingRow';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getRegionTopProducts, getShopsByRegion } from '../../../../shared/api/canteen';
import { normalizeShops, type CanteenShop } from './canteen';
import { useCanteenResource } from './useCanteenResource';
import { canteenCacheKey, CANTEEN_CACHE_TTL_MS } from './canteen';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

import { normalizeRanked, type RankedProduct } from './canteenRankedProducts';

export function RegionShops(): React.ReactElement {
  const badge = useMailboxBadge();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();

  const [allRegion, setAllRegion] = React.useState<number | null>(null);
  const regionId = Number(params.id);
  const validId = Number.isInteger(regionId) && regionId > 0;

  // ⛔ 不因为在渲染期就调用：非法 id 直接给空态（`load` 里守卫）
  const shops = useCanteenResource(
    () => (validId ? getShopsByRegion(regionId) : Promise.resolve([])),
    normalizeShops,
    [regionId, validId],
    { key: canteenCacheKey('region-shops', regionId), ttlMs: 60000 }
  );
  const ranking = useCanteenResource(
    () => (validId ? getRegionTopProducts(regionId, { limit: 10 }) : Promise.resolve([])),
    normalizeRanked,
    [regionId, validId],
    { key: canteenCacheKey('region-top', regionId), ttlMs: CANTEEN_CACHE_TTL_MS.rankings }
  );

  if (allRegion === regionId) return <RegionRankingScreen regionId={regionId} onClose={() => setAllRegion(null)} />;
  return (
    <Screen
      {...badge}
      testID="screen-region-shops"
      titleKey="canteen.shopsTitle"
      bottomMode="own"
    >
      <View style={{ flex: 1 }}>
        {shops.stale || ranking.stale ? <OfflineBanner testID="region-stale" variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={() => { shops.reload(); ranking.reload(); }} /> : null}
        {shops.loading && shops.data === null ? (
          <LoadingState testID="region-shops-loading" />
        ) : shops.error !== null && shops.data === null ? (
          <ErrorState testID="region-shops-error" error={shops.error} onAction={shops.reload} />
        ) : (
          <ListScreen<CanteenShop>
            testID="region-shops-list"
            data={shops.data ?? []}
            keyExtractor={(shop) => String(shop.id)}
            renderItem={(shop) => (
              <ListItem
                testID={`region-shop-${shop.id}`}
                title={shop.name}
                leading={<CanteenMedia uri={shop.logo} name={shop.name} testID={`region-shop-media-${shop.id}`} />}
                // ⚠️ `opening_hours` 可能整个没有（服务端会回落到不含它的查询）→ 有才显示
                subtitle={shop.openingHours ?? shop.regionName ?? undefined}
                variant="nav"
                onPress={() =>
                  router.push({ pathname: '/canteen/shop/[id]', params: { id: String(shop.id) } })
                }
              />
            )}
            pagination={{
              refresh: 'idle',
              append: 'idle',
              error: null,
              errorScope: null,
              hasMore: false,
            }}
            onRefresh={shops.reload}
            onEndReached={() => undefined}
            labels={{
              empty: {
                kind: 'noResult',
                title: t('canteen.noShops'),
                actionLabel: t('action.refresh'),
                onAction: shops.reload,
              },
              endLabel: undefined,
            }}
            numColumns={1}
            listHeader={
              (
                <View style={{ gap: theme.space('space_2'), paddingBottom: theme.space('space_3') }}>
                  <SectionHeader title={t('canteen.regionTop')} />
                  {ranking.loading && ranking.data === null ? <LoadingState testID="region-ranking-loading" /> : ranking.error && ranking.data === null ? <ErrorState testID="region-ranking-error" error={ranking.error} onAction={ranking.reload} /> : null}
                  <Button testID="region-ranking-all" label={t('canteen.allCategories')} variant="secondary" disabled={!validId} onPress={() => setAllRegion(regionId)} />
                  {(ranking.data ?? []).map((product) => (
                    <RankingRow
                      key={product.id}
                      testID={`region-top-${product.id}`}
                      rank={product.rank}
                      title={product.name}
                      leading={<CanteenMedia uri={product.images[0] ?? null} name={product.name} />}
                      subtitle={product.shopName ?? undefined}
                      // ⚠️ 分数可能为 `null`（G17）→ 用占位而不是 0
                      metric={
                        product.score === null
                          ? t('canteen.scoreNone')
                          : t('canteen.score', { score: product.score })
                      }
                      onPress={() =>
                        router.push({
                          pathname: '/canteen/product/[id]',
                          params: { id: String(product.id) },
                        })
                      }
                    />
                  ))}
                </View>
              )
            }
          />
        )}
      </View>
    </Screen>
  );
}

export { normalizeRanked };
export type { RankedProduct };
