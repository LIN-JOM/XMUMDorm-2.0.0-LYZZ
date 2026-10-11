import { parseMoodleResponse } from '@/features/tools/moodle/contract';
import { clearMoodleCache, moodleCacheGeneration, readMoodleCache, selectMoodleCourses, writeMoodleCache } from '@/features/tools/moodle/cache';
import { partitionMoodleDeadlines, planMoodleDeadlineReminders } from '@/features/tools/moodle/deadlines';

const now = Date.parse('2026-10-11T00:00:00Z');
const url = 'https://l.xmu.edu.my/mod/assign/view.php?id=101';
const state = { courseId: 1, sections: [{ id: 1, number: 1, title: 'Week one', moduleIds: [101] }],
  modules: [{ id: 101, sectionId: 1, type: 'assign', name: 'Assignment', url,
    visible: true, userVisible: true, accessVisible: true }] };
beforeEach(() => clearMoodleCache());

it('p3y3 projects official action fields through native memory cache without secrets', () => {
  const raw = { events: [{ id: 5, course: { id: 1 }, instance: 101, visible: 1,
    name: 'Deadline', timesort: now / 1000 + 86400, url,
    action: { name: 'Submit', itemcount: 2, actionable: false, sesskey: 'never-forward',
      credentials: 'never-forward', url: `${url}&sesskey=never-forward` } }], firstid: 5, lastid: 5 };
  const projected = parseMoodleResponse('events', raw)!;
  expect(projected.events[0].action).toEqual({ name: 'Submit', itemCount: 2, actionable: false });
  selectMoodleCourses([1]);
  const generation = moodleCacheGeneration();
  writeMoodleCache('courses', { courses: [{ id: 1, name: 'Course', visible: true }], nextOffset: 0 }, generation);
  writeMoodleCache('state', state, generation);
  writeMoodleCache('events', projected, generation);
  expect(readMoodleCache().events[0].action).toEqual({ name: 'Submit', itemCount: 2, actionable: false });
  expect(JSON.stringify(readMoodleCache())).not.toMatch(/sesskey|never-forward|credentials/);
  expect(parseMoodleResponse('events', projected)).toEqual(projected);
});

it('p3y3 reminds only explicit actionable events; false or unknown never become automatic reminders', () => {
  const base = { courseId: 1, moduleId: 101, name: 'Deadline', time: now / 1000 + 86400, url };
  const events = [{ ...base, id: 1, action: { name: 'Submit', itemCount: 1, actionable: true } },
    { ...base, id: 2, action: { name: 'Submit', itemCount: 1, actionable: false } }, { ...base, id: 3 }];
  const buckets = partitionMoodleDeadlines([state], events, now);
  expect(buckets.valid).toHaveLength(3);
  expect(planMoodleDeadlineReminders(buckets, now)).toEqual([{ id: 'moodle:1:1', fireAt: now + 86400000 - 1800000 }]);
});
