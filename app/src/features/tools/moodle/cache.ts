import AsyncStorage from '@react-native-async-storage/async-storage';
import { timetableIdentity } from '../cacheIdentity';
import { parseMoodleResponse, type MoodleMethod, type MoodleCourse, type MoodleStateResponse,
  type MoodleActionEvent } from './contract';

// Disk restoration requires a fresh, page-confirmed school account. A project JWT only invalidates.
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

const SNAPSHOT_PREFIX = '@dorm:moodle:v1:l.xmu.edu.my:';
let schoolUserId: number | null = null;
let lastSchoolUserId: number | null = null;
let storageEpoch = 0;
let storageQueue: Promise<void> = Promise.resolve();
const invalidationListeners = new Set<() => void>();
const dataListeners = new Set<() => void>();

function enqueue<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  const result = storageQueue.then(operation).catch(() => fallback);
  storageQueue = result.then(() => undefined);
  return result;
}
function notifyInvalidated() {
  for (const listener of invalidationListeners) { try { listener(); } catch { /* Privacy clearing still completes. */ } }
}
function notifyDataChanged() {
  for (const listener of dataListeners) { try { listener(); } catch { /* A stale view must not block the write. */ } }
}
export function subscribeMoodleInvalidation(listener: () => void): () => void {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
}
/** Data-channel listeners update views (today pane); they do not cancel in-flight reads. */
export function subscribeMoodleDataChanged(listener: () => void): () => void {
  dataListeners.add(listener);
  return () => { dataListeners.delete(listener); };
}
export function settleMoodleStorage(): Promise<void> { return storageQueue; }

/** Clear is synchronous in memory and serialized after every already-started disk operation. */
export function clearMoodleCache(): void {
  clearData(); selected.clear(); schoolUserId = null; lastSchoolUserId = null; storageEpoch += 1;
  void enqueue(async () => {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(SNAPSHOT_PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  }, undefined);
  notifyInvalidated();
  notifyDataChanged();
}

/** On opt-in startup, hide private memory while waiting for the current page proof. No disk is read. */
export function prepareMoodlePage(): void {
  clearData(); selected.clear(); schoolUserId = null;
}
export function confirmedMoodleSchoolIdentity(): number | null { moodleCacheGeneration(); return schoolUserId; }
export function confirmMoodleSchoolIdentity(userId: number): boolean {
  moodleCacheGeneration();
  if (!Number.isSafeInteger(userId) || userId <= 0) return false;
  if (lastSchoolUserId !== null && lastSchoolUserId !== userId) clearMoodleCache();
  schoolUserId = userId; lastSchoolUserId = userId;
  return true;
}

export function persistMoodleSnapshot(): Promise<boolean> {
  const data = readMoodleCache();
  const userId = schoolUserId, epoch = storageEpoch;
  if (userId === null) return Promise.resolve(false);
  const payload = JSON.stringify({ version: 1, userId, selectedIds: [...selected],
    courses: data.courses, states: data.states, events: data.events });
  return enqueue(async () => {
    if (epoch !== storageEpoch) return false;
    await AsyncStorage.setItem(`${SNAPSHOT_PREFIX}${userId}`, payload);
    return epoch === storageEpoch;
  }, false);
}

export function restoreMoodleSnapshot(): Promise<boolean> {
  const userId = confirmedMoodleSchoolIdentity(), epoch = storageEpoch, expectedGeneration = generation;
  if (userId === null) return Promise.resolve(false);
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(`${SNAPSHOT_PREFIX}${userId}`);
    if (!raw || raw.length > 2_000_000 || epoch !== storageEpoch || schoolUserId !== userId
      || expectedGeneration !== moodleCacheGeneration()) return false;
    let value: Record<string, unknown>;
    try { value = JSON.parse(raw) as Record<string, unknown>; } catch { return false; }
    if (!value || value.version !== 1 || value.userId !== userId || !Array.isArray(value.selectedIds)
      || !Array.isArray(value.states)) return false;
    const courseData = parseMoodleResponse('courses', { courses: value.courses, nextOffset: 0 });
    const eventData = parseMoodleResponse('events', { events: value.events, firstId: null, lastId: null });
    if (!courseData || !eventData) return false;
    const allowed = new Set(courseData.courses.map((course) => course.id));
    selectMoodleCourses(value.selectedIds.filter((id): id is number => typeof id === 'number' && allowed.has(id)));
    const current = moodleCacheGeneration();
    if (epoch !== storageEpoch || schoolUserId !== userId) return false;
    writeMoodleCache('courses', courseData, current);
    for (const state of value.states) writeMoodleCache('state', state, current);
    writeMoodleCache('events', eventData, current);
    return true;
  }, false);
}

/** Default Y0 behavior clears. Only a currently confirmed school account can preserve on close. */
export function closeMoodleCache(preserveSnapshotOnClose: boolean): boolean {
  if (preserveSnapshotOnClose && confirmedMoodleSchoolIdentity() !== null) {
    void persistMoodleSnapshot();
    prepareMoodlePage();
    return true;
  }
  clearMoodleCache();
  return false;
}

/** Start before offset zero; later pages append only within this generation. */
export function beginMoodleCourseSync(): number {
  moodleCacheGeneration();
  clearData();
  return generation;
}

/** The project epoch is only an invalidation signal, never a school-account partition. */
export function moodleCacheGeneration(): number {
  const epoch = timetableIdentity().epoch;
  if (projectEpoch === undefined) projectEpoch = epoch;
  else if (projectEpoch !== epoch) { projectEpoch = epoch; clearMoodleCache(); }
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
  notifyDataChanged();
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
  notifyDataChanged();
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
