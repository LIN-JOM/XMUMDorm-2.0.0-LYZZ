import { readMyReviewPage } from '@/features/me/content';
import { readMarketPage } from '@/features/marketplace/model';
import { readErrandPage } from '@/features/errand/model';

describe('P3A4-08 personal content adapters', () => {
  it('normalizes canteen reviews without inventing missing fields', () => {
    const page = readMyReviewPage({
      list: [{ id: 3, product_id: 8, product_name: 'Noodles', shop_name: 'Food Square', rating: '顶级', content: 'Good', product_image: 'products/8.png', created_at: '2026-10-12' }],
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    expect(page).toEqual({
      hasMore: false,
      rows: [{ id: 3, productId: 8, productName: 'Noodles', shopName: 'Food Square', rating: '顶级', content: 'Good', imageUri: expect.stringContaining('products/8.png'), createdAt: '2026-10-12' }],
    });
  });

  it('drops malformed review rows and rejects malformed page shapes', () => {
    expect(readMyReviewPage({ list: [{ id: 0, product_id: 8, product_name: 'x', shop_name: 'y' }], hasMore: false }).rows).toEqual([]);
    expect(() => readMyReviewPage({ list: 'bad', hasMore: false })).toThrow('Invalid review page');
  });

  it('uses existing marketplace and errand server-owned readers for the new lists', () => {
    expect(readMarketPage({ list: [{ id: 1, title: 'Lamp', description: 'Used', price: 3, status: 'sold' }], hasMore: false }).rows[0].id).toBe(1);
    expect(readErrandPage({ page: 1, pageSize: 20, total: 1, list: [{ id: 2, title: 'Pick up', reward: 4, type: 'delivery', status: 'open', owner: { id: 7, username: 'me' } }] }).rows[0].id).toBe(2);
  });
});
