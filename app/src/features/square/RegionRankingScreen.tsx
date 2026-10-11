import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ListScreen } from '@/components/ui/ListScreen';
import { RankingRow } from '@/components/ui/RankingRow';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { useI18n } from '@/i18n';
import { getRegionTopProducts } from '../../../../shared/api/canteen';
import { useCanteenResource } from './useCanteenResource';
import { normalizeRanked } from './RegionShops';
import { canteenCacheKey, CANTEEN_CACHE_TTL_MS } from './canteen';
import { CanteenMedia } from './CanteenMedia';

/** P2 full region ranking, also usable as a local second view before router integration. */
export function RegionRankingScreen({ regionId, onClose }: { regionId: number; onClose: () => void }): React.ReactElement {
  const router = useRouter();
  const { t } = useI18n();
  const badge = useMailboxBadge();
  const valid = Number.isSafeInteger(regionId) && regionId > 0;
  const ranking = useCanteenResource(() => valid ? getRegionTopProducts(regionId, { limit: 50 }) : Promise.resolve([]),
    normalizeRanked, [regionId, valid], { key: canteenCacheKey('region-ranking', regionId), ttlMs: CANTEEN_CACHE_TTL_MS.rankings });
  return <Screen titleKey="canteen.regionTop" bottomMode="own" {...badge}>
    <View style={{ flex: 1 }}>
      <Button testID="region-ranking-close" label={t('action.close')} variant="secondary" onPress={onClose} />
      {ranking.stale ? <OfflineBanner variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={ranking.reload} /> : null}
      <ListScreen testID="region-ranking-list" data={ranking.data ?? []} keyExtractor={(row) => String(row.id)}
        pagination={{ refresh: ranking.loading ? 'loading' : ranking.error ? 'error' : 'idle', append: 'idle', error: ranking.error, errorScope: ranking.error ? 'refresh' : null, hasMore: false }}
        onRefresh={ranking.reload} onEndReached={() => undefined}
        labels={{ empty: { kind: 'noResult', title: t('canteen.noDishes'), actionLabel: t('action.refresh'), onAction: ranking.reload } }}
        renderItem={(row) => <RankingRow testID={`region-ranking-product-${row.id}`} rank={row.rank} title={row.name} subtitle={row.shopName ?? undefined}
          leading={<CanteenMedia uri={row.images[0] ?? null} name={row.name} />}
          metric={row.score === null ? t('canteen.scoreNone') : t('canteen.score', { score: row.score })}
          onPress={() => router.push({ pathname: '/canteen/product/[id]', params: { id: String(row.id) } })} />} />
    </View>
  </Screen>;
}
