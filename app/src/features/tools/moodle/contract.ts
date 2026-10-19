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
  /** Official course summary exporter `isfavourite`: pinned in the dashboard. */
  favourite: boolean;
  /** Official course summary exporter `progress`: percentage, null when not tracked. */
  progress: number | null;
};

export type MoodleSection = {
  id: number;
  number: number;
  title: string;
  moduleIds: number[];
  /** Official state `sectionurl`, same-origin filtered. */
  url: string | null;
  visible: boolean;
  /** Format's current-section flag. */
  current: boolean;
};

export type MoodleModuleCompletion = { state: number; complete: boolean };

export type MoodleModule = {
  id: number;
  sectionId: number;
  type: string;
  name: string;
  url: string | null;
  visible: boolean;
  userVisible: boolean;
  accessVisible: boolean;
  /** Official cm state `hascmrestrictions`. */
  restrictions: boolean;
  /** Official cm state `completionstate`/`isoverallcomplete`; null when not tracked. */
  completion: MoodleModuleCompletion | null;
};

export type MoodleActionEvent = {
  id: number;
  courseId: number;
  /** Moodle 4.5 AJAX exports cm.id here; URL association also checks school adaptation differences. */
  moduleId: number | null;
  name: string;
  /** Optional for older snapshots; values stay machine identifiers, never title-derived. */
  eventType?: string | null;
  action?: { name: string | null; itemCount: number | null; actionable: boolean | null };
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
 * ⚠️ 注入 WebView 的函数必须自包含：域名与 URL 白名单等字面量只能内联，不能改成模块常量。
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

  /** Official cm state completion pair; absent fields stay null instead of guessing false. */
  function completionOf(value: unknown): MoodleModuleCompletion | null {
    const item = record(value);
    if (item === null) return null;
    const state = integer(item.state, 0);
    return state === null ? null : { state: state, complete: item.complete === true };
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

  let decoded = data;
  if (method === 'state' && typeof decoded === 'string') {
    try { decoded = JSON.parse(decoded); } catch { return null; }
  }
  const raw = record(decoded);
  if (raw === null) return null;
  if (method === 'courses') {
    const standard = raw.nextOffset !== undefined;
    const offset = integer(standard ? raw.nextOffset : raw.nextoffset, 0);
    if (!Array.isArray(raw.courses) || offset === null) return null;
    const courses: MoodleCourse[] = [];
    for (let index = 0; index < raw.courses.length; index += 1) {
      const item = record(raw.courses[index]);
      if (item === null || !enabled(item.visible)) continue;
      const id = integer(item.id, 1);
      const name = text(standard ? item.name : item.fullname);
      if (id === null || name === null) continue;
      courses.push({
        id: id,
        name: name,
        shortName: text(standard ? item.shortName : item.shortname),
        url: safeUrl(standard ? item.url : item.viewurl),
        startDate: integer(standard ? item.startDate : item.startdate, 0),
        endDate: integer(standard ? item.endDate : item.enddate, 0),
        visible: true,
        favourite: standard ? enabled(item.favourite) : enabled(item.isfavourite),
        progress: standard ? integer(item.progress, 0)
          : enabled(item.hasprogress) ? integer(item.progress, 0) : null,
      });
    }
    return { courses: courses, nextOffset: offset };
  }
  if (method === 'state') {
    const standard = raw.courseId !== undefined;
    const course = record(raw.course);
    const courseId = standard ? integer(raw.courseId, 1) : course === null ? null : integer(course.id, 1);
    const rawSections = standard ? raw.sections : raw.section;
    const rawModules = standard ? raw.modules : raw.cm;
    if (courseId === null || !Array.isArray(rawSections) || !Array.isArray(rawModules)) return null;
    const sections: MoodleSection[] = [];
    const sectionsById: Record<string, MoodleSection> = {};
    for (let index = 0; index < rawSections.length; index += 1) {
      const item = record(rawSections[index]);
      if (item === null || (!standard && !enabled(item.visible))) continue;
      const id = integer(item.id, 1);
      const number = integer(item.number, 0);
      const title = text(item.title);
      const list = standard ? item.moduleIds : item.cmlist;
      if (id === null || number === null || title === null || !Array.isArray(list)) continue;
      if (sectionsById[String(id)]) continue;
      const moduleIds: number[] = [];
      for (let moduleIndex = 0; moduleIndex < list.length; moduleIndex += 1) {
        const moduleId = integer(list[moduleIndex], 1);
        if (moduleId !== null && moduleIds.indexOf(moduleId) < 0) moduleIds.push(moduleId);
      }
      const section = { id: id, number: number, title: title, moduleIds: moduleIds,
        url: safeUrl(standard ? item.url : item.sectionurl),
        visible: enabled(item.visible),
        current: item.current === true };
      sections.push(section);
      sectionsById[String(id)] = section;
    }
    const modules: MoodleModule[] = [];
    const modulesById: Record<string, MoodleModule> = {};
    for (let index = 0; index < rawModules.length; index += 1) {
      const item = record(rawModules[index]);
      if (item === null || !enabled(item.visible)) continue;
      const id = integer(item.id, 1);
      const sectionId = integer(standard ? item.sectionId : item.sectionid, 1);
      const type = text(standard ? item.type : item.module);
      const name = text(item.name);
      if (id === null || sectionId === null || type === null || name === null) continue;
      if (!/^[a-z][a-z0-9_]*$/.test(type) || modulesById[String(id)]) continue;
      const section = sectionsById[String(sectionId)];
      if (!section || section.moduleIds.indexOf(id) < 0) continue;
      const userVisible = enabled(standard ? item.userVisible : item.uservisible);
      const accessVisible = enabled(standard ? item.accessVisible : item.accessvisible);
      const module = {
        id: id, sectionId: sectionId, type: type, name: name,
        url: userVisible ? safeUrl(item.url) : null,
        visible: true, userVisible: userVisible, accessVisible: accessVisible,
        restrictions: standard ? enabled(item.restrictions) : enabled(item.hascmrestrictions),
        completion: standard ? completionOf(item.completion) : (() => {
          const state = integer(item.completionstate, 0);
          return state === null ? null : { state: state, complete: item.isoverallcomplete === true };
        })(),
      };
      modules.push(module);
      modulesById[String(id)] = module;
    }
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const retained: number[] = [];
      for (let moduleIndex = 0; moduleIndex < section.moduleIds.length; moduleIndex += 1) {
        const id = section.moduleIds[moduleIndex];
        const module = modulesById[String(id)];
        if (module && module.sectionId === section.id) retained.push(id);
      }
      section.moduleIds = retained;
    }
    return { courseId: courseId, sections: sections, modules: modules };
  }
  if (method === 'events') {
    if (!Array.isArray(raw.events)) return null;
    const standard = raw.lastId !== undefined;
    const first = standard ? raw.firstId : raw.firstid;
    const last = standard ? raw.lastId : raw.lastid;
    const firstId = first === null ? null : integer(first, 1);
    const lastId = last === null ? null : integer(last, 1);
    if ((firstId === null && first !== null) || (lastId === null && last !== null)) return null;
    const events: MoodleActionEvent[] = [];
    const seen: Record<string, boolean> = {};
    for (let index = 0; index < raw.events.length; index += 1) {
      const item = record(raw.events[index]);
      if (item === null || ((!standard || item.visible !== undefined) && !enabled(item.visible))) continue;
      const course = record(item.course);
      const courseId = standard ? integer(item.courseId, 1) : course === null ? null : integer(course.id, 1);
      const id = integer(item.id, 1);
      const name = text(item.name);
      const time = integer(standard ? item.time : item.timesort, 0);
      if (id === null || courseId === null || name === null || time === null || seen[String(id)]) continue;
      const action = record(item.action);
      const viewUrl = safeUrl(item.viewurl);
      const fallbackUrl = viewUrl !== null && viewUrl.indexOf('/calendar/') < 0 ? viewUrl : null;
      const event: MoodleActionEvent = { id: id, courseId: courseId, moduleId: integer(standard ? item.moduleId : item.instance, 1),
        name: name, time: time, url: standard ? safeUrl(item.url)
          : safeUrl(item.url) ?? safeUrl(action === null ? null : action.url) ?? fallbackUrl };
      const eventType = standard ? item.eventType : item.eventtype;
      if (eventType !== undefined) event.eventType = typeof eventType === 'string'
        && /^[a-z][a-z0-9_]{0,79}$/.test(eventType) ? eventType : null;
      if (action !== null) {
        const actionName = text(action.name);
        event.action = { name: actionName === null ? null : actionName.slice(0, 1000),
          itemCount: integer(standard ? action.itemCount : action.itemcount, 0),
          actionable: typeof action.actionable === 'boolean' ? action.actionable : null };
      }
      events.push(event);
      seen[String(id)] = true;
    }
    return { events: events, firstId: firstId, lastId: lastId };
  }
  return null;
}
