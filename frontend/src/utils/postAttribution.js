import { POST_REPOST_SOURCES, normalizePostRepostSource } from '@shared/constants/postAttribution';

export function buildPostAttribution(contentOrigin, source, customSource = '') {
  if (contentOrigin === 'original') return { contentOrigin, repostSource: null };
  if (contentOrigin !== 'repost' || (source !== 'custom' && !POST_REPOST_SOURCES.includes(source))) return null;
  const repostSource = normalizePostRepostSource(source === 'custom' ? customSource : source);
  return repostSource ? { contentOrigin, repostSource } : null;
}

export function postAttributionLabel(post, lang) {
  if (post.type === 'announcement') return '';
  if (post.content_origin === 'original') return lang === 'en' ? 'Original' : '原创';
  const source = normalizePostRepostSource(post.repost_source);
  return post.content_origin === 'repost' && source ? `${lang === 'en' ? 'Repost' : '转载'} · ${source}` : '';
}
