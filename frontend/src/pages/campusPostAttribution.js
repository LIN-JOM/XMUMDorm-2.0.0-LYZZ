export function buildCampusPostContent(content, originType, sourceNote = '') {
  const body = String(content || '').trim();
  if (originType !== 'repost') return `【原创】\n\n${body}`;

  const source = String(sourceNote || '').trim();
  if (!source) throw new Error('转载请填写来源');
  return `【转载】来源：${source}\n\n${body}`;
}
