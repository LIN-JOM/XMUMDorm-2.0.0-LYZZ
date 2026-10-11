import { parseMoodleResponse, type MoodleMethod, type MoodleResponse } from './contract';

export const MOODLE_MESSAGE_KIND = 'dorm:moodle';
export type MoodleReadRequest =
  | { method: 'courses'; offset?: number }
  | { method: 'state'; courseId: number }
  | { method: 'events'; afterEventId?: number };
export type MoodleFailure = 'expired' | 'denied' | 'unavailable' | 'invalid-data' | 'timeout' | 'wrong-origin';
export type MoodleBridgeResult = { requestId: string; method: MoodleMethod } &
  ({ status: 'success'; data: MoodleResponse } | { status: MoodleFailure });

export function isMoodleOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://l.xmu.edu.my' && !parsed.username && !parsed.password;
  } catch { return false; }
}

/** core/ajax owns sesskey and cookies inside the page. Neither crosses this bridge. */
export function buildMoodleReadScript(requestId: string, request: MoodleReadRequest): string | null {
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(requestId)) return null;
  let methodname: string;
  let args: object;
  const nonnegative = (value: number) => Number.isSafeInteger(value) && value >= 0;
  switch (request.method) {
    case 'courses':
      if (!nonnegative(request.offset ?? 0)) return null;
      methodname = 'core_course_get_enrolled_courses_by_timeline_classification';
      // Dashboard hiding is a user preference, not the course visibility permission.
      args = { classification: 'allincludinghidden', limit: 50, offset: request.offset ?? 0 };
      break;
    case 'state':
      if (!nonnegative(request.courseId) || request.courseId === 0) return null;
      methodname = 'core_courseformat_get_state';
      args = { courseid: request.courseId };
      break;
    case 'events':
      if (!nonnegative(request.afterEventId ?? 0)) return null;
      methodname = 'core_calendar_get_action_events_by_timesort';
      // Moodle 4.5 only applies the event cursor when its lower time bound is nonzero.
      // Keep the same bound on every page; never derive it afresh from the device clock.
      args = { timesortfrom: 1, aftereventid: request.afterEventId ?? 0, limitnum: 50 };
      break;
    default: return null;
  }
  return `(function () {
    var done = false, timer;
    var project = (${parseMoodleResponse.toString()});
    function send(status, data) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      var message = { kind: ${JSON.stringify(MOODLE_MESSAGE_KIND)}, requestId: ${JSON.stringify(requestId)},
        method: ${JSON.stringify(request.method)}, status: status };
      if (status === 'success') message.data = data;
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
    function failure(error) {
      var code = error && error.errorcode;
      if (code === 'servicerequireslogin' || code === 'invalidsesskey' || code === 'requireloginerror') send('expired');
      else if (code === 'nopermissions' || code === 'accessdenied') send('denied');
      else send('unavailable');
    }
    if (window.location.origin !== 'https://l.xmu.edu.my') { send('wrong-origin'); return; }
    if (document.querySelector('input[type=password]')) { send('expired'); return; }
    if (typeof window.require !== 'function') { send('unavailable'); return; }
    timer = setTimeout(function () { send('timeout'); }, 10000);
    try {
      window.require(['core/ajax'], function (ajax) {
        try {
          Promise.resolve(ajax.call([{ methodname: ${JSON.stringify(methodname)}, args: ${JSON.stringify(args)} }])[0])
            .then(function (raw) {
              if (window.location.origin !== 'https://l.xmu.edu.my') { send('wrong-origin'); return; }
              var data = project(${JSON.stringify(request.method)}, raw);
              if (data === null) send('invalid-data'); else send('success', data);
            }).catch(failure);
        } catch (error) { failure(error); }
      }, failure);
    } catch (error) { failure(error); }
  })(); true;`;
}

/** Repeat the whitelist on native input; a WebView message is untrusted. */
export function parseMoodleBridgeMessage(raw: string): MoodleBridgeResult | null {
  if (raw.length > 2_000_000) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (message.kind !== MOODLE_MESSAGE_KIND || typeof message.requestId !== 'string'
    || !/^[a-zA-Z0-9:_-]{1,80}$/.test(message.requestId)) return null;
  if (message.method !== 'courses' && message.method !== 'state' && message.method !== 'events') return null;
  const method = message.method;
  if (message.status === 'success') {
    const data = parseMoodleResponse(method, message.data);
    return data === null ? null : { requestId: message.requestId, method, status: 'success', data };
  }
  if (message.status === 'expired' || message.status === 'denied' || message.status === 'unavailable'
    || message.status === 'invalid-data' || message.status === 'timeout' || message.status === 'wrong-origin') {
    return { requestId: message.requestId, method, status: message.status };
  }
  return null;
}
