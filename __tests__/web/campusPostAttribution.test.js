let buildCampusPostContent;

beforeAll(async () => {
  ({ buildCampusPostContent } = await import('../../frontend/src/pages/campusPostAttribution.js'));
});

test('原创投稿在正文前写入声明', () => {
  expect(buildCampusPostContent('  正文  ', 'original')).toBe('【原创】\n\n正文');
});

test('转载投稿在正文前写入来源', () => {
  expect(buildCampusPostContent('正文', 'repost', '  学院微信群  '))
    .toBe('【转载】来源：学院微信群\n\n正文');
});

test('转载来源不能为空', () => {
  expect(() => buildCampusPostContent('正文', 'repost', '   ')).toThrow('转载请填写来源');
});
