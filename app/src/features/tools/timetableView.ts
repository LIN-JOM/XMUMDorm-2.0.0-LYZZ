/**
 * 课表页的展示规则（纯函数）—— 2026-10-18 所有者重做要求：
 * 「同一门课程颜色可以一样，不同课程颜色可以不一样」「卡片必须显示上课地点与课程名称」。
 *
 * ## 课程色从哪来
 * 只取**语义令牌**（⛔ 不新增调色板、⛔ 不写 hex）：
 *   品牌蓝 / 美团黄 / 成功 / 警告 / 危险 的 soft 背景 + 对应文字色，外加一个下沉中性底。
 * 每一对都实测过正文对比度 ≥4.5:1（见批次文档 §2）。
 * ⚠️ 状态色在这里**只作课程身份色**，不表达任何状态语义。
 *
 * ## 颜色怎么分配
 * 按**本周出现的课程码升序**依次取色（模 6）：
 *   · 同一课程（同一 `courseCode`，不论时间/地点）→ 同色；
 *   · 不同课程 → 顺延不同色；本周 ≤6 门时**必不重复**；
 *   · 跨周课程集合不变 → 颜色稳定；集合变化允许位移（文档已注明，不假装全局稳定）。
 */

import type { DarkColorTokenName } from '@/design-system/tokens';
import type { TimetableMeeting, TimetableWeek } from './timetable';

export const VISIBLE_WEEKDAYS = [1, 2, 3, 4, 5] as const;

export type CourseAccent = {
  /** 卡片底色令牌 */
  fill: DarkColorTokenName;
  /** 卡片标题文字色令牌（与 `fill` 成对，已实测 ≥4.5:1） */
  text: DarkColorTokenName;
  /** 卡片次要文字色（地点）：soft 底用次要字，实心底只能用反白字 */
  secondary: DarkColorTokenName;
};

/** 6 个课程色（顺序即分配顺序；⛔ 改动要同时重跑对比度核验） */
export const COURSE_ACCENTS: readonly CourseAccent[] = [
  { fill: 'bg-brand-soft', text: 'text-brand', secondary: 'text-secondary' },
  { fill: 'bg-accent-soft', text: 'accent-text', secondary: 'text-secondary' },
  { fill: 'bg-success-soft', text: 'text-success', secondary: 'text-secondary' },
  { fill: 'bg-warning-soft', text: 'text-warning', secondary: 'text-secondary' },
  { fill: 'bg-danger-soft', text: 'text-danger', secondary: 'text-secondary' },
  // 第 6 色用**品牌实心**：soft 底只有 5 个，中性底又太像"无颜色"，实心蓝在小卡片上最易区分
  { fill: 'action-primary', text: 'text-on-fill', secondary: 'text-on-fill' },
];

/** 课程身份键：代码优先，没有代码时才退到名称（两侧去空白） */
export function courseKey(meeting: TimetableMeeting): string {
  return meeting.courseCode.trim() || (meeting.courseName ?? '').trim();
}

/** 本周「课程码 → 课程色」的唯一分配处（纯函数，可单测） */
export function courseAccentMap(week: TimetableWeek): ReadonlyMap<string, CourseAccent> {
  const keys = new Set<string>();
  for (const day of Object.keys(week.days)) {
    for (const meeting of week.days[Number(day)] ?? []) {
      const key = courseKey(meeting);
      if (key !== '') keys.add(key);
    }
  }
  return new Map(
    [...keys]
      .sort()
      .map((key, index) => [key, COURSE_ACCENTS[index % COURSE_ACCENTS.length]])
  );
}

/** 调色板兜底（无数据/空代码时不崩：永远给第一色） */
export const FALLBACK_COURSE_ACCENT: CourseAccent = COURSE_ACCENTS[0];

/** Filter display data only; the shared cached week retains all seven days. */
export function weekdayTimetableWeek(week: TimetableWeek): TimetableWeek {
  return { ...week, days: Object.fromEntries(VISIBLE_WEEKDAYS.map((day) => [day, week.days[day] ?? []])) };
}
