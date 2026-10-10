import * as mockReact from 'react';
import { View as MockView } from 'react-native';
import { act } from '@testing-library/react-native';
import type { WebViewProps, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { renderApp } from './helpers/renderApp';
import { SchoolSystemWebView, type SchoolSystemWebViewHandle } from '@/features/tools/SchoolSystemWebView';
import { SCHOOL_SYSTEMS } from '@/features/tools/schoolSystems';
import { MOODLE_MESSAGE_KIND } from '@/features/tools/moodle/bridge';
import courses from './fixtures/moodle/courses.json';

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
async function respond(requestId: string, url = 'https://l.xmu.edu.my/my/') {
  await act(() => mockProps.onMessage?.({ nativeEvent: { url, data: JSON.stringify({
    kind: MOODLE_MESSAGE_KIND, requestId, method: 'courses', status: 'success', data: courses,
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
