import { timetableIdentity } from '../cacheIdentity';
import { parseMoodleResponse, type MoodleMethod, type MoodleCourse, type MoodleStateResponse,
  type MoodleActionEvent } from './contract';

// Deliberately memory-only: a project JWT cannot identify the school account.
let generation = 0;
let projectEpoch: number | undefined;
let selected = new Set<number>();
const courses = new Map<number, MoodleCourse>();
const states = new Map<number, MoodleStateResponse>();
const events = new Map<number, MoodleActionEvent>();

function clearData(): void {
  generation += 1;
  courses.clear();
  states.clear();
  events.clear();
}

export function clearMoodleCache(): void { clearData(); selected.clear(); }

/** Start before offset zero; later pages append only within this generation. */
export function beginMoodleCourseSync(): number {
  moodleCacheGeneration();
  clearData();
  return generation;
}

/** The project epoch is only an invalidation signal, never a school-account partition. */
export function moodleCacheGeneration(): number {
  const epoch = timetableIdentity().epoch;
  if (projectEpoch !== epoch) { clearMoodleCache(); projectEpoch = epoch; }
  return generation;
}

export function selectMoodleCourses(ids: readonly number[]): void {
  moodleCacheGeneration();
  const next = new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0));
  if (next.size === selected.size && [...next].every((id) => selected.has(id))) return;
  selected = next;
  generation += 1;
  for (const id of courses.keys()) if (!selected.has(id)) courses.delete(id);
  for (const id of states.keys()) if (!selected.has(id)) states.delete(id);
  for (const [id, event] of events) if (!selected.has(event.courseId)) events.delete(id);
}

/** Append projected pages from the current scan, never merge two separate scans. */
export function writeMoodleCache(method: MoodleMethod, raw: unknown, expectedGeneration: number): boolean {
  if (expectedGeneration !== moodleCacheGeneration()) return false;
  if (method === 'courses') {
    const data = parseMoodleResponse('courses', raw);
    if (!data) return false;
    for (const course of data.courses) if (selected.has(course.id)) courses.set(course.id, course);
  } else if (method === 'state') {
    const data = parseMoodleResponse('state', raw);
    if (!data || !selected.has(data.courseId) || !courses.has(data.courseId)) return false;
    states.set(data.courseId, data);
  } else {
    const data = parseMoodleResponse('events', raw);
    if (!data) return false;
    for (const event of data.events) {
      if (selected.has(event.courseId) && courses.has(event.courseId)) events.set(event.id, event);
    }
  }
  return true;
}

/** Reprojection copies every nested object so callers cannot mutate stored data. */
export function readMoodleCache(): { generation: number; courses: MoodleCourse[];
  states: MoodleStateResponse[]; events: MoodleActionEvent[] } {
  const current = moodleCacheGeneration();
  return { generation: current,
    courses: parseMoodleResponse('courses', { courses: [...courses.values()], nextOffset: 0 })!.courses,
    states: [...states.values()].map((state) => parseMoodleResponse('state', state)!),
    events: parseMoodleResponse('events', { events: [...events.values()], firstId: null, lastId: null })!.events,
  };
}
