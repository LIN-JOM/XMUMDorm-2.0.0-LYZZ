export type FoodArticle = { id: number; title: string; cover: string | null; author: string | null };
export type FoodArticlePage = { rows: readonly FoodArticle[]; hasMore: boolean };
export function normalizeFoodArticlePage(raw: unknown): FoodArticlePage | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { list?: unknown }).list)) return null;
  const data = raw as { list: unknown[]; hasMore?: unknown };
  const rows: FoodArticle[] = [];
  for (const value of data.list) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 ||
        typeof row.title_or_excerpt !== 'string' || !row.title_or_excerpt.trim()) continue;
    const author = row.author && typeof row.author === 'object' ? (row.author as { name?: unknown }).name : null;
    rows.push({ id: row.id, title: row.title_or_excerpt.trim(), cover: typeof row.cover_url === 'string' && row.cover_url.trim() ? row.cover_url : null, author: typeof author === 'string' && author.trim() ? author : null });
  }
  return { rows, hasMore: data.hasMore === true };
}
export function mergeFoodArticles(previous: readonly FoodArticle[], next: readonly FoodArticle[]): readonly FoodArticle[] {
  const merged = new Map(previous.map((row) => [row.id, row]));
  for (const row of next) merged.set(row.id, row);
  return [...merged.values()];
}
