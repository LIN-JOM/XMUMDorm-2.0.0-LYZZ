/**
 * P3G13 · 其他事件并入截止段（Phase G / R-6 截止区独立分区）
 *
 * 现状：其他事件是截止区尾部一段独立大标题加散行。
 * 期望：其他事件成为同一张卡里的第二个组，每条一行，次要文案带类型、可操作与时间。
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
const withOthers: MoodleDeadlineView = { title: 'Deadlines', empty: 'No deadlines yet', groups: [],
  otherTitle: 'Other events',
  others: [{ key: 'e1', title: 'Exam window', meta: 'Open · actionable · 2026-10-25 09:00' }],
  reminder: 'Reminders planned' };

it('p3g13 shows the other events as their own group inside the deadline section', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={withOthers} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Other events')).toBeTruthy();
  expect(section.getByText('Exam window')).toBeTruthy();
});

it('p3g13 keeps the type actionable and time on one secondary line', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={withOthers} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Open · actionable · 2026-10-25 09:00')).toBeTruthy();
});

it('p3g13 leaves the group out when there are no other events', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={{ ...withOthers, others: [],
    groups: [{ key: 'valid', title: 'Due', items: [{ key: 'd1', title: 'Essay 1', meta: null }] }] }} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.queryByText('Other events')).toBeNull();
  expect(section.getByText('Due')).toBeTruthy();
});

it('p3g13 shares the card between buckets and events', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} deadlines={{ ...withOthers,
    groups: [{ key: 'valid', title: 'Due', items: [{ key: 'd1', title: 'Essay 1', meta: '2026-10-21 23:59' }] }] }} />);
  const section = within(view.getByTestId('moodle-section-deadlines'));
  expect(section.getByText('Due')).toBeTruthy();
  expect(section.getByText('Other events')).toBeTruthy();
});
