import { createPost } from '../../shared/api/posts';
import { request } from '../../shared/api/request';

jest.mock('../../shared/api/request', () => ({ request: jest.fn() }));

it('sends a WX repost as separate multipart fields', () => {
  createPost({ title: '标题', content: '正文', contentOrigin: 'repost', repostSource: 'WX' });
  const form = request.mock.calls[0][1].body;
  expect(form.get('content_origin')).toBe('repost');
  expect(form.get('repost_source')).toBe('WX');
  expect(form.get('content')).toBe('正文');
});

it('does not send a stale repost source for originals', () => {
  createPost({ content: '正文', contentOrigin: 'original', repostSource: 'WX' });
  const form = request.mock.calls[0][1].body;
  expect(form.get('content_origin')).toBe('original');
  expect(form.has('repost_source')).toBe(false);
});

it('keeps old clients without an attribution field', () => {
  createPost({ content: '正文' });
  const form = request.mock.calls[0][1].body;
  expect(form.has('content_origin')).toBe(false);
  expect(form.has('repost_source')).toBe(false);
});

it.each(['QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp', '学院群聊'])('sends %s without changing the content or adding UI-only fields', (source) => {
  createPost({ content: '正文', contentOrigin: 'repost', repostSource: source, customRepostSource: '不应传送' });
  const form = request.mock.calls[0][1].body;
  expect(form.get('repost_source')).toBe(source);
  expect(form.get('content')).toBe('正文');
  expect(form.has('customRepostSource')).toBe(false);
});
