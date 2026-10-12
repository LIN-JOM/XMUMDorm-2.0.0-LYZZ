const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../middleware/auth', () => (req, res, next) => {
  if (req.get('x-test-auth') === 'none') return res.status(401).json({ status: -1, message: '需要登录' });
  req.user = { id: 7, role: 'student', username: 'me' };
  next();
});
jest.mock('../../middleware/checkSanction', () => ({ checkSanction: (_req, _res, next) => next() }));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../services/termsAcceptance', () => ({ requireCurrentTerms: (_req, _res, next) => next() }));
jest.mock('../../services/objectStorage', () => ({ uploadBuffer: jest.fn(), isObjectStorageConfigured: jest.fn(() => false) }));
jest.mock('../../services/imageProcessing', () => ({ prepareImageUpload: jest.fn() }));
jest.mock('../../services/notificationService', () => ({ createNotification: jest.fn() }));
jest.mock('../../utils/simpleCache', () => ({ simpleCache: { getOrSet: jest.fn(), delete: jest.fn() } }));

const { query } = require('../../database');
const marketplaceRoutes = require('../../routes/marketplace');
const errandsRoutes = require('../../routes/errands');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/marketplace', marketplaceRoutes);
  instance.use('/api/errands', errandsRoutes);
  instance.use((err, _req, res, _next) => res.status(500).json({ status: -1, message: err.message }));
  return instance;
}

describe('P3A4-08 personal content ownership reads', () => {
  beforeEach(() => query.mockReset());

  it('requires authentication for second-hand and errand ownership lists', async () => {
    const market = await supertest(app()).get('/api/marketplace/me/items').set('x-test-auth', 'none');
    const errand = await supertest(app()).get('/api/errands/me').set('x-test-auth', 'none');
    expect(market.status).toBe(401);
    expect(errand.status).toBe(401);
  });

  it('returns only the signed-in user’s marketplace items with server pagination', async () => {
    query.mockResolvedValueOnce([{
      id: 31,
      title: 'Keyboard',
      description: 'Used',
      price: 42,
      status: 'on_sale',
      delivery_method: 'pickup',
      dorm_area: 'LY1',
      tags_json: '["study"]',
      wants_count: 2,
      views_count: 5,
      created_at: '2026-10-12 10:00:00',
      category: 'electronics',
      sellerName: 'Me',
      sellerAvatar: null,
      cover_path: 'marketplace/items/31.png',
    }]);

    const res = await supertest(app()).get('/api/marketplace/me/items?page=2&pageSize=1');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 2, pageSize: 1, hasMore: false });
    expect(res.body.data.list[0]).toMatchObject({ id: 31, title: 'Keyboard', status: 'on_sale', tags: ['study'] });
    expect(query.mock.calls[0][0]).toMatch(/i\.seller_user_id\s*=\s*\?/);
    expect(query.mock.calls[0][0]).toMatch(/LIMIT 2 OFFSET 1/);
    expect(query.mock.calls[0][1]).toContain(7);
  });

  it('returns only the signed-in user’s errands with server pagination', async () => {
    query.mockResolvedValueOnce([{
      id: 41,
      title: 'Pick up parcel',
      reward: '6.50',
      deadline: null,
      location: 'LY1',
      type: 'delivery',
      status: 'open',
      created_at: '2026-10-12 11:00:00',
      owner_id: 7,
      owner_username: 'me',
      owner_nickname: 'Me',
      owner_avatar: null,
    }]).mockResolvedValueOnce([{ cnt: 1 }]);

    const res = await supertest(app()).get('/api/errands/me?page=1&pageSize=1');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 1, total: 1 });
    expect(res.body.data.list[0]).toMatchObject({ id: 41, reward: 6.5, owner: { id: 7, nickname: 'Me' } });
    expect(query.mock.calls[0][0]).toMatch(/e\.owner_user_id\s*=\s*\?/);
    expect(query.mock.calls[0][0]).toMatch(/LIMIT 2 OFFSET 0/);
    expect(query.mock.calls[0][1]).toEqual([7]);
    expect(query.mock.calls[1][1]).toEqual([7]);
  });
});
