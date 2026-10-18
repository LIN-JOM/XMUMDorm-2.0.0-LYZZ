let mockApiBase = 'https://api.example.test';
let shopImageUrl;
beforeAll(async () => {
  jest.unstable_mockModule('../../shared/api/config.js', () => ({
    DEFAULT_PRODUCT_IMAGE_PATH: '/products/default.png',
    getUploadUrl: value => `${mockApiBase}${value}`,
  }));
  ({ shopImageUrl } = await import('../../frontend/src/pages/Shop/shopImageUrl.js'));
});

describe('Web shop image origin regression', () => {
  beforeEach(() => { mockApiBase = 'https://api.example.test'; });
  test('backend product and QR assets resolve against API origin in split deployments', () => {
    for (const asset of ['/api/shop/assets/products/item.jpg', '/api/shop/assets/payment/1/qr.png', '/uploads/item.png']) {
      expect(shopImageUrl(asset)).toBe(`https://api.example.test${asset}`);
    }
  });
  test('same-origin local development keeps asset paths relative for Vite proxying', () => {
    mockApiBase = '';
    expect(shopImageUrl('/api/shop/assets/products/item.jpg')).toBe('/api/shop/assets/products/item.jpg');
  });
  test('public storage, blob previews and bundled images retain their existing origin', () => {
    for (const asset of ['https://cdn.example.test/item.png', 'blob:https://web.example.test/fixture', '/shop-demo/water.svg', '/products/default.png']) {
      expect(shopImageUrl(asset)).toBe(asset);
    }
  });
  test('missing images use the frontend bundled placeholder', () => {
    expect(shopImageUrl(null)).toBe('/products/default.png');
    expect(shopImageUrl('')).toBe('/products/default.png');
  });
});
