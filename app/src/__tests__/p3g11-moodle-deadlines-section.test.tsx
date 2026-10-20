/**
 * P3G11 · 截止段由屏幕承载（Phase G / R-6 截止区独立分区）
 *
 * 现状：截止数据由宿主拼成一段裸文本塞进页脚，没有分区标题，也没有组与行的层级。
 * 期望：屏幕渲染第四个分区，标题、桶组、行、提醒状态各就各位。
 */
import * as React from 'react';
import { within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleDeadlineView,
  type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const course = { id: 1, name: 'Course one', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const snapshot: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1,
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101], url: null, visible: true, current: false }],
    modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
      url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] }] } };
const deadlines: MoodleDeadlineView = { title: 'Deadlines', groups: [
  { key: 'valid', title: 'Due', items: [{ key: 'd1', title: 'Essay 1', meta: '2026-10-21 23:59' }] },
  { key: 'past', title: 'Past', items: [] },
], otherTitle: 'Other events', others: [], reminder: 'Reminders planned' };
const props = { labels, snapshot, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g11 renders the deadline section after the content section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={deadlines} />);
  const ids = view.getAllByTestId(/^moodle-section-/).map((node) => node.props.testID);
  expect(ids).toEqual(['moodle-section-status', 'moodle-section-courses', 'moodle-section-content',
    'moodle-section-deadlines']);
});

it('p3g11 groups deadlines under a bucket title with the event and its time', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={deadlines} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Due')).toBeTruthy();
  expect(section.getByText('Essay 1')).toBeTruthy();
  expect(section.getByText('2026-10-21 23:59')).toBeTruthy();
});

it('p3g11 keeps the reminder status inside the deadline section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={deadlines} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByTestId('moodle-reminder-status')).toBeTruthy();
  expect(section.getByText('Reminders planned')).toBeTruthy();
});

it('p3g11 shows the section title even when no bucket is filled', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    deadlines={{ ...deadlines, groups: [], others: [] }} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Deadlines')).toBeTruthy();
  expect(section.queryByText('Due')).toBeNull();
  expect(section.getByTestId('moodle-reminder-status')).toBeTruthy();
});

it('p3g11 leaves the section out when the host has no deadline view', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  expect(view.queryByTestId('moodle-section-deadlines')).toBeNull();
});
