/**
 * P3G15 · 截止段与分段的边界（Phase G / R-7 四态归位、R-9 行为不变）
 *
 * 截止段是本 phase 新增的第四段；它必须与其它段的隐现有序共存，
 * 且在没有内容段（选课中）时仍然出现，否则用户会以为同步后没有截止。
 */
import * as React from 'react';
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
const base: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1,
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101], url: null, visible: true, current: false }],
    modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
      url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] }] } };
const deadlines: MoodleDeadlineView = { title: 'Deadlines', empty: 'No deadlines yet',
  groups: [{ key: 'valid', title: 'Due', items: [{ key: 'd1', title: 'Essay 1', meta: null }] }],
  otherTitle: 'Other events', others: [], reminder: 'Reminders planned' };
const props = { labels, deadlines, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g15 keeps the deadline section while the course picker is open', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    snapshot={{ ...base, phase: 'choosing', selectedIds: [],
      data: { generation: 1, courses: [], states: [], events: [] } }} />);
  const ids = view.getAllByTestId(/^moodle-section-/).map((node) => node.props.testID);
  expect(ids).toEqual(['moodle-section-status', 'moodle-section-courses', 'moodle-section-deadlines']);
  expect(view.getByText('Essay 1')).toBeTruthy();
});

it('p3g15 keeps four sections in order when the course has no modules', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    snapshot={{ ...base, data: { ...base.data, states: [{ courseId: 1, sections: [], modules: [] }] } }} />);
  const ids = view.getAllByTestId(/^moodle-section-/).map((node) => node.props.testID);
  expect(ids).toEqual(['moodle-section-status', 'moodle-section-courses', 'moodle-section-content',
    'moodle-section-deadlines']);
  expect(view.getByTestId('moodle-empty-modules')).toBeTruthy();
  expect(view.getByText('Due')).toBeTruthy();
});
