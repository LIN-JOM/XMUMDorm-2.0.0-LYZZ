/**
 * P2C-04 · `M-04` 我的帖子 —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：profile 载荷 → 行（缺 id 丢掉）、正文摘要截断、去重合并、本地移除、图片 URL 归一化；
 * ⚠️ 页面用例已迁往 `p2c-07-me-content-panes.test.tsx`：C-05 拍板后这四个模块
 *    是**主页 pager 的分页**，`/me/posts` 子页面与 `PostsScreen` 一并删除，
 *    被测对象从"页面"变成了"pane"。本文件只留纯规则。
 *
 * 依据：`docs/app/task/phase-2/P2C-04-M04我的帖子.md`。
 */


import {
  imageUriOf,
  mergePostRows,
  normalizeProfilePosts,
  postExcerpt,
  removePostRow,
  type MyPostRow,
} from '@/features/me/posts';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn(), getProfile: jest.fn() }));
jest.mock('../../../shared/api/posts', () => ({ deletePost: jest.fn() }));

const api = {
  users: require('../../../shared/api/users') as { getMe: jest.Mock; getProfile: jest.Mock },
  posts: require('../../../shared/api/posts') as { deletePost: jest.Mock },
};

const PROFILE_PAYLOAD = {
  user: { id: 7, username: 'student7', nickname: '小明' },
  posts: [
    {
      id: 31,
      content: '第一条帖子',
      type: 'normal',
      created_at: '2026-10-06 10:00:00',
      like_count: 2,
      comment_count: 1,
      images: [{ url: 'posts/p31.png', sort_order: 0 }],
    },
    { content: '没有 id 的行' },
  ],
  stats: { post_count: 1, comment_received_count: 1, like_received_count: 2 },
  page: 1,
  pageSize: 20,
  hasMore: false,
};

const row = (over: Partial<MyPostRow> = {}): MyPostRow => ({
  id: 31,
  excerpt: '第一条帖子',
  likeCount: 2,
  commentCount: 1,
  imageUri: null,
  createdAt: '2026-10-06 10:00:00',
  type: 'normal',
  ...over,
});

beforeEach(() => {
  for (const mod of Object.values(api)) {
    for (const fn of Object.values(mod)) (fn as jest.Mock).mockReset();
  }
  api.users.getMe.mockResolvedValue({ id: 7 });
  api.users.getProfile.mockResolvedValue(PROFILE_PAYLOAD);
  api.posts.deletePost.mockResolvedValue({ status: 0 });
});

describe('P2C-04 M-04 我的帖子', () => {
  describe('TC-P2C-04-1A · 规范化：缺 id 的行丢掉，字段有兜底', () => {
    it('只保留有效行；hasMore 与 total 来自服务端', () => {
      const parsed = normalizeProfilePosts(PROFILE_PAYLOAD);
      expect(parsed.rows.map((item) => item.id)).toEqual([31]);
      expect(parsed.rows[0].likeCount).toBe(2);
      expect(parsed.hasMore).toBe(false);
      expect(parsed.total).toBe(1);
      expect(parsed.userId).toBe(7);
    });

    it('非对象 / 空载荷 → 空结果（⛔ 不抛）', () => {
      expect(normalizeProfilePosts(null).rows).toEqual([]);
      expect(normalizeProfilePosts('nope').rows).toEqual([]);
      expect(normalizeProfilePosts({ posts: 'nope' }).rows).toEqual([]);
    });

    it('正文摘要：折叠空白、超长截断、空正文走兜底词条', () => {
      expect(postExcerpt('a\n\nb', '没有正文')).toBe('a b');
      expect(postExcerpt('', '没有正文')).toBe('没有正文');
      expect(postExcerpt(null, '没有正文')).toBe('没有正文');
      expect(postExcerpt('x'.repeat(100), '没有正文').length).toBeLessThanOrEqual(61);
      expect(postExcerpt('x'.repeat(100), '没有正文').endsWith('…')).toBe(true);
    });

    it('图片 URL 归一化（相对 key 也要能显示）', () => {
      expect(String(imageUriOf('posts/p31.png'))).toContain('p31.png');
      expect(imageUriOf('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
      expect(imageUriOf('')).toBeNull();
    });
  });

  describe('TC-P2C-04-2A · 合并与本地移除', () => {
    it('追加时按 id 去重，保持服务端顺序', () => {
      const merged = mergePostRows([row({ id: 31 })], [row({ id: 31 }), row({ id: 30 })]);
      expect(merged.map((item) => item.id)).toEqual([31, 30]);
    });

    it('本地移除按 id（删帖后不等服务端那 10s 缓存）', () => {
      expect(removePostRow([row({ id: 31 }), row({ id: 30 })], 31).map((item) => item.id)).toEqual([30]);
      expect(removePostRow([row({ id: 31 })], 99)).toHaveLength(1);
    });
  });

});
