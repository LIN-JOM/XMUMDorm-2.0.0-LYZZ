import courses from './fixtures/moodle/courses.json';
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
