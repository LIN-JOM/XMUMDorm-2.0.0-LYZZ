import { normalizeProducts, type CanteenProduct } from './canteen';
/** 榜单接口返回的项带 `rank`（1 起）与 `shop_name`（见 `shared/api/canteen.js:19`） */
export type RankedProduct = CanteenProduct & { rank: number; shopName: string | null };

export function normalizeRanked(data: unknown): readonly RankedProduct[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((value, index): RankedProduct[] => {
    const product = normalizeProducts([value])[0];
    if (!product) return [];
    const raw = value as Record<string, unknown>;
    return [{ ...product, rank: typeof raw.rank === 'number' && Number.isSafeInteger(raw.rank) && raw.rank > 0 ? raw.rank : index + 1,
      shopName: typeof raw.shop_name === 'string' ? raw.shop_name : null }];
  }).sort((a, b) => a.rank - b.rank);
}
