import { getUploadUrl } from '../../../../shared/api/config';

export type MyReviewRow = {
  id: number;
  productId: number;
  productName: string;
  shopName: string;
  rating: string | null;
  content: string;
  imageUri: string | null;
  createdAt: string | null;
};

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid review data');
  return value as Row;
}

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function imageUri(value: unknown): string | null {
  const path = text(value);
  return path === null ? null : getUploadUrl(path);
}

export function readMyReviewPage(value: unknown): { rows: readonly MyReviewRow[]; hasMore: boolean } {
  const page = record(value);
  if (!Array.isArray(page.list) || page.hasMore !== true && page.hasMore !== false) {
    throw new Error('Invalid review page');
  }
  const rows: MyReviewRow[] = [];
  for (const value of page.list) {
    const row = record(value);
    const id = positiveId(row.id);
    const productId = positiveId(row.product_id);
    const productName = text(row.product_name);
    const shopName = text(row.shop_name);
    if (id === null || productId === null || productName === null || shopName === null) continue;
    rows.push({
      id,
      productId,
      productName,
      shopName,
      rating: text(row.rating),
      content: text(row.content) ?? '',
      imageUri: imageUri(row.product_image),
      createdAt: text(row.created_at),
    });
  }
  return { rows, hasMore: page.hasMore === true };
}
