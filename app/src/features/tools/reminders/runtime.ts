import { buildClassReminderPlan } from './plan';
import type { ClassReminder, ReminderSemester } from './plan';
import { normalizeTimetableWeek, safeTimetableWeekCount } from '../timetable';
import { parseYmd } from '../../../../../shared/config/semesters';

export { configureTimetableReminderRefresh } from './importRefresh';

/** Fetch every explicitly numbered week before replacing a complete semester plan. */
export async function loadSemesterClassReminderPlan(input: {
  semester: ReminderSemester;
  loadWeek: (week: number) => Promise<unknown>;
  now: Date;
  isCurrent: () => boolean;
}): Promise<readonly ClassReminder[]> {
  const { semester, now, loadWeek } = input;
  const start = parseYmd(semester.startDate);
  if (!start || new Date(start.ms).getUTCDay() !== 1 || !semester.id.trim()
    || safeTimetableWeekCount(semester.weeks) !== semester.weeks || !Number.isFinite(now.getTime())) {
    throw new TypeError('invalid reminder semester');
  }
  const weeks = [];
  for (let week = 1; week <= semester.weeks; week += 1) {
    if (!input.isCurrent()) throw new Error('stale reminder session');
    const raw = await loadWeek(week);
    if (!input.isCurrent()) throw new Error('stale reminder session');
    if (!raw || typeof raw !== 'object' || !('days' in raw) || !raw.days
      || typeof raw.days !== 'object' || Array.isArray(raw.days)) throw new Error(`invalid reminder week ${week}`);
    const data = normalizeTimetableWeek(raw);
    if (!data || data.week !== week) throw new Error(`invalid reminder week ${week}`);
    weeks.push(data);
  }
  return buildClassReminderPlan({ semester, weeks, now });
}
