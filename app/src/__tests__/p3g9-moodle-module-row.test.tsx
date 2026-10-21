/**
 * P3G9 · 行内类型与原页动作（Phase G / R-5 章节成卡、行内带徽标）
 *
 * 现状：模块行下面另起一条整行宽的「打开原页」，行本身只有名字与类型副标题。
 * 期望：类型是行尾标签，原页是行尾图标按钮，点它不误入详情。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Open original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const course = { id: 1, name: 'Course one', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const snapshot: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1,
    sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101, 102], url: null, visible: true, current: false }],
    modules: [
      { id: 101, sectionId: 11, type: 'assign', name: 'Homework',
        url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', visible: true, userVisible: true,
        accessVisible: true, restrictions: false, completion: null },
      { id: 102, sectionId: 11, type: 'forum', name: 'Announcements', url: null, visible: true,
        userVisible: true, accessVisible: true, restrictions: false, completion: null },
    ] }] } };
const props = { labels, snapshot, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onModule: jest.fn(), onOriginal: jest.fn() };

it('p3g9 puts the module type inside the row', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  const row = within(view.getByTestId('moodle-module-101'));
  expect(row.getByTestId('moodle-module-type-101')).toBeTruthy();
  expect(row.getByText('type assign')).toBeTruthy();
});

it('p3g9 puts the original page action inside the row', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  const row = within(view.getByTestId('moodle-module-101'));
  expect(row.getByTestId('moodle-original-101')).toBeTruthy();
});

it('p3g9 opens the original page without entering the detail', async () => {
  const onModule = jest.fn();
  const onOriginal = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} onModule={onModule} onOriginal={onOriginal} />);
  await fireEvent.press(view.getByTestId('moodle-original-101'));
  expect(onOriginal).toHaveBeenCalledWith('https://l.xmu.edu.my/mod/assign/view.php?id=101');
  expect(onModule).not.toHaveBeenCalled();
});

it('p3g9 still enters the detail from the row itself', async () => {
  const onModule = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} onModule={onModule} />);
  await fireEvent.press(view.getByTestId('moodle-module-101'));
  expect(onModule).toHaveBeenCalledWith(1, expect.objectContaining({ id: 101 }));
});

it('p3g9 leaves modules without a url without the original action', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} />);
  const row = within(view.getByTestId('moodle-module-102'));
  expect(row.queryByTestId('moodle-original-102')).toBeNull();
  expect(row.getByTestId('moodle-module-type-102')).toBeTruthy();
});
