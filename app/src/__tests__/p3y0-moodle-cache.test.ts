import courses from './fixtures/moodle/courses.json';
import state from './fixtures/moodle/state.json';
import events from './fixtures/moodle/events.json';
import { clearSchoolSession } from '@/features/tools/schoolSession';
import { clearMoodleCache, moodleCacheGeneration, readMoodleCache, selectMoodleCourses, writeMoodleCache } from '@/features/tools/moodle/cache';

beforeEach(() => { clearMoodleCache(); });

it('clears selected school data and refuses an in-flight response after clearing Moodle', async () => {
  selectMoodleCourses([42]);
  const generation = moodleCacheGeneration();
  expect(writeMoodleCache('courses', courses, generation)).toBe(true);
  expect(readMoodleCache().courses.map((course) => course.id)).toEqual([42]);
  await clearSchoolSession('moodle');
  expect(writeMoodleCache('courses', courses, generation)).toBe(false);
  expect(readMoodleCache().courses).toEqual([]);
});

it('keeps only selected visible courses and copies nested fields on reads and writes', () => {
  selectMoodleCourses([42]);
  const generation = moodleCacheGeneration();
  const input = JSON.parse(JSON.stringify(courses));
  expect(writeMoodleCache('courses', input, generation)).toBe(true);
  input.courses[0].fullname = 'changed';
  expect(writeMoodleCache('state', JSON.stringify(state), generation)).toBe(true);
  expect(writeMoodleCache('events', events, generation)).toBe(true);
  expect(writeMoodleCache('state', { ...state, course: { id: 43 } }, generation)).toBe(false);
  const snapshot = readMoodleCache();
  expect(snapshot.courses.map((course) => course.id)).toEqual([42]);
  expect(snapshot.events.map((event) => event.id)).toEqual([501]);
  expect(JSON.stringify(snapshot)).not.toMatch(/fixture-only|sesskey|description|password/);
  snapshot.courses[0].name = 'mutated';
  snapshot.states[0].sections[0].moduleIds.length = 0;
  expect(readMoodleCache().courses[0].name).toBe('Algorithms');
  expect(readMoodleCache().states[0].sections[0].moduleIds).toEqual([100, 101, 102, 106]);
});

it('prunes deselected course objects immediately and rejects the old selection generation', () => {
  selectMoodleCourses([42, 43]);
  const generation = moodleCacheGeneration();
  writeMoodleCache('courses', courses, generation);
  writeMoodleCache('state', state, generation);
  writeMoodleCache('events', events, generation);
  selectMoodleCourses([43]);
  expect(readMoodleCache()).toMatchObject({ courses: [{ id: 43 }], states: [], events: [{ id: 502 }] });
  expect(writeMoodleCache('courses', courses, generation)).toBe(false);
});

it('preserves Moodle data when AC observation state is cleared', async () => {
  selectMoodleCourses([42]);
  const generation = moodleCacheGeneration();
  writeMoodleCache('courses', courses, generation);
  await clearSchoolSession('ac');
  expect(moodleCacheGeneration()).toBe(generation);
  expect(readMoodleCache().courses).toHaveLength(1);
});
