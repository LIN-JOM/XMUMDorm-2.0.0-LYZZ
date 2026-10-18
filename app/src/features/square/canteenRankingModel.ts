import type { MessageKey } from '@/i18n';
export type RankingCategory = 'hotProducts' | 'busyShops' | 'topShops' | 'newProducts' | 'activeUsers';
export type RankingTab = { key: RankingCategory; labelKey: MessageKey };
export type RankingRowData = {
  id: number; kind: 'product' | 'shop' | 'user'; name: string; rank: number;
  subtitle: string | null; score: number | null; count: number | null; image: string | null;
};
function text(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function number(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
export function normalizeRanking(category: RankingCategory, data: unknown): readonly RankingRowData[] {
  if (!Array.isArray(data)) return [];
  const kind = category === 'activeUsers' ? 'user' : category === 'busyShops' || category === 'topShops' ? 'shop' : 'product';
  const rows: RankingRowData[] = [];
  for (const [index, value] of data.entries()) {
    if (!value || typeof value !== 'object') continue;
    const raw = value as Record<string, unknown>;
    const id = number(raw[kind === 'product' ? 'product_id' : kind === 'shop' ? 'shop_id' : 'user_id']);
    const name = text(raw[kind === 'product' ? 'product_name' : kind === 'shop' ? 'shop_name' : 'nickname']) ?? (kind === 'user' ? text(raw.username) : null);
    if (id === null || !Number.isSafeInteger(id) || id <= 0 || name === null) continue;
    const rank = number(raw.rank);
    rows.push({ id, kind, name, rank: rank !== null && Number.isSafeInteger(rank) && rank > 0 ? rank : index + 1,
      subtitle: text(kind === 'product' ? raw.shop_name : kind === 'shop' ? raw.region_name : null),
      score: number(raw.comprehensive_score),
      count: number(category === 'busyShops' ? raw.weekly_review_count : category === 'activeUsers' ? raw.weekly_comment_count : raw.review_count),
      image: text(kind === 'product' ? raw.product_image : kind === 'user' ? raw.avatar : raw.logo) });
  }
  return rows.sort((a, b) => a.rank - b.rank);
}
