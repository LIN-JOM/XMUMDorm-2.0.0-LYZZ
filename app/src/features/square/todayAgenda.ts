/**
 * 广场「今日」页的数据规则（纯函数）—— 2026-10-18 所有者指令：
 * 「展示今天所有的课表，以及 Moodle 最近 3 条待交的作业，或者 DDL」。
 *
 * 三条纪律（⛔ 三条都别在本层偷懒）：
 *   1. **课表**只复用既有的 `useTimetableWeek` / `meetingsOf` / `todayWeekday`，不另造时区与周次逻辑；
 *   2. **Moodle** 只读本地缓存（`readMoodleCache`）+ 现成的 `partitionMoodleDeadlines`，
 *      ⛔ 不在这里发网络请求、⛔ 不重新判定"什么算 DDL"；
 *   3. **截止时间**按学校所在地（吉隆坡）判"今天 / 明天 / 其它"，⛔ 不用设备时区。
 */

import {
  KL_TIME_ZONE,
  kualaLumpurCalendarParts,
  ymdToDayNumber,
} from '../../../../shared/config/semesters';
import { meetingsOf } from '@/features/me/dashboard';
import { todayWeekday, type TimetableMeeting, type TimetableWeek } from '@/features/tools/timetable';
import { partitionMoodleDeadlines } from '@/features/tools/moodle/deadlines';
import type {
  MoodleActionEvent,
  MoodleCourse,
  MoodleStateResponse,
} from '@/features/tools/moodle/contract';

/** 今日课程：**全部**今天的课（按开始时间升序）；教学周外返回空。 */
export function agendaCourses(week: TimetableWeek | null, now: Date): TimetableMeeting[] {
  // 「今天」是否算教学日由服务端的 `currentWeek` 说了算：未开学/假期时它是 null。
  // 此时不能拿第 1 周的课表冒充"今天有课"（ToolsDashboard 的现有口径同此）。
  if (week === null || week.currentWeek === null) return [];
  return meetingsOf(week, todayWeekday(now));
}

export type AgendaDeadline = {
  /** 稳定 key（同一事件可能出现在多门课？不会，但保证列表 key 不撞） */
  key: string;
  courseId: number;
  /** 课程名（缓存里没有就空串，由 UI 只显示事件名） */
  courseName: string;
  /** 待交事项标题（模块名优先，其次事件名） */
  title: string;
  /** Unix 毫秒 */
  dueAt: number;
};

/**
 * Moodle 最近 N 条**待交**（未过期）事项。
 * 过期/异常时间/未选课程都由 `partitionMoodleDeadlines` 先切开，这里只做投影与截断。
 */
export function agendaDeadlines(
  states: readonly MoodleStateResponse[],
  events: readonly MoodleActionEvent[],
  courses: readonly MoodleCourse[],
  now: number,
  limit = 3
): AgendaDeadline[] {
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 3;
  const buckets = partitionMoodleDeadlines(states, events, now);
  const names = new Map(courses.map((course) => [course.id, course.name]));
  return buckets.valid.slice(0, safeLimit).map((deadline) => ({
    key: `${deadline.courseId}:${deadline.module.id}:${deadline.event.id}`,
    courseId: deadline.courseId,
    courseName: names.get(deadline.courseId) ?? '',
    // 模块名是学生看到的"作业名"；事件名是日历里的动作名，只作兜底
    title: deadline.module.name || deadline.event.name,
    dueAt: deadline.dueAt,
  }));
}

export type DeadlineWhen = {
  /** `today` / `tomorrow` / `later`（其余日期由 UI 用 `ymd` 的 MM-DD 显示） */
  kind: 'today' | 'tomorrow' | 'later';
  /** 吉隆坡时区的 `HH:mm` */
  clock: string;
  /** 吉隆坡时区的 `YYYY-MM-DD` */
  ymd: string;
};

function klClock(instant: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: KL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant));
}

/** 截止时间的展示口径（纯函数；非法时间返回 `null`，⛔ 不出现 NaN） */
export function deadlineWhen(now: number, dueAt: number): DeadlineWhen | null {
  if (!Number.isFinite(now) || !Number.isFinite(dueAt)) return null;
  const due = kualaLumpurCalendarParts(new Date(dueAt));
  const today = kualaLumpurCalendarParts(new Date(now));
  const diff = ymdToDayNumber(due.ymd) - ymdToDayNumber(today.ymd);
  const kind = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : 'later';
  return { kind, clock: klClock(dueAt), ymd: due.ymd };
}
