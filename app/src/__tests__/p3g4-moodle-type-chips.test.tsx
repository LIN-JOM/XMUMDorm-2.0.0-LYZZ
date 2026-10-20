/**
 * P3G4 · 类型筛选芯片（Phase G / R-4 筛选用芯片）
 *
 * 现状：类型筛选是一排按钮，"全部类型"与类型名都用按钮变体表达选中态。
 * 期望：筛选是一行芯片，选中态由芯片的无障碍选中态表达，测试标识保持原样。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
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
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101, 102], url: null, visible: true, current: false }],
    modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
      url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null },
    { id: 102, sectionId: 11, type: 'assign', name: 'Homework',
      url: 'https://l.xmu.edu.my/mod/assign/view.php?id=102', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] }] } };
const props = { labels, snapshot, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g4 starts with the all types chip selected', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  expect(view.getByTestId('moodle-type-all').props.accessibilityState.selected).toBe(true);
  expect(view.getByTestId('moodle-type-assign').props.accessibilityState.selected).toBe(false);
});

it('p3g4 offers one chip per module type plus all types', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  expect(view.getAllByTestId(/^moodle-type-/)).toHaveLength(3);
  expect(view.getByTestId('moodle-type-forum')).toBeTruthy();
  expect(view.getByTestId('moodle-type-assign')).toBeTruthy();
});

it('p3g4 moves the selected state to the pressed type chip', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-type-assign'));
  expect(view.getByTestId('moodle-type-assign').props.accessibilityState.selected).toBe(true);
  expect(view.getByTestId('moodle-type-all').props.accessibilityState.selected).toBe(false);
});

it('p3g4 filters the content section down to the chosen type', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-type-assign'));
  const content = within(view.getByTestId('moodle-section-content'));
  expect(content.getByText('Homework')).toBeTruthy();
  expect(content.queryByText('Announcements')).toBeNull();
});

it('p3g4 restores every module when all types is pressed again', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  await fireEvent.press(view.getByTestId('moodle-type-assign'));
  await fireEvent.press(view.getByTestId('moodle-type-all'));
  const content = within(view.getByTestId('moodle-section-content'));
  expect(content.getByText('Homework')).toBeTruthy();
  expect(content.getByText('Announcements')).toBeTruthy();
});
