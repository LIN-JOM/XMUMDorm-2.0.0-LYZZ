import { toTreeholePostViewModel } from '@/features/campus/treeholePostViewModel';

const base = { id: 7, content: '正文', author: { nickname: '小蓝' } };

describe('P2X Treehole post view model', () => {
  it('保留三图原始顺序，并忽略无效 URL', () => {
    expect(toTreeholePostViewModel({ ...base, images: [{ url: 'one' }, { url: '' }, { url: 'two' }, { url: 'three' }] }).mediaUrls)
      .toEqual(['one', 'two', 'three']);
  });

  it('把缺失展示字段转为安全空值，且不截断长文', () => {
    const content = '长'.repeat(5000);
    expect(toTreeholePostViewModel({ id: 8, content, like_count: -1, comment_count: 1.5 }).content).toBe(content);
    expect(toTreeholePostViewModel({ id: 8, content, like_count: -1, comment_count: 1.5 })).toMatchObject({
      authorName: null, avatarUrl: null, likeCount: null, commentCount: null, mediaUrls: [],
    });
  });

  it('兼容两种已有点赞字段', () => {
    expect(toTreeholePostViewModel({ ...base, user_liked: true }).liked).toBe(true);
    expect(toTreeholePostViewModel({ ...base, liked: true }).liked).toBe(true);
  });
});
