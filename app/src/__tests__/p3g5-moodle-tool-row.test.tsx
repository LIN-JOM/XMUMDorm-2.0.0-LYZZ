/**
 * P3G5 · 工具行动作收口（Phase G / R-9 行为不变）
 *
 * 分段顺序由 p3g1 锁定；这里只补工具行随相位变化的动作，并作为本 phase 的最后一道屏级断言。
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
const course = { id: 1, name: 'Course 1', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const snapshot: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1,
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101], url: null, visible: true, current: false }],
    modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
      url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] }] } };
const props = { labels, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g5 offers cancel inside the tool row while a sync is running', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props}
    snapshot={{ ...snapshot, phase: 'loading-objects' }} />);
  const row = within(view.getByTestId('moodle-tool-row'));
  expect(row.getByTestId('moodle-sync')).toBeTruthy();
  expect(row.getByTestId('moodle-cancel')).toBeTruthy();
});

it('p3g5 drops cancel once the sync is done', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={snapshot} />);
  const row = within(view.getByTestId('moodle-tool-row'));
  expect(row.getByTestId('moodle-sync')).toBeTruthy();
  expect(row.queryByTestId('moodle-cancel')).toBeNull();
});
