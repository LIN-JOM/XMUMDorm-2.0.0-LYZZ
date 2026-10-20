/**
 * P3G1 · 工作台三段骨架（Phase G / R-1 一屏分四层）
 *
 * 现状：状态、课程、章节、类型平铺在同一个滚动容器里，没有分段。
 * 期望：状态段 / 课程段 / 内容段按顺序各成一段，内容落在自己那一段里。
 */
import * as React from 'react';
import { within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const courses = [1, 2].map((id) => ({ id, name: `Course ${id}`, shortName: null, url: null,
  startDate: null, endDate: null, visible: true, favourite: false, progress: null }));
const modules = [
  { id: 101, sectionId: 11, type: 'forum', name: 'Announcements', url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101',
    visible: true, userVisible: true, accessVisible: true, restrictions: false, completion: null },
  { id: 102, sectionId: 11, type: 'assign', name: 'Homework', url: 'https://l.xmu.edu.my/mod/assign/view.php?id=102',
    visible: true, userVisible: true, accessVisible: true, restrictions: false, completion: null },
];
const ready: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: courses, selectedIds: [1, 2],
  data: { generation: 1, courses, events: [], states: [
    { courseId: 1, sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101, 102],
      url: null, visible: true, current: false }], modules },
    { courseId: 2, sections: [], modules: [] },
  ] } };
const props = { labels, onLogin: jest.fn(), onSync: jest.fn(), onCancel: jest.fn(),
  onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() } as const;

it('p3g1 renders the status, course and content sections in that order', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={ready} entry="restored-native" />);
  const ids = view.getAllByTestId(/^moodle-section-/).map((node) => node.props.testID);
  expect(ids).toEqual(['moodle-section-status', 'moodle-section-courses', 'moodle-section-content']);
});

it('p3g1 keeps course buttons inside the course section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={ready} entry="current-native" />);
  const coursesSection = within(view.getByTestId('moodle-section-courses'));
  expect(coursesSection.getByTestId('moodle-course-1')).toBeTruthy();
  expect(coursesSection.getByTestId('moodle-course-2')).toBeTruthy();
});

it('p3g1 keeps chapter titles and module rows inside the content section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={ready} entry="current-native" />);
  const content = within(view.getByTestId('moodle-section-content'));
  expect(content.getByText('Week one')).toBeTruthy();
  expect(content.getByTestId('moodle-module-101')).toBeTruthy();
  expect(content.getByTestId('moodle-module-102')).toBeTruthy();
});

it('p3g1 shows the course picking state without a content section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={{ ...ready, phase: 'choosing',
    selectedIds: [], data: { generation: 1, courses: [], states: [], events: [] } }} entry="first-login" />);
  expect(view.getByText('Choose courses')).toBeTruthy();
  expect(view.queryByTestId('moodle-section-content')).toBeNull();
});

it('p3g1 offers the sync empty state inside the course section only', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={{ ...ready, selectedIds: [],
    data: { generation: 1, courses: [], states: [], events: [] } }} entry="current-native" />);
  const coursesSection = within(view.getByTestId('moodle-section-courses'));
  expect(coursesSection.getByText('Empty')).toBeTruthy();
  expect(coursesSection.getByText('Sync')).toBeTruthy();
  expect(view.queryByTestId('moodle-section-content')).toBeNull();
});
