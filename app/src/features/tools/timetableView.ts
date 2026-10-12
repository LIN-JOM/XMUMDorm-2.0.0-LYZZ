import type { TimetableMeeting, TimetableWeek } from './timetable';

export const VISIBLE_WEEKDAYS = [1, 2, 3, 4, 5] as const;
export type CourseAccent = 'bg-brand-soft' | 'bg-accent-soft';

export function courseAccent(meeting: TimetableMeeting): CourseAccent {
  const identity = (meeting.courseCode.trim() || meeting.courseName?.trim() || '').toUpperCase();
  let hash = 0;
  for (const char of identity) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 2 === 0 ? 'bg-brand-soft' : 'bg-accent-soft';
}

/** Filter display data only; the shared cached week retains all seven days. */
export function weekdayTimetableWeek(week: TimetableWeek): TimetableWeek {
  return { ...week, days: Object.fromEntries(VISIBLE_WEEKDAYS.map((day) => [day, week.days[day] ?? []])) };
}
