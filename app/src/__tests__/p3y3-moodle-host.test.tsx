import * as mockReact from 'react';
import { View as MockView } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import type { WebViewProps, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceHost, type MoodleWorkspaceHostLabels } from '@/features/tools/moodle/WorkspaceHost';
import { clearMoodleCache, settleMoodleStorage, confirmMoodleSchoolIdentity, selectMoodleCourses,
  writeMoodleCache, moodleCacheGeneration, persistMoodleSnapshot, closeMoodleCache, readMoodleCache,
  subscribeMoodleInvalidation } from '@/features/tools/moodle/cache';
import { tokenStore } from '@/lib/tokenStore';

const mockInject = jest.fn();
let mockProps: WebViewProps;
jest.mock('react-native-webview', () => ({ __esModule: true,
  default: mockReact.forwardRef(function FakeWebView(props: WebViewProps, ref) {
    mockReact.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    mockReact.useLayoutEffect(() => { mockProps = props; }); return <MockView />;
  }),
}));
const now = Date.parse('2026-10-11T00:00:00Z');
const moduleUrl = 'https://l.xmu.edu.my/mod/forum/view.php?id=101';
const discussionUrl = 'https://l.xmu.edu.my/mod/forum/discuss.php?d=71';
const labels: MoodleWorkspaceHostLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Choose', chooseCourses: 'Choose courses', courses: 'Courses', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}`,
  back: 'Back', clear: 'Clear Moodle', backToNative: 'Native', deadlines: 'Deadlines',
  deadlineBucket: (value) => `bucket ${value}`, formatTime: (value) => new Date(value).toISOString(),
  detailStatus: (value) => `detail ${value}`, reminderStatus: (value) => `reminders ${value}`,
  submissionStatus: (value) => `submission ${value}`, gradingStatus: (value) => `grading ${value}`,
  locked: 'Locked', fileUnknown: 'Unknown file details', fileMetadata: (file) => `${file.mimeType} ${file.size}` };

function requestId(prefix: string) {
  const script = [...mockInject.mock.calls].reverse().find((call) => String(call[0]).includes(`requestId:`)
    && String(call[0]).includes(`"${prefix}:`))?.[0] as string;
  return script.match(new RegExp(`requestId:\\s*"(${prefix}:\\d+)"`))![1];
}
async function message(data: unknown) {
  await act(() => mockProps.onMessage?.({ nativeEvent: { url: 'https://l.xmu.edu.my/my/',
    data: JSON.stringify(data) } } as WebViewMessageEvent));
}
async function confirm(userId = 123) {
  await act(() => mockProps.onNavigationStateChange?.({ url: 'https://l.xmu.edu.my/my/', loading: false } as WebViewNavigation));
  await message({ kind: 'dorm:moodle:identity', requestId: requestId('identity'), status: 'confirmed', userId });
}
async function core(method: string, data: unknown) {
  await message({ kind: 'dorm:moodle', requestId: requestId('moodle'), method, status: 'success', data });
}
const course = { id: 1, name: 'Course one', visible: true };
const state = { courseId: 1, sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101] }],
  modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements', url: moduleUrl,
    visible: true, userVisible: true, accessVisible: true }] };

beforeEach(async () => { clearMoodleCache(); await settleMoodleStorage(); });

it('p3y3 workspace closes login sync details original and reminder callbacks', async () => {
  const onPlan = jest.fn(), onClear = jest.fn(), onOriginal = jest.fn();
  const view = await renderApp(<MoodleWorkspaceHost labels={labels} now={() => now}
    onReminderPlan={onPlan} onClearReminders={onClear} onOpenOriginal={onOriginal} />, { inScreen: true });
  expect(view.queryByTestId('moodle-workspace')).toBeNull();
  await confirm();
  expect(view.getByText('Native workspace')).toBeTruthy();
  await fireEvent.press(view.getByTestId('moodle-sync'));
  await core('courses', { courses: [course], nextOffset: 0 });
  await fireEvent.press(view.getByTestId('moodle-select-1'));
  await fireEvent.press(view.getByTestId('moodle-confirm-selection'));
  await core('state', state);
  await core('events', { events: [{ id: 5, courseId: 1, moduleId: 999, name: 'Deadline',
    time: now / 1000 + 86400, url: moduleUrl }], firstId: 5, lastId: 5 });
  await core('events', { events: [], firstId: null, lastId: null });
  expect(onPlan).toHaveBeenLastCalledWith([{ id: 'moodle:1:5', fireAt: now + 86400000 - 1800000 }]);
  await fireEvent.press(view.getByTestId('moodle-module-101'));
  const id = requestId('detail');
  const detail = { kind: 'forum', courseId: 1, moduleId: 101, url: moduleUrl, description: '',
    announcements: [{ id: 71, title: 'Full announcement', author: 'Dr One', pinned: true, url: discussionUrl }] };
  await message({ kind: 'dorm:moodle:detail', requestId: id, status: 'success', data: { ...detail, moduleId: 999 } });
  expect(view.getByText('detail loading')).toBeTruthy();
  await message({ kind: 'dorm:moodle:detail', requestId: id, status: 'success', data: detail });
  await fireEvent.press(view.getByTestId('moodle-discussion-71'));
  expect(requestId('detail')).not.toBe(id);
  await message({ kind: 'dorm:moodle:detail', requestId: requestId('detail'), status: 'success', data: {
    kind: 'discussion', courseId: 1, moduleId: 101, url: discussionUrl, description: '', posts: [
      { id: 81, title: 'Post title', author: 'Dr One', createdAt: null, body: 'Post body',
        url: `${discussionUrl}#p81`, attachments: [] } ],
  } });
  expect(view.getByText('Post body')).toBeTruthy();
  await fireEvent.press(view.getByTestId('moodle-post-original-81'));
  expect(onOriginal).toHaveBeenCalledWith(`${discussionUrl}#p81`);
  await fireEvent.press(view.getByTestId('moodle-clear'));
  expect(readMoodleCache().courses).toEqual([]);
  expect(onClear).toHaveBeenCalled();
  await view.unmount(); await settleMoodleStorage();
});

it('p3y3 requires a fresh proof before showing stored native courses', async () => {
  confirmMoodleSchoolIdentity(123); selectMoodleCourses([1]);
  writeMoodleCache('courses', { courses: [course], nextOffset: 0 }, moodleCacheGeneration());
  writeMoodleCache('state', state, moodleCacheGeneration());
  await persistMoodleSnapshot(); closeMoodleCache(true); await settleMoodleStorage();
  const view = await renderApp(<MoodleWorkspaceHost labels={labels} onOpenOriginal={jest.fn()}
    now={() => now} />, { inScreen: true });
  expect(view.queryByText('Course one')).toBeNull();
  await confirm();
  expect(view.getByText('Restored native')).toBeTruthy();
  expect(view.getByText('Course one')).toBeTruthy();
  await view.unmount(); await settleMoodleStorage();
});

it('p3y3 invalidates a changed project token once when a cache listener reads immediately', () => {
  const previous = tokenStore.get();
  let calls = 0;
  moodleCacheGeneration();
  const unsubscribe = subscribeMoodleInvalidation(() => { calls += 1; readMoodleCache(); });
  try {
    tokenStore.set('new-project-token-y3');
    readMoodleCache();
    expect(calls).toBe(1);
  } finally { unsubscribe(); tokenStore.set(previous); moodleCacheGeneration(); }
});
