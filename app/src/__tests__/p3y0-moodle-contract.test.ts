import coursesFixture from './fixtures/moodle/courses.json';
import stateFixture from './fixtures/moodle/state.json';
import eventsFixture from './fixtures/moodle/events.json';
import { parseMoodleResponse, type MoodleMethod } from '@/features/tools/moodle/contract';

describe('Moodle response projection', () => {
  it('keeps the returned course cursor and only approved visible course fields', () => {
    expect(parseMoodleResponse('courses', coursesFixture)).toEqual({
      courses: [
        {
          id: 42, name: 'Algorithms', shortName: 'CS101',
          url: 'https://l.xmu.edu.my/course/view.php?id=42',
          startDate: 1791158400, endDate: 1806883200, visible: true,
        },
        {
          id: 43, name: 'Discrete Mathematics', shortName: 'MA101', url: null,
          startDate: 1791158400, endDate: 0, visible: true,
        },
      ],
      nextOffset: 25,
    });
  });

  it('decodes the official state JSON string and takes machine type from module', () => {
    expect(parseMoodleResponse('state', JSON.stringify(stateFixture))).toEqual({
      courseId: 42,
      sections: [
        { id: 10, number: 0, title: 'General', moduleIds: [100, 101, 102, 106] },
        { id: 11, number: 1, title: 'Week 1', moduleIds: [] },
      ],
      modules: [
        {
          id: 100, sectionId: 10, type: 'assign', name: 'Tutorial 1',
          url: 'https://l.xmu.edu.my/mod/assign/view.php?id=100',
          visible: true, userVisible: true, accessVisible: true,
        },
        {
          id: 101, sectionId: 10, type: 'resource', name: 'Restricted notes', url: null,
          visible: true, userVisible: false, accessVisible: false,
        },
        {
          id: 102, sectionId: 10, type: 'label', name: 'Chapter introduction', url: null,
          visible: true, userVisible: true, accessVisible: true,
        },
        {
          id: 106, sectionId: 10, type: 'folder', name: 'Unknown access', url: null,
          visible: true, userVisible: false, accessVisible: false,
        },
      ],
    });
  });

  it('keeps event cmid, Unix seconds and server cursors independently of filtered rows', () => {
    expect(parseMoodleResponse('events', eventsFixture)).toEqual({
      events: [
        {
          id: 501, courseId: 42, moduleId: 100, name: 'Tutorial 1 deadline',
          time: 1791513000, url: 'https://l.xmu.edu.my/mod/assign/view.php?id=100',
        },
        {
          id: 502, courseId: 43, moduleId: null, name: 'Course event',
          time: 1791599400, url: 'https://l.xmu.edu.my/course/view.php?id=43',
        },
      ],
      firstId: 501,
      lastId: 540,
    });
  });

  it('reprojects standard responses into fresh whitelist objects', () => {
    const inputs = { courses: coursesFixture, state: stateFixture, events: eventsFixture };
    for (const method of ['courses', 'state', 'events'] as const) {
      const projected = parseMoodleResponse(method, inputs[method]);
      expect(projected).not.toBeNull();
      const polluted = { ...projected, sesskey: 'synthetic-secret' };
      const second = parseMoodleResponse(method, polluted);
      expect(second).toEqual(projected);
      expect(second).not.toBe(projected);
      expect(JSON.stringify(second)).not.toContain('synthetic-secret');
    }
  });

  it('executes the same projection without native module closure dependencies', () => {
    const injected: typeof parseMoodleResponse = new Function(`return (${parseMoodleResponse.toString()});`)();
    expect(injected('courses', coursesFixture)).toEqual(parseMoodleResponse('courses', coursesFixture));
    expect(injected('state', JSON.stringify(stateFixture))).toEqual(parseMoodleResponse('state', stateFixture));
    expect(injected('events', eventsFixture)).toEqual(parseMoodleResponse('events', eventsFixture));
  });

  it.each<MoodleMethod>(['courses', 'state', 'events'])('rejects invalid top-level %s payloads', (method) => {
    for (const value of [null, [], 1, 'bad json', {}]) expect(parseMoodleResponse(method, value)).toBeNull();
  });
});
