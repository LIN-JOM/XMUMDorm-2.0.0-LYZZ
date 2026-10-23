/**
 * P3G6 · 课程切换控件（Phase G / R-3 课程切换一个控件）
 *
 * 现状：所有课程铺成一排按钮，名字被截成 `…`，看不出哪一门是当前课程。
 * 期望：当前课程名常显，切换后列出全部课程，选中即收起。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const names = ['BSC125 Probability and Statistics A (Group 2)', 'SWE203 Human-Computer Interaction (SWE/CS)',
  'SWE306 Software Engineering Project', 'MAT201 Discrete Mathematics', 'ENG101 Academic English'];
const courses = names.map((name, index) => ({ id: index + 1, name, shortName: null, url: null,
  startDate: null, endDate: null, visible: true, favourite: false, progress: null }));
const modulesFor = (courseId: number) => [
  { id: courseId * 10 + 1, sectionId: courseId * 100 + 1, type: 'forum', name: `Announcements ${courseId}`,
    url: `https://l.xmu.edu.my/mod/forum/view.php?id=${courseId * 10 + 1}`, visible: true, userVisible: true,
    accessVisible: true, restrictions: false, completion: null },
];
const snapshot: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: courses,
  selectedIds: courses.map((course) => course.id),
  data: { generation: 1, courses, events: [], states: courses.map((course) => ({ courseId: course.id,
    sections: [{ id: course.id * 100 + 1, number: 1, title: `Week ${course.id}`, moduleIds: [],
      url: null, visible: true, current: false }], modules: modulesFor(course.id) })) } };
const props = { labels, snapshot, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g6 shows only the current course name until the picker opens', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  expect(view.getByTestId('moodle-current-course').props.children).toBe(names[0]);
  expect(view.queryByTestId('moodle-course-2')).toBeNull();
});

it('p3g6 lists every course after the switch action', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  expect(view.getAllByTestId(/^moodle-course-/)).toHaveLength(5);
  expect(view.getByText(names[4])).toBeTruthy();
});

it('p3g6 switches the current course and closes the picker', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  await fireEvent.press(view.getByTestId('moodle-course-2'));
  expect(view.getByTestId('moodle-current-course').props.children).toBe(names[1]);
  expect(view.queryByTestId('moodle-course-1')).toBeNull();
});

it('p3g6 shows the switched course content', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  await fireEvent.press(view.getByTestId('moodle-course-3'));
  expect(view.getByText('Announcements 3')).toBeTruthy();
  expect(view.queryByText('Announcements 1')).toBeNull();
});

it('p3g6 keeps five selectable rows for a long course list', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  names.forEach((name) => expect(view.getAllByText(name).length).toBeGreaterThan(0));
});
