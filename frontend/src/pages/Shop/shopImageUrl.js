import { getUploadUrl, DEFAULT_PRODUCT_IMAGE_PATH } from '@shared/api/config';

// API assets belong to the backend; bundled demo/default images belong to Web.
export function shopImageUrl(value) {
  if (!value) return DEFAULT_PRODUCT_IMAGE_PATH;
  if (value.startsWith('/api/shop/assets/') || value.startsWith('/uploads/')) {
    return getUploadUrl(value);
  }
  return value;
}
