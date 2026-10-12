/**
 * S-09 Shop Menu, P2: shop identity above a vertical category filter and menu.
 * Categories change the existing products query; they do not create navigation.
 */
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import { Chip } from '@/components/ui/Chip';
import { EntityCard } from '@/components/ui/EntityCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ListScreen } from '@/components/ui/ListScreen';
import { RankingRow } from '@/components/ui/RankingRow';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { getProducts, getShop, getShopHotProducts } from '../../../../shared/api/canteen';
import { normalizeProducts, normalizeShopDetail, canteenCacheKey, CANTEEN_CACHE_TTL_MS, type CanteenProduct } from './canteen';
import { useCanteenResource } from './useCanteenResource';
import { normalizeRanked, type RankedProduct } from './canteenRankedProducts';
import { AddDishScreen, type AddDishLabels } from './AddDishScreen';
import { Button } from '@/components/ui/Button';
import type { PickResult } from '@/components/ui/MediaPicker';
import { CanteenMedia } from './CanteenMedia';

export function ShopMenu({ contribution }: { contribution?: { labels: AddDishLabels; pickImage?: () => Promise<PickResult> } } = {}): React.ReactElement {
  const badge = useMailboxBadge();
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const shopId = Number(params.id);
  const validId = Number.isSafeInteger(shopId) && shopId > 0;
  const [selection, setSelection] = React.useState<{ shopId: number; categoryId: number | null }>({ shopId, categoryId: null });
  const categoryId = selection.shopId === shopId ? selection.categoryId : null;
  const chooseCategory = (id: number | null) => setSelection({ shopId, categoryId: id });
  const shop = useCanteenResource(() => validId ? getShop(shopId) : Promise.resolve(null), normalizeShopDetail, [shopId, validId],
    { key: canteenCacheKey('shop', shopId), ttlMs: 60000 });
  const products = useCanteenResource(() => validId ? getProducts(shopId, categoryId === null ? {} : { category_id: categoryId }) : Promise.resolve([]),
    normalizeProducts, [shopId, validId, categoryId], { key: canteenCacheKey('products', `${shopId}:${categoryId ?? 'all'}`), ttlMs: 60000 });
  const hot = useCanteenResource<readonly RankedProduct[]>(() => validId ? getShopHotProducts(shopId) : Promise.resolve([]),
    normalizeRanked, [shopId, validId], { key: canteenCacheKey('shop-hot', shopId), ttlMs: CANTEEN_CACHE_TTL_MS.rankings });
  const categories = shop.data?.categories ?? [];
  const [addingFor, setAddingFor] = React.useState<number | null>(null);
  const openProduct = (id: number) => router.push({ pathname: '/canteen/product/[id]', params: { id: String(id) } });
  if (addingFor === shopId && contribution) return <AddDishScreen shopId={shopId} labels={contribution.labels} pickImage={contribution.pickImage} onCancel={() => setAddingFor(null)} onCreated={(id) => { setAddingFor(null); openProduct(id); }} />;
  return <Screen testID="screen-shop-menu" titleKey="canteen.menuTitle" bottomMode="own" {...badge}>
    <View style={{ flex: 1, minHeight: 0 }}>
      {shop.stale || products.stale || hot.stale ? <OfflineBanner testID="shop-stale" variant="stale" message={t('canteen.cache.stale')} actionLabel={t('action.refresh')} onAction={() => { shop.reload(); products.reload(); hot.reload(); }} /> : null}
      {shop.loading && shop.data === null ? <LoadingState testID="shop-loading" /> :
        shop.error && shop.data === null ? <ErrorState testID="shop-error" error={shop.error} onAction={shop.reload} /> :
        <>
          <View style={{ flexDirection: 'row', padding: theme.space('space_3'), gap: theme.space('space_3'), alignItems: 'center' }}>
            <CanteenMedia uri={shop.data?.logo ?? null} name={shop.data?.name ?? t('canteen.menuTitle')} testID="shop-logo" />
            <View style={{ flex: 1, minWidth: 0, gap: theme.space('space_1') }}>
              <Text role="title" emphasis="strong">{shop.data?.name ?? ''}</Text>
              {shop.data?.openingHours ? <Text role="caption" colorToken="text-muted">{shop.data.openingHours}</Text> : null}
            </View>
          </View>
          {contribution && categories.length ? <Button testID="shop-add-dish" label={t(contribution.labels.titleKey)} variant="secondary" onPress={() => setAddingFor(shopId)} /> : null}
          <View testID="shop-menu-columns" style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: theme.space('space_2') }}>
            <View style={{ flex: 1, minWidth: theme.touchTarget, maxWidth: '35%', backgroundColor: theme.color['bg-sunken'].value }}>
              <ScrollView testID="shop-categories" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: theme.space('space_2'), padding: theme.space('space_2') }}>
                <Chip testID="shop-category-all" label={t('canteen.allCategories')} variant="selectable" selected={categoryId === null} onPress={() => chooseCategory(null)} />
                {categories.map((category) => <Chip key={category.id} testID={`shop-category-${category.id}`} label={category.name} variant="selectable" selected={categoryId === category.id} onPress={() => chooseCategory(category.id)} />)}
              </ScrollView>
            </View>
            <View style={{ flex: 3, minWidth: 0 }}>
              <ListScreen<CanteenProduct> testID="shop-products" data={products.data ?? []} keyExtractor={(product) => String(product.id)}
                pagination={{ refresh: products.loading ? 'loading' : products.error ? 'error' : 'idle', append: 'idle', error: products.error, errorScope: products.error ? 'refresh' : null, hasMore: false }}
                onRefresh={products.reload} onEndReached={() => undefined}
                labels={{ empty: { kind: 'noResult', title: t('canteen.noDishes'), actionLabel: t('action.refresh'), onAction: products.reload } }}
                renderItem={(product) => <EntityCard testID={`shop-product-${product.id}`} domain="food" title={product.name} subtitle={product.categoryName ?? undefined}
                  badges={<CanteenMedia uri={product.images[0] ?? null} name={product.name} testID={`shop-product-media-${product.id}`} style={{ width: '100%', height: undefined, aspectRatio: 16 / 9 }} />}
                  metrics={[product.price === null ? t('canteen.valueNone') : t('canteen.priceValue', { price: product.price }), product.score === null ? t('canteen.scoreNone') : t('canteen.score', { score: product.score })]}
                  onPress={() => openProduct(product.id)} />}
                listHeader={<View style={{ gap: theme.space('space_2') }}>
                  {hot.loading && hot.data === null ? <LoadingState testID="shop-hot-loading" /> :
                    hot.error && hot.data === null ? <ErrorState testID="shop-hot-error" error={hot.error} onAction={hot.reload} /> :
                    hot.data?.length ? <><SectionHeader title={t('canteen.shopHot')} />
                      {hot.data.map((product) => <RankingRow key={product.id} testID={`shop-hot-${product.id}`} rank={product.rank} title={product.name}
                        metric={product.score === null ? t('canteen.scoreNone') : t('canteen.score', { score: product.score })}
                        onPress={() => openProduct(product.id)} />)}</> : null}
                  {products.data?.length ? <SectionHeader title={t('canteen.dishes')} /> : null}
                </View>} />
            </View>
          </View>
        </>}
    </View>
  </Screen>;
}
