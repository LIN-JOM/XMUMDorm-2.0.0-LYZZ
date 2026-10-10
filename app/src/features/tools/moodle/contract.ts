/** Moodle 4.5-derived projection. Raw site compatibility remains a device gate. */
export type MoodleMethod = 'courses' | 'state' | 'events';

export type MoodleCourse = {
  id: number;
  name: string;
  shortName: string | null;
  url: string | null;
  /** Moodle timestamps remain Unix seconds; zero means an unset course date. */
  startDate: number | null;
  endDate: number | null;
  visible: boolean;
};

export type MoodleSection = {
  id: number;
  number: number;
  title: string;
  moduleIds: number[];
};

export type MoodleModule = {
  id: number;
  sectionId: number;
  type: string;
  name: string;
  url: string | null;
  visible: boolean;
  userVisible: boolean;
  accessVisible: boolean;
};

export type MoodleActionEvent = {
  id: number;
  courseId: number;
  moduleId: number | null;
  name: string;
  /** Unix seconds from timesort, not the device timezone or timestart. */
  time: number;
  url: string | null;
};

export type MoodleCoursesResponse = { courses: MoodleCourse[]; nextOffset: number };
export type MoodleStateResponse = { courseId: number; sections: MoodleSection[]; modules: MoodleModule[] };
export type MoodleEventsResponse = { events: MoodleActionEvent[]; firstId: number | null; lastId: number | null };
export type MoodleResponseMap = {
  courses: MoodleCoursesResponse;
  state: MoodleStateResponse;
  events: MoodleEventsResponse;
};
export type MoodleResponse = MoodleResponseMap[MoodleMethod];

export function parseMoodleResponse<M extends MoodleMethod>(method: M, data: unknown): MoodleResponseMap[M] | null;
/**
 * This function is also the page-side projection injected into WebView.
 * Keep every helper inside it and avoid syntax that Babel rewrites to imported helpers.
 * It returns new whitelist objects; it never forwards the raw response or credentials.
 */
export function parseMoodleResponse(method: MoodleMethod, data: unknown): MoodleResponse | null {
  function record(value: unknown): Record<string, unknown> | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  function integer(value: unknown, minimum: number): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : null;
  }

  function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }

  function enabled(value: unknown): boolean {
    return value === true || value === 1;
  }

  function safeUrl(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') return null;
    try {
      const url = new URL(value, 'https://l.xmu.edu.my/');
      if (url.origin !== 'https://l.xmu.edu.my' || url.username !== '' || url.password !== '') return null;
      const pairs = url.search.slice(1).split('&');
      const safe: string[] = [];
      for (let index = 0; index < pairs.length; index += 1) {
        const pair = pairs[index].split('=');
        const key = decodeURIComponent(pair[0]).toLowerCase();
        const allowed = key === 'id' || key === 'courseid' || key === 'cmid' || key === 'section'
          || key === 'sectionid' || key === 'page' || key === 'forcedownload';
        if (allowed && pair.length === 2 && /^\d+$/.test(pair[1])) safe.push(key + '=' + pair[1]);
      }
      url.search = safe.length === 0 ? '' : '?' + safe.join('&');
      url.hash = '';
      return url.href;
    } catch {
      return null;
    }
  }

  const raw = record(data);
  if (raw === null) return null;
  if (method === 'courses') {
    const offset = integer(raw.nextoffset, 0);
    if (!Array.isArray(raw.courses) || offset === null) return null;
    const courses: MoodleCourse[] = [];
    for (let index = 0; index < raw.courses.length; index += 1) {
      const item = record(raw.courses[index]);
      if (item === null || !enabled(item.visible)) continue;
      const id = integer(item.id, 1);
      const name = text(item.fullname);
      if (id === null || name === null) continue;
      courses.push({
        id: id,
        name: name,
        shortName: text(item.shortname),
        url: safeUrl(item.viewurl),
        startDate: integer(item.startdate, 0),
        endDate: integer(item.enddate, 0),
        visible: true,
      });
    }
    return { courses: courses, nextOffset: offset };
  }
  return null;
}
