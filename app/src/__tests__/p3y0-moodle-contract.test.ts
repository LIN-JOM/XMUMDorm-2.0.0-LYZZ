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

});
