import { buildClassReminderPlan } from '@/features/tools/reminders/plan';
import type { TimetableMeeting, TimetableWeek } from '@/features/tools/timetable';

const semester = { id: '2026-09', startDate: '2026-09-28', weeks: 14 };
function meeting(overrides: Partial<TimetableMeeting> = {}): TimetableMeeting {
  return { courseCode: 'CS101', courseName: 'Algorithms', credit: 3, lecturer: 'Private name',
    venue: 'Private room', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', ...overrides };
}
function week(meetings: TimetableMeeting[] = [meeting()], weekNumber = 2): TimetableWeek {
  return { week: weekNumber, days: { 1: meetings }, currentWeek: 2, totalWeeks: 14 };
}

it('plans school Monday at 09:00 as UTC 01:00 with a 30-minute lead', () => {
  expect(buildClassReminderPlan({ semester, weeks: [week()], now: new Date('2026-10-04T00:00:00Z') })).toEqual([
    { id: 'class:2026-09:CS101:2026-10-05:09%3A00%3A00', week: 2, dayOfWeek: 1,
      startsAt: '2026-10-05T01:00:00.000Z', fireAt: '2026-10-05T00:30:00.000Z' },
  ]);
});
