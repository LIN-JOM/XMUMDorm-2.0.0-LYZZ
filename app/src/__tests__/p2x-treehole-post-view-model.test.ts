import { toTreeholePostViewModel } from '@/features/campus/treeholePostViewModel';

const base = { id: 7, content: '正文', author: { nickname: '小蓝' } };

describe('P2X Treehole post view model', () => {
  it('投影 WX 转载，原创忽略残留来源', () => {
    expect(toTreeholePostViewModel({ ...base, content_origin: 'repost', repost_source: 'WX' })).toMatchObject({ contentOrigin: 'repost', repostSource: 'WX' });
    expect(toTreeholePostViewModel({ ...base, content_origin: 'original', repost_source: 'WX' })).toMatchObject({ contentOrigin: 'original', repostSource: null });
  });
  it('保留规范化的自定义来源和长度上限', () => {
    expect(toTreeholePostViewModel({ ...base, content_origin: 'repost', repost_source: '  学院群聊  ' })).toMatchObject({ contentOrigin: 'repost', repostSource: '学院群聊' });
    expect(toTreeholePostViewModel({ ...base, content_origin: 'repost', repost_source: '来'.repeat(100) })).toMatchObject({ contentOrigin: 'repost', repostSource: '来'.repeat(100) });
  });

  it.each([
    {},
    { content_origin: null },
    { content_origin: 'unknown', repost_source: 'WX' },
    { content_origin: 'repost', repost_source: '' },
    { content_origin: 'repost', repost_source: '<script>bad</script>' },
    { content_origin: 'repost', repost_source: '来'.repeat(101) },
    { content_origin: 'repost', repost_source: '学院\n群聊' },
  ])('历史与不合法声明不被推断为原创：%j', metadata => {
    expect(toTreeholePostViewModel({ ...base, ...metadata })).toMatchObject({ contentOrigin: null, repostSource: null });
  });

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

  it('只投影服务端的有效等级、徽章和前三个标签', () => {
    const post = toTreeholePostViewModel({
      ...base,
      author: { id: 9, nickname: '小蓝', level: 3, badge: 'contributor' },
      tags: [
        { id: 1, slug: 'study', name_zh: '自习', name_en: 'Study' },
        { id: 2, slug: 'help', name_zh: '求助' },
        { id: 3, slug: 'lost', name_en: 'Lost' },
        { id: 4, slug: 'ignored', name_zh: '不显示' },
        { id: 5, slug: '', name_zh: '无效' },
      ],
    });

    expect(post).toMatchObject({ authorId: 9, authorLevel: 3, authorBadge: 'contributor' });
    expect(post.tags).toEqual([
      { id: 1, slug: 'study', nameZh: '自习', nameEn: 'Study' },
      { id: 2, slug: 'help', nameZh: '求助', nameEn: null },
      { id: 3, slug: 'lost', nameZh: null, nameEn: 'Lost' },
    ]);
  });

  it('省略不可信的作者等级与标签', () => {
    const post = toTreeholePostViewModel({
      ...base,
      author: { id: 0, level: 7, badge: '' },
      tags: [{ id: 1, slug: 'valid-but-unlabelled' }, { id: 0, slug: 'invalid-id', name_zh: '无效' }],
    });

    expect(post).toMatchObject({ authorId: null, authorLevel: null, authorBadge: null, tags: [] });
  });
});
