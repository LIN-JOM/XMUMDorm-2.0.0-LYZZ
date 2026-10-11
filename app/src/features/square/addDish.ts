import type { PickedImage } from '@/components/ui/MediaPicker';
import type { CanteenCategory } from './canteen';
export type DishContribution = { category_id: number; name: string; description: string; price: number | null; images: readonly PickedImage[] };
export type DishPreparation = { ok: true; value: DishContribution } | { ok: false; field: 'category_id' | 'name' | 'price' | 'images' };
export function prepareDish(values: Record<string, unknown>, categories: readonly CanteenCategory[]): DishPreparation {
  const id = typeof values.category_id === 'number' ? values.category_id : typeof values.category_id === 'string' ? Number(values.category_id) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0 || !categories.some((category) => category.id === id)) return { ok: false, field: 'category_id' };
  const name = typeof values.name === 'string' ? values.name.trim() : '';
  if (!name) return { ok: false, field: 'name' };
  const priceText = typeof values.price === 'string' ? values.price.trim() : typeof values.price === 'number' ? String(values.price) : '';
  if (priceText && (!/^\d+(\.\d{1,2})?$/.test(priceText) || !Number.isFinite(Number(priceText)))) return { ok: false, field: 'price' };
  if (!Array.isArray(values.images) || values.images.length > 5 || values.images.some((image) => !image || typeof image.uri !== 'string' || !image.uri.trim() ||
    image.sizeBytes != null && (!Number.isFinite(image.sizeBytes) || image.sizeBytes > 8 * 1024 * 1024) ||
    image.mimeType != null && !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType))) return { ok: false, field: 'images' };
  return { ok: true, value: { category_id: id, name, description: typeof values.description === 'string' ? values.description.trim() : '', price: priceText ? Number(priceText) : null, images: values.images } };
}
