const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const storage = require('./objectStorage');

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

async function saveProductImage(file, merchantId) {
  let image;
  try {
    const input = sharp(file.buffer, { limitInputPixels: 16000000 });
    const metadata = await input.metadata();
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
    if (!expected || metadata.format !== expected) throw Error('format');
    image = await input.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 }).toBuffer();
  } catch {
    fail('请选择有效 JPG、PNG 或 WebP 图片 / Invalid product image');
  }
  const name = crypto.randomBytes(18).toString('hex') + '.webp';
  if (storage.isObjectStorageConfigured()) {
    const key = `shop/products/${merchantId}/${name}`;
    const url = storage.publicUrlForKey(key);
    if (!url || !url.startsWith('https://')) fail('商品图片存储未配置公开 HTTPS 地址 / Public HTTPS storage URL required', 503);
    await storage.uploadBuffer({ key, body: image, contentType: 'image/webp' });
    return url;
  }
  if (process.env.NODE_ENV === 'production' && !process.env.SHOP_ASSET_DIR) {
    fail('请配置商品图片持久化存储 / Persistent product image storage required', 503);
  }
  const dir = path.join(process.env.SHOP_ASSET_DIR || path.join(__dirname, '../.local/shop-assets'), 'products');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), image, { flag: 'wx' });
  return `/api/shop/assets/products/${name}`;
}

module.exports = { saveProductImage };
