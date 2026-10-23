<<<<<<< HEAD
const POST_CONTENT_ORIGINS = Object.freeze(['original', 'repost']);
const POST_REPOST_SOURCES = Object.freeze(['WX', 'QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp']);
const POST_REPOST_SOURCE_MAX_LENGTH = 100;

function normalizePostRepostSource(value) {
=======
export const POST_CONTENT_ORIGINS = Object.freeze(['original', 'repost']);
export const POST_REPOST_SOURCES = Object.freeze(['WX', 'QQ', '抖音', 'INS', 'Telegram', 'X', 'Whatsapp']);
export const POST_REPOST_SOURCE_MAX_LENGTH = 100;

export function normalizePostRepostSource(value) {
>>>>>>> origin/main
  if (typeof value !== 'string') return null;
  const source = value.trim();
  return source && source.length <= POST_REPOST_SOURCE_MAX_LENGTH && !/[\u0000-\u001f\u007f<>]/u.test(source) ? source : null;
}
<<<<<<< HEAD

module.exports = { POST_CONTENT_ORIGINS, POST_REPOST_SOURCES, POST_REPOST_SOURCE_MAX_LENGTH, normalizePostRepostSource };
=======
>>>>>>> origin/main
