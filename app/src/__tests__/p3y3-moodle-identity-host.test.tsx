import * as mockReact from 'react';
import { View as MockView } from 'react-native';
import { act } from '@testing-library/react-native';
import type { WebViewProps, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { renderApp } from './helpers/renderApp';
import { SchoolSystemWebView, type SchoolSystemWebViewHandle } from '@/features/tools/SchoolSystemWebView';
import { SCHOOL_SYSTEMS } from '@/features/tools/schoolSystems';
import { confirmedMoodleSchoolIdentity } from '@/features/tools/moodle/cache';

const mockInject = jest.fn();
let mockProps: WebViewProps;
jest.mock('react-native-webview', () => ({ __esModule: true,
  default: mockReact.forwardRef(function FakeWebView(props: WebViewProps, ref) {
    mockReact.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    mockReact.useLayoutEffect(() => { mockProps = props; });
    return <MockView />;
  }),
}));

it('p3y3 native commands require a pending same-page identity proof before preserving', async () => {
  const ref = mockReact.createRef<SchoolSystemWebViewHandle>();
  const onIdentity = jest.fn();
  const view = await renderApp(<SchoolSystemWebView ref={ref} system={SCHOOL_SYSTEMS[1]}
    preserveSnapshotOnClose onMoodleIdentity={onIdentity} />, { inScreen: true });
  await act(() => mockProps.onNavigationStateChange?.({ url: 'https://l.xmu.edu.my/my/', loading: false } as WebViewNavigation));
  expect(ref.current!.readMoodle({ method: 'courses' })).toBeNull();
  let id: string | null = null;
  await act(() => { id = ref.current!.probeMoodleIdentity!(); });
  async function reply(url: string, requestId = id!) {
    await act(() => mockProps.onMessage?.({ nativeEvent: { url, data: JSON.stringify({
      kind: 'dorm:moodle:identity', requestId, status: 'confirmed', userId: 123, sesskey: 'never-forward',
    }) } } as WebViewMessageEvent));
  }
  await reply('https://outside.example');
  expect(onIdentity).not.toHaveBeenCalled();
  await reply('https://l.xmu.edu.my/my/', 'identity:forged');
  expect(onIdentity).not.toHaveBeenCalled();
  await reply('https://l.xmu.edu.my/my/');
  expect(onIdentity).toHaveBeenCalledWith({ requestId: id, status: 'confirmed', userId: 123 });
  expect(confirmedMoodleSchoolIdentity()).toBe(123);
  const readId = ref.current!.readMoodle({ method: 'courses' });
  expect(readId).toEqual(expect.any(String));
  expect(mockInject.mock.calls.at(-1)?.[0]).toContain('userId');
  await view.unmount();
  expect(confirmedMoodleSchoolIdentity()).toBeNull();
});
