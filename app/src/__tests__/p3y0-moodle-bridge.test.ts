import courses from './fixtures/moodle/courses.json';
import state from './fixtures/moodle/state.json';
import events from './fixtures/moodle/events.json';
import { buildMoodleReadScript, parseMoodleBridgeMessage, type MoodleReadRequest } from '@/features/tools/moodle/bridge';

async function runScript(data: unknown = courses, origin = 'https://l.xmu.edu.my', error?: object,
  options: { password?: boolean; missingAmd?: boolean; hang?: boolean; request?: MoodleReadRequest } = {}) {
  const calls: unknown[] = [];
  const messages: string[] = [];
  const page = {
    location: { origin },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(message) },
    require: options.missingAmd ? undefined : (_names: string[], callback: (ajax: { call: (requests: unknown[]) => Promise<unknown>[] }) => void) => {
      callback({ call: (requests) => {
        calls.push(...requests);
        return [options.hang ? new Promise(() => {}) : error ? Promise.reject(error) : Promise.resolve(data)];
      } });
    },
  };
  const script = buildMoodleReadScript('request-1', options.request ?? { method: 'courses', offset: 25 });
  expect(script).not.toBeNull();
  new Function('window', 'document', script ?? '')(page, { querySelector: () => options.password ? {} : null });
  await Promise.resolve();
  await Promise.resolve();
  return { calls, messages, script };
}

it('executes a read-only Moodle request and returns only projected course fields', async () => {
  const { calls, messages } = await runScript();
  expect(calls).toEqual([{ methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
    args: { classification: 'all', limit: 50, offset: 25 } }]);
  expect(messages).toHaveLength(1);
  const result = parseMoodleBridgeMessage(messages[0]);
  expect(result).toMatchObject({ requestId: 'request-1', method: 'courses', status: 'success',
    data: { nextOffset: 25, courses: [{ id: 42 }, { id: 43 }] } });
  expect(messages[0]).not.toMatch(/fixture-only|sesskey|Cookie|password/);
});

it.each([
  ['servicerequireslogin', 'expired'], ['invalidsesskey', 'expired'], ['nopermissions', 'denied'], ['unknown', 'unavailable'],
])('projects %s into a finite status without the raw error', async (errorcode, status) => {
  const { messages } = await runScript(courses, undefined, { errorcode, message: 'private exception sesskey=secret' });
  expect(parseMoodleBridgeMessage(messages[0])).toEqual({ requestId: 'request-1', method: 'courses', status });
  expect(messages[0]).not.toMatch(/private|secret|errorcode/);
});

it('executes state and paginated events with the official parameter shape', async () => {
  const stateResult = await runScript(JSON.stringify(state), undefined, undefined, { request: { method: 'state', courseId: 42 } });
  expect(stateResult.calls).toEqual([{ methodname: 'core_courseformat_get_state', args: { courseid: 42 } }]);
  expect(parseMoodleBridgeMessage(stateResult.messages[0])).toMatchObject({ method: 'state', status: 'success', data: { courseId: 42 } });
  const eventResult = await runScript(events, undefined, undefined, { request: { method: 'events', afterEventId: 540 } });
  expect(eventResult.calls).toEqual([{ methodname: 'core_calendar_get_action_events_by_timesort',
    args: { timesortfrom: 1, aftereventid: 540, limitnum: 50 } }]);
  expect(parseMoodleBridgeMessage(eventResult.messages[0])).toMatchObject({ method: 'events', status: 'success', data: { lastId: 540 } });
});

it.each([
  ['https://external.example', {}, 'wrong-origin'],
  ['https://l.xmu.edu.my', { password: true }, 'expired'],
  ['https://l.xmu.edu.my', { missingAmd: true }, 'unavailable'],
])('refuses page %s with state %j', async (origin, options, status) => {
  const { calls, messages } = await runScript(courses, origin, undefined, options);
  expect(calls).toEqual([]);
  expect(parseMoodleBridgeMessage(messages[0])?.status).toBe(status);
});

it('reports timeout once and validates native envelopes and request parameters', async () => {
  jest.useFakeTimers();
  try {
    const { messages } = await runScript(courses, undefined, undefined, { hang: true });
    jest.advanceTimersByTime(20000);
    expect(messages).toHaveLength(1);
    expect(parseMoodleBridgeMessage(messages[0])?.status).toBe('timeout');
  } finally { jest.useRealTimers(); }
  expect(buildMoodleReadScript('request-1', { method: 'courses', offset: -1 })).toBeNull();
  expect(buildMoodleReadScript('request-1', { method: 'state', courseId: 0 })).toBeNull();
  expect(buildMoodleReadScript('request-1', { method: 'events', afterEventId: 1.5 })).toBeNull();
  for (const raw of ['not json', '{}', '[]', JSON.stringify({ kind: 'dorm:moodle', requestId: 'r', method: 'courses', status: 'arbitrary' })]) {
    expect(parseMoodleBridgeMessage(raw)).toBeNull();
  }
});
