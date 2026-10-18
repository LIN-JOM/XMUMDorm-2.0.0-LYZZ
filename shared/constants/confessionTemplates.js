/**
 * 万能墙版式定义（Web 前端 ESM 版本）
 *
 * ⚠️ 与 constants/confessionTemplates.js（CommonJS，供后端校验使用）是**刻意的双胞胎**。
 * 后端是 CommonJS，无法 require() 本文件，因此按仓库既有惯例
 * （见 constants/levelThresholds.js ↔ shared/constants/levelConfig.js）维护两份。
 *
 * 一致性由 __tests__/shared/confessionTemplatesParity.test.js 守护：
 * 两边的 key 集合与 maxLength 必须完全一致，否则测试失败。
 *
 * 参见：docs/04-Module/M09-万能墙/Module09-万能墙模块设计.md §5
 */

/** 版式白名单。key 即 confessions.template_key 的取值范围 */
export const CONFESSION_TEMPLATES = [
  {
    key: 'bigtype',
    labelZh: '海报卡',
    labelEn: 'Poster',
    descZh: '短句主张，居中突出',
    descEn: 'A short statement with a bold centre',
    maxLength: 60,
  },
  {
    key: 'letter',
    labelZh: '档案卡',
    labelEn: 'Archive',
    descZh: '完整记录，适合长文',
    descEn: 'A complete record for longer writing',
    maxLength: 1000,
  },
  {
    key: 'note',
    labelZh: '便签卡',
    labelEn: 'Sticky Note',
    descZh: '寻人寻物，要点分行',
    descEn: 'Lines as items, for finding people or things',
    maxLength: 300,
  },
  {
    key: 'announcement',
    labelZh: '公告卡',
    labelEn: 'Announcement',
    descZh: '简短通知，信息明确',
    descEn: 'A concise notice with clear information',
    maxLength: 200,
  },
  {
    key: 'dialogue',
    labelZh: '对话卡',
    labelEn: 'Dialogue',
    descZh: '逐行对话，保留语气',
    descEn: 'Line-by-line dialogue that keeps the voice',
    maxLength: 500,
  },
  {
    key: 'checklist',
    labelZh: '清单卡',
    labelEn: 'Checklist',
    descZh: '逐行列项，便于核对',
    descEn: 'One item per line for quick checking',
    maxLength: 500,
  },
];

export const DEFAULT_CONFESSION_TEMPLATE = 'bigtype';

/** 版式 key 列表 */
export const CONFESSION_TEMPLATE_KEYS = CONFESSION_TEMPLATES.map((t) => t.key);

/** 未知或缺失时回落到默认版式，避免渲染拿到无法处理的 key */
export function normalizeTemplateKey(key) {
  return CONFESSION_TEMPLATE_KEYS.includes(key) ? key : DEFAULT_CONFESSION_TEMPLATE;
}

/** 取版式定义；未知 key 回落默认版式 */
export function getTemplate(key) {
  return CONFESSION_TEMPLATES.find((t) => t.key === key) || CONFESSION_TEMPLATES[0];
}

/** 该版式的正文字数上限 */
export function getTemplateMaxLength(key) {
  return getTemplate(key).maxLength;
}
