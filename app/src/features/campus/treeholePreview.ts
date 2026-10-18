/**
 * 树洞正文的**折叠判定**（纯函数，可测）
 *
 * 为什么单独一层：P0-4 的缺陷是"截断用 8 行、展开用 240 字"两把尺子互不相干，
 * 于是 200 汉字的帖子被截断却**没有**展开入口（内容被静默丢弃）。
 * 这里只保留**一把尺子**：内容宽度单位 > 8 行容量 → 才允许截断，且必然同时给"阅读全文"。
 *
 * 宽度单位是**近似值**（中文/全角按 2、其余按 1），只用来判断"是否超过 8 行"这个二值问题；
 * ⛔ 不用它做精确排版。大字号（≥2）一律不截断（设计文档的密度纪律）。
 */

/** 一行的宽度单位容量（14sp 字阶、正文列宽下约 22 个汉字） */
export const TREEHOLE_LINE_UNITS = 44;

/** 预览行数 */
export const TREEHOLE_PREVIEW_LINES = 8;

/** 8 行正文的宽度单位容量 */
export const TREEHOLE_PREVIEW_UNITS = TREEHOLE_LINE_UNITS * TREEHOLE_PREVIEW_LINES;

const WIDE_CHAR = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uff60\uffe0-\uffe6]/;

/** 字序宽度单位：中文/全角 2，其余 1 */
export function treeholeTextUnits(content: string): number {
  let units = 0;
  for (const char of content) {
    units += WIDE_CHAR.test(char) ? 2 : 1;
  }
  return units;
}

/**
 * 是否**必须**折叠（决定要不要给"阅读全文"）：
 * - 大字号（≥2）→ 不折叠（内容完整优先）；
 * - 否则按字号线性收缩容量：字号越大，一行装的字越少，越早给入口。
 */
export function treeholeCanExpand(content: string, fontScale: number): boolean {
  const safeScale = Number.isFinite(fontScale) && fontScale > 1 ? fontScale : 1;
  if (safeScale >= 2) return false;
  return treeholeTextUnits(content) > TREEHOLE_PREVIEW_UNITS / safeScale;
}

/** 传给 `Text` 的 `numberOfLines`（undefined = 不截断）。
 * ⚠️ 只有 `treeholeCanExpand === true` 时才可能返回 8 —— 因此**不存在**
 * "截断了却没有阅读全文入口"的组合（这条由 `treeholePreview.test` 守着）。
 */
export function treeholePreviewLines(
  content: string,
  fontScale: number,
  expanded: boolean
): number | undefined {
  if (expanded) return undefined;
  return treeholeCanExpand(content, fontScale) ? TREEHOLE_PREVIEW_LINES : undefined;
}
