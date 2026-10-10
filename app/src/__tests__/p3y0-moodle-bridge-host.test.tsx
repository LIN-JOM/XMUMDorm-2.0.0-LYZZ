import * as mockReact from 'react';
import { View as MockView } from 'react-native';
import { act } from '@testing-library/react-native';
import type { WebViewProps, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { renderApp } from './helpers/renderApp';
import { SchoolSystemWebView, type SchoolSystemWebViewHandle } from '@/features/tools/SchoolSystemWebView';
import { SCHOOL_SYSTEMS } from '@/features/tools/schoolSystems';
import { MOODLE_MESSAGE_KIND } from '@/features/tools/moodle/bridge';
import courses from './fixtures/moodle/courses.json';
import { clearSchoolSession } from '@/features/tools/schoolSession';
import { readMoodleCache, selectMoodleCourses } from '@/features/tools/moodle/cache';

const mockInject = jest.fn();
let mockProps: WebViewProps;
jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: mockReact.forwardRef(function FakeWebView(props: WebViewProps, ref) {
    mockReact.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    mockReact.useLayoutEffect(() => { mockProps = props; });
    return <MockView />;
  }),
}));

async function mount(id: 'moodle' | 'ac' = 'moodle') {
  const ref = mockReact.createRef<SchoolSystemWebViewHandle>();
  const onResult = jest.fn();
  const system = SCHOOL_SYSTEMS.find((item) => item.id === id)!;
  const result = await renderApp(<SchoolSystemWebView ref={ref} system={system} onMoodleResponse={onResult} />,
    { inScreen: true });
  return { ref, onResult, result };
}
async function navigate(url = 'https://l.xmu.edu.my/my/') {
  await act(() => mockProps.onNavigationStateChange?.({ url, loading: false } as WebViewNavigation));
}
async function respond(requestId: string, url = 'https://l.xmu.edu.my/my/', status = 'success') {
  await act(() => mockProps.onMessage?.({ nativeEvent: { url, data: JSON.stringify({
    kind: MOODLE_MESSAGE_KIND, requestId, method: 'courses', status, data: courses,
  }) } } as WebViewMessageEvent));
}

it('pairs an existing WebView command with one projected native callback', async () => {
  const { ref, onResult } = await mount();
  await navigate();
  let id: string | null = null;
  await act(() => { id = ref.current!.readMoodle({ method: 'courses' }); });
  expect(id).toEqual(expect.any(String));
  expect(mockInject.mock.calls.at(-1)?.[0]).toContain('core_course_get_enrolled_courses_by_timeline_classification');
  await respond(id!);
  await respond(id!);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult.mock.calls[0][0]).toMatchObject({ requestId: id, status: 'success', data: { nextOffset: 25 } });
  expect(JSON.stringify(onResult.mock.calls)).not.toContain('fixture-only');
});

it.each(['moodle', 'ac'] as const)('refuses an external page or other system: %s', async (id) => {
  const { ref, onResult } = await mount(id);
  await navigate(id === 'moodle' ? 'https://external.example' : undefined);
  expect(ref.current!.readMoodle({ method: 'courses' })).toBeNull();
  await respond('invented');
  expect(onResult).not.toHaveBeenCalled();
});

it('rejects external messages and responses cancelled by navigation', async () => {
  const { ref, onResult } = await mount();
  await navigate();
  const id = ref.current!.readMoodle({ method: 'courses' })!;
  await respond(id, 'https://external.example');
  expect(onResult).not.toHaveBeenCalled();
  await navigate('https://l.xmu.edu.my/course/view.php?id=42');
  await respond(id);
  expect(onResult).not.toHaveBeenCalled();
});

it('expires all concurrent reads when Moodle reports a lost session', async () => {
  const { ref, onResult } = await mount();
  await navigate();
  const first = ref.current!.readMoodle({ method: 'courses' })!;
  const second = ref.current!.readMoodle({ method: 'courses', offset: 25 })!;
  await respond(first, undefined, 'expired');
  await respond(second);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult.mock.calls[0][0].status).toBe('expired');
});

it('finishes a lost native response as timeout and ignores later data', async () => {
  const { ref, onResult, result } = await mount();
  await navigate();
  jest.useFakeTimers();
  try {
    const id = ref.current!.readMoodle({ method: 'courses' })!;
    await act(() => { jest.advanceTimersByTime(12000); });
    await respond(id);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].status).toBe('timeout');
    await result.unmount();
  } finally { jest.useRealTimers(); }
});

it('rejects a pending native callback after the user clears Moodle', async () => {
  const { ref, onResult } = await mount();
  await navigate();
  selectMoodleCourses([42]);
  const id = ref.current!.readMoodle({ method: 'courses' })!;
  await clearSchoolSession('moodle');
  await respond(id);
  expect(onResult).not.toHaveBeenCalled();
  expect(readMoodleCache().courses).toEqual([]);
});

it('stores only selected objects and clears them on navigation and unmount', async () => {
  const { ref, result } = await mount();
  await navigate();
  selectMoodleCourses([42]);
  await respond(ref.current!.readMoodle({ method: 'courses' })!);
  expect(readMoodleCache().courses.map((course) => course.id)).toEqual([42]);
  await navigate('https://l.xmu.edu.my/course/view.php?id=42');
  expect(readMoodleCache().courses).toEqual([]);
  selectMoodleCourses([43]);
  await respond(ref.current!.readMoodle({ method: 'courses' })!, 'https://l.xmu.edu.my/course/view.php?id=42');
  expect(readMoodleCache().courses.map((course) => course.id)).toEqual([43]);
  await result.unmount();
  expect(readMoodleCache().courses).toEqual([]);
});

it('starts a new scan on offset zero and empties the old visible-course snapshot', async () => {
  const { ref } = await mount();
  await navigate();
  selectMoodleCourses([42]);
  await respond(ref.current!.readMoodle({ method: 'courses' })!);
  expect(readMoodleCache().courses).toHaveLength(1);
  ref.current!.readMoodle({ method: 'courses', offset: 0 });
  expect(readMoodleCache()).toMatchObject({ courses: [], states: [], events: [] });
});
