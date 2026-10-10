import courses from './fixtures/moodle/courses.json';
import { buildMoodleReadScript, parseMoodleBridgeMessage } from '@/features/tools/moodle/bridge';

async function runScript(data: unknown = courses, origin = 'https://l.xmu.edu.my', error?: object) {
  const calls: unknown[] = [];
  const messages: string[] = [];
  const page = {
    location: { origin },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(message) },
    require: (_names: string[], callback: (ajax: { call: (requests: unknown[]) => Promise<unknown>[] }) => void) => {
      callback({ call: (requests) => {
        calls.push(...requests);
        return [error ? Promise.reject(error) : Promise.resolve(data)];
      } });
    },
  };
  const script = buildMoodleReadScript('request-1', { method: 'courses', offset: 25 });
  expect(script).not.toBeNull();
  new Function('window', 'document', script ?? '')(page, { querySelector: () => null });
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
