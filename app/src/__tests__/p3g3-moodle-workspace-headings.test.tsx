/**
 * P3G3 · 章节标题降档（Phase G / R-2 标题只留一级）
 *
 * 现状：章节名用页面标题字阶，比模块行大两档，一屏里最响的是章节而不是内容。
 * 期望：页内不再出现页面标题 / 超大标题字阶，章节名由分区标题组件承载。
 */
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'features', 'tools', 'moodle', 'WorkspaceScreen.tsx'), 'utf8');

it('p3g3 keeps page level type scales out of the workspace screen', () => {
  expect(source).not.toMatch(/role=["']title["']/);
  expect(source).not.toMatch(/role=["']display["']/);
});

it('p3g3 renders chapter names through the section header component', () => {
  expect(source).toMatch(/<SectionHeader\s+title=\{section\.title\}/);
});

it('p3g3 still finds chapter names and the unknown section on screen', async () => {
  const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
    nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
    confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses', switchCourse: 'Switch course', allTypes: 'All types',
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
        accessVisible: true, restrictions: false, completion: null },
      { id: 102, sectionId: 99, type: 'assign', name: 'Loose task',
        url: 'https://l.xmu.edu.my/mod/assign/view.php?id=102', visible: true, userVisible: true,
        accessVisible: true, restrictions: false, completion: null }] }] } };
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={snapshot} entry="current-native"
    onLogin={jest.fn()} onSync={jest.fn()} onCancel={jest.fn()} onChoose={jest.fn()}
    onModule={jest.fn()} onOriginal={jest.fn()} />);
  expect(view.getByText('Week one')).toBeTruthy();
  expect(view.getByText('Other section')).toBeTruthy();
});
