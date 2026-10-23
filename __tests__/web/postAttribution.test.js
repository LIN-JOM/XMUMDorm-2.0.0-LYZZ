let buildPostAttribution;
let postAttributionLabel;

beforeAll(async () => {
  ({ buildPostAttribution, postAttributionLabel } = await import('../../frontend/src/utils/postAttribution.js'));
});

test.each(['WX', 'QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp'])('网页提交预设来源 %s', source => {
  expect(buildPostAttribution('repost', source, '不应提交')).toEqual({ contentOrigin: 'repost', repostSource: source });
});

test('自定义提交实际文字，原创清除残留来源', () => {
  expect(buildPostAttribution('repost', 'custom', '  学院群聊  ')).toEqual({ contentOrigin: 'repost', repostSource: '学院群聊' });
  expect(buildPostAttribution('original', 'custom', '学院群聊')).toEqual({ contentOrigin: 'original', repostSource: null });
  expect(buildPostAttribution('repost', 'custom', '来'.repeat(100)).repostSource).toHaveLength(100);
});

test.each(['', '   ', '来'.repeat(101), '<b>WX</b>', '群聊\n来源', '群聊\u0000来源'])('无效自定义来源不生成提交数据：%j', source => {
  expect(buildPostAttribution('repost', 'custom', source)).toBeNull();
});

test('伪造的声明或来源选项不能生成提交数据', () => {
  expect(buildPostAttribution('unknown', 'WX')).toBeNull();
  expect(buildPostAttribution('repost', 'unknown')).toBeNull();
});

test('旧帖和公告不伪造原创，双语详情保留来源全文', () => {
  expect(postAttributionLabel({}, 'zh')).toBe('');
  expect(postAttributionLabel({ type: 'announcement', content_origin: 'original' }, 'zh')).toBe('');
  expect(postAttributionLabel({ content_origin: 'original' }, 'zh')).toBe('原创');
  expect(postAttributionLabel({ content_origin: 'original' }, 'en')).toBe('Original');
  expect(postAttributionLabel({ content_origin: 'repost', repost_source: '学院群聊' }, 'zh')).toBe('转载 · 学院群聊');
  expect(postAttributionLabel({ content_origin: 'repost', repost_source: '来'.repeat(100) }, 'en')).toBe(`Repost · ${'来'.repeat(100)}`);
  expect(postAttributionLabel({ content_origin: 'repost', repost_source: '<b>WX</b>' }, 'zh')).toBe('');
});
