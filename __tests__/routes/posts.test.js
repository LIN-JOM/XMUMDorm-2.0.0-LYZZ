const express = require('express');
const supertest = require('supertest');

jest.mock('../../database', () => ({ query: jest.fn() }));
jest.mock('../../services/termsAcceptance', () => ({ requireCurrentTerms: (_req, _res, next) => next() }));
const mockAuthenticateToken = jest.fn((req, _res, next) => {
  req.user = { id: 9, role: 'student' };
  next();
});
jest.mock('../../middleware/auth', () => mockAuthenticateToken);
jest.mock('../../middleware/checkSanction', () => ({
  checkSanction: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/sensitiveWordFilter', () => (_req, _res, next) => next());
jest.mock('../../middleware/upload', () => ({
  postImagesUpload: (_req, _res, next) => next(),
  savePostImages: jest.fn(),
}));
jest.mock('../../services/auditLog', () => ({
  logAudit: jest.fn(),
}));
jest.mock('../../utils/simpleCache', () => ({
  simpleCache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getOrSet: jest.fn(),
  },
}));
jest.mock('../../services/expService', () => ({
  grantExp: jest.fn().mockResolvedValue(null),
  revokeByRef: jest.fn().mockResolvedValue(null),
  checkAndGrantPostPopularRewards: jest.fn().mockResolvedValue(undefined),
  formatAuthorLevel: jest.fn(() => ({})),
}));
jest.mock('../../utils/expResponse', () => ({
  attachExp: jest.fn((payload) => payload),
}));
jest.mock('../../utils/expEligibility', () => ({
  isPostContentEligible: jest.fn(() => false),
  isCommentEligible: jest.fn(() => false),
}));
jest.mock('../../utils/assets', () => ({
  assetUrl: jest.fn((value) => (value ? `https://cdn.test/${value}` : null)),
}));

const { query } = require('../../database');
const { revokeByRef, grantExp, checkAndGrantPostPopularRewards } = require('../../services/expService');
const postsRoutes = require('../../routes/posts');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/posts', postsRoutes);
  a.use((err, _req, res, _next) => {
    if (!res.headersSent) {
      res.status(500).json({ status: -1, message: err.message || 'Internal error' });
    }
  });
  return a;
}

describe('Posts Routes', () => {
  beforeEach(() => {
    query.mockReset();
    mockAuthenticateToken.mockReset();
    mockAuthenticateToken.mockImplementation((req, _res, next) => {
      req.user = { id: 9, role: 'student' };
      next();
    });
    revokeByRef.mockClear();
    grantExp.mockClear();
    checkAndGrantPostPopularRewards.mockClear();
  });

  describe('POST /api/posts', () => {
    function acceptPost(metadata) {
      query.mockImplementation(async (sql) => {
        if (sql.startsWith('INSERT INTO posts')) return { insertId: 44 };
        if (sql.includes('p.content')) return [{
          id: 44, user_id: 9, title: '标题', content: '正文', type: 'normal', ...metadata,
        }];
        if (sql.includes('SELECT p.id')) return [{ id: 44 }];
        return [];
      });
    }

    it.each(['WX', 'QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp'])('persists %s and returns it from create, list and detail without changing the body', async (source) => {
      const metadata = { content_origin: 'repost', repost_source: source };
      acceptPost(metadata);
      const created = await supertest(app()).post('/api/posts').send({ title: '标题', content: '正文', ...metadata });
      expect(created.status).toBe(200);
      expect(created.body.data).toMatchObject({ content: '正文', ...metadata });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('content_origin, repost_source'), [9, '标题', '正文', 'normal', 'repost', source]
      );
      const list = await supertest(app()).get('/api/posts');
      expect(list.body.data.list[0]).toMatchObject(metadata);
      const detail = await supertest(app()).get('/api/posts/44');
      expect(detail.body.data).toMatchObject(metadata);
      for (const [sql] of query.mock.calls.filter(([sql]) => sql.includes('p.content'))) {
        expect(sql).toContain('p.content_origin');
        expect(sql).toContain('p.repost_source');
      }
    });

    it.each([
      ['  学院群聊  ', '学院群聊'],
      ['来'.repeat(100), '来'.repeat(100)],
    ])('normalizes a simple custom source before writing: %s', async (input, expected) => {
      acceptPost({ content_origin: 'repost', repost_source: expected });
      const res = await supertest(app()).post('/api/posts').send({ title: '标题', content: '正文', content_origin: 'repost', repost_source: input });
      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('content_origin, repost_source'), [9, '标题', '正文', 'normal', 'repost', expected]
      );
      expect(res.body.data.repost_source).toBe(expected);
    });

    it.each([
      [{ content_origin: 'original', repost_source: 'WX' }, 'original'],
      [{}, null],
    ])('keeps original sources empty and legacy declarations unknown: %j', async (input, origin) => {
      acceptPost({ content_origin: origin, repost_source: null });
      const res = await supertest(app()).post('/api/posts').send({ title: '标题', content: '正文', ...input });
      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('content_origin, repost_source'), [9, '标题', '正文', 'normal', origin, null]
      );
    });

    it.each([
      { content_origin: 'repost' },
      { content_origin: 'repost', repost_source: '   ' },
      { content_origin: 'repost', repost_source: ['WX'] },
      { content_origin: 'repost', repost_source: 123 },
      { content_origin: 'repost', repost_source: { text: 'WX' } },
      { content_origin: 'repost', repost_source: '来'.repeat(101) },
      { content_origin: 'repost', repost_source: '<b>WX</b>' },
      { content_origin: 'repost', repost_source: '群聊\n来源' },
      { content_origin: 'repost', repost_source: '群聊\u0000来源' },
      { content_origin: 'unknown', repost_source: 'WX' },
      { repost_source: 'WX' },
    ])('rejects invalid declaration metadata before inserting: %j', async (metadata) => {
      const res = await supertest(app()).post('/api/posts').send({ title: '标题', content: '正文', ...metadata });
      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });

    it('rejects announcement creation by non-admin users', async () => {
      const res = await supertest(app())
        .post('/api/posts')
        .send({ title: 'Notice', content: 'Campus update', type: 'announcement' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('仅管理员可发公告');
      expect(query).not.toHaveBeenCalled();
    });

    it('returns a migration hint when posts.title is missing', async () => {
      query.mockRejectedValueOnce({
        code: 'ER_BAD_FIELD_ERROR',
        sqlMessage: "Unknown column 'title' in 'field list'",
      });

      const res = await supertest(app())
        .post('/api/posts')
        .send({ title: 'Hello', content: 'Body', type: 'normal' });

      expect(res.status).toBe(503);
      expect(res.body.message).toContain('posts.title');
    });
  });

  describe('post topics', () => {
    it('lets a signed-in student create a bilingual topic and refreshes the topic cache', async () => {
      query.mockResolvedValueOnce([]).mockResolvedValueOnce({ insertId: 41 });

      const res = await supertest(app())
        .post('/api/posts/tags')
        .send({ name_zh: '自习', name_en: 'Study' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: 41, slug: 'study', name_zh: '自习', name_en: 'Study' });
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO tags (slug, name_zh, name_en, created_by) VALUES (?, ?, ?, ?)',
        ['study', '自习', 'Study', 9]
      );
      const { simpleCache } = require('../../utils/simpleCache');
      expect(simpleCache.delete).toHaveBeenCalledWith('posts:tags:v1');
    });

    it('searches topics remotely with parameterized query values', async () => {
      query.mockResolvedValueOnce([{ id: 7, slug: 'study', name_zh: '自习', name_en: 'Study' }]);

      const res = await supertest(app()).get('/api/posts/tags?q=study&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: 7, slug: 'study', name_zh: '自习', name_en: 'Study' }]);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name_zh LIKE ? OR name_en LIKE ? OR slug LIKE ?'),
        ['%study%', '%study%', '%study%']
      );
      expect(query.mock.calls[0][0]).toContain('LIMIT 5');
    });

    it('keeps anonymous requests and malformed bilingual names rejected', async () => {
      mockAuthenticateToken.mockImplementationOnce((_req, res) => res.status(401).json({ status: -1, message: '未登录' }));
      const anonymous = await supertest(app()).post('/api/posts/tags').send({ name_zh: '自习', name_en: 'Study' });
      expect(anonymous.status).toBe(401);

      const malformed = await supertest(app()).post('/api/posts/tags').send({ name_zh: '只有中文' });
      expect(malformed.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('toggles off an existing like and revokes exp', async () => {
      query
        .mockResolvedValueOnce([{ id: 44, user_id: 11 }])
        .mockResolvedValueOnce({ affectedRows: 1 });

      const res = await supertest(app()).post('/api/posts/44/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 44, liked: false });
      expect(query).toHaveBeenCalledWith('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [9, 44]);
      expect(revokeByRef).toHaveBeenCalledWith(9, {
        action: 'like',
        refType: 'treehole_post',
        refId: 44,
      });
      expect(grantExp).not.toHaveBeenCalled();
    });

    it('creates a like, grants exp, and notifies the author', async () => {
      query
        .mockResolvedValueOnce([{ id: 88, user_id: 12 }])
        .mockResolvedValueOnce({ affectedRows: 0 })
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({ insertId: 2 });

      const res = await supertest(app()).post('/api/posts/88/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 88, liked: true });
      expect(query).toHaveBeenCalledWith('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [9, 88]);
      expect(grantExp).toHaveBeenCalledWith(9, {
        action: 'like',
        refType: 'treehole_post',
        refId: 88,
      });
      expect(checkAndGrantPostPopularRewards).toHaveBeenCalledWith('treehole', 88, 12);
      expect(query).toHaveBeenCalledWith(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [12, 'treehole_like', 88, 9]
      );
    });

    it('treats duplicate-like races as an idempotent liked response', async () => {
      query
        .mockResolvedValueOnce([{ id: 66, user_id: 12 }])
        .mockResolvedValueOnce({ affectedRows: 0 })
        .mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const res = await supertest(app()).post('/api/posts/66/like').send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ post_id: 66, liked: true });
      expect(grantExp).not.toHaveBeenCalled();
      expect(checkAndGrantPostPopularRewards).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalledWith(
        'INSERT INTO notifications (user_id, type, post_id, from_user_id) VALUES (?, ?, ?, ?)',
        [12, 'treehole_like', 66, 9]
      );
    });
  });

  describe('GET /api/posts', () => {
    // 回归：分页曾经直接 LIMIT 在 `posts LEFT JOIN post_images` 的结果上，
    // 于是 LIMIT/OFFSET 切的是「帖子×图片」的行 → 每页只回一半帖子、
    // 且多图帖会跨页重复（page1 末尾与 page2 开头是同一帖）。
    function idRows(count, startId = 200) {
      return Array.from({ length: count }, (_, i) => ({ id: startId - i }));
    }

    function detailRows(ids) {
      return ids.map((id, index) => ({
        id,
        user_id: 7,
        title: null,
        content: `post ${id}`,
        type: 'normal',
        deleted_at: null,
        hidden_by_admin: 0,
        created_at: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
        updated_at: null,
        author_id: 7,
        author_username: 'u7',
        author_nickname: 'U7',
        author_avatar: null,
        author_level: 1,
        author_badge: null,
        image_path: `posts/post_${id}_1.jpg`,
        sort_order: 0,
        like_count: 0,
        comment_count: 0,
        user_liked: 0,
      }));
    }

    it('把 LIMIT/OFFSET 作用在帖子上，不在图片 join 之后分页', async () => {
      query
        .mockResolvedValueOnce(idRows(11))
        .mockResolvedValueOnce(detailRows([200, 199, 198, 197, 196, 195, 194, 193, 192, 191]));

      const res = await supertest(app()).get('/api/posts?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(10);
      expect(res.body.data.hasMore).toBe(true);

      const pageSql = query.mock.calls[0][0];
      expect(pageSql).toMatch(/FROM posts p/);
      expect(pageSql).not.toMatch(/post_images/);
      expect(pageSql).toMatch(/LIMIT 11 OFFSET 0/);
    });

    it('详情查询只取本页 id，页内不出现重复帖子', async () => {
      query
        .mockResolvedValueOnce(idRows(3))
        .mockResolvedValueOnce(detailRows([200, 199, 198]));

      const res = await supertest(app()).get('/api/posts?page=2&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.data.hasMore).toBe(false);

      const [pageSql, pageParams] = query.mock.calls[0];
      expect(pageParams).toEqual([]);
      expect(pageSql).toMatch(/LIMIT 11 OFFSET 10/);

      const [detailSql, detailParams] = query.mock.calls[1];
      expect(detailSql).toMatch(/p\.id IN \(\?, \?, \?\)/);
      expect(detailParams.slice(1)).toEqual([200, 199, 198]);

      const ids = res.body.data.list.map((p) => p.id);
      expect(ids).toEqual([200, 199, 198]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('聚合同一帖的多张图片，且按 sort_order 排序', async () => {
      query
        .mockResolvedValueOnce(idRows(1))
        .mockResolvedValueOnce([
          { ...detailRows([200])[0], image_path: 'posts/post_200_2.jpg', sort_order: 1 },
          { ...detailRows([200])[0], image_path: 'posts/post_200_1.jpg', sort_order: 0 },
        ]);

      const res = await supertest(app()).get('/api/posts?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.list[0].images).toEqual([
        { url: 'https://cdn.test/posts/post_200_1.jpg', sort_order: 0 },
        { url: 'https://cdn.test/posts/post_200_2.jpg', sort_order: 1 },
      ]);
    });
  });
});
