/**
 * P3G12 · 空桶规则与全空空态（Phase G / R-6 截止区独立分区）
 *
 * 期望：没有内容的桶整段不出现；四桶与事件全空时给一句话，而不是四个空标题。
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
const props = { labels, snapshot, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };
const oneBucket: MoodleDeadlineView = { title: 'Deadlines', empty: 'No deadlines yet', groups: [
  { key: 'valid', title: 'Due', items: [{ key: 'd1', title: 'Essay 1', meta: '2026-10-21 23:59' }] },
], otherTitle: 'Other events', others: [], reminder: 'Reminders planned' };

it('p3g12 shows the empty sentence when every bucket is empty', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    deadlines={{ ...oneBucket, groups: [] }} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('No deadlines yet')).toBeTruthy();
  expect(section.queryByText('Due')).toBeNull();
});

it('p3g12 shows only the buckets that carry rows', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={oneBucket} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Due')).toBeTruthy();
  expect(section.queryByText('Past')).toBeNull();
  expect(section.queryByText('No deadlines yet')).toBeNull();
  expect(section.getByText('Essay 1')).toBeTruthy();
});

it('p3g12 drops the empty sentence once the other events carry rows', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    deadlines={{ ...oneBucket, groups: [], others: [{ key: 'e1', title: 'Exam window', meta: 'other' }] }} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.queryByText('No deadlines yet')).toBeNull();
});
