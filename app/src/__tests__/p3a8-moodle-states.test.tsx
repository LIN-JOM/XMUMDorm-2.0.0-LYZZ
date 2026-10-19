/**
 * P3A8 · Moodle 屏级四态与空态动作（审计 P-10 / D-10）
 *
 * 宪法 10.1/10.2/10.5-5：每屏要有加载/空/错误/无网四态；空态必须给一个动作。
 */
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { act, fireEvent } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';

import { MoodleDetailScreen } from '@/features/tools/moodle/DetailScreen';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';
import { renderApp } from './helpers/renderApp';

const labels: MoodleWorkspaceLabels = {
  firstLogin: 'Login', restoredNative: 'Restored', nativeWorkspace: 'Native', login: 'Login',
  sync: 'Sync', cancel: 'Cancel', confirmSelection: 'Confirm', chooseCourses: 'Choose',
  courses: 'Courses', allTypes: 'All types', empty: 'Empty', original: 'Original', details: 'Details',
  unknownSection: 'Other', maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}`,
};
const course = { id: 1, name: 'Course', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const section = { id: 1, number: 1, title: 'Week 1', moduleIds: [101], url: null, visible: true, current: false };
const module = { id: 101, sectionId: 1, type: 'assign', name: 'Homework',
  url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', visible: true, userVisible: true,
  accessVisible: true, restrictions: false, completion: null };
const snapshot = (courses: (typeof course)[], modules: (typeof module)[] = [module]): MoodleSyncSnapshot => ({
  phase: 'ready', failure: null, candidates: courses, selectedIds: courses.map((item) => item.id),
  data: { generation: 1, courses, events: [], states: modules.length
    ? [{ courseId: 1, sections: [section], modules }] : [] },
});

afterEach(() => { onlineManager.setOnline(true); });

it('p3a8 shows offline copy and clears it when back online', async () => {
  onlineManager.setOnline(false);
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={snapshot([course])}
    entry="current-native" onLogin={jest.fn()} onSync={jest.fn()} onCancel={jest.fn()}
    onChoose={jest.fn()} onModule={jest.fn()} onOriginal={jest.fn()} />);
  expect(view.getByTestId('moodle-offline')).toBeTruthy();
  await act(async () => { onlineManager.setOnline(true); });
  expect(view.queryByTestId('moodle-offline')).toBeNull();
});

it('p3a8 empty course list offers the sync action', async () => {
  const onSync = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={snapshot([], [])}
    entry="current-native" onLogin={jest.fn()} onSync={onSync} onCancel={jest.fn()}
    onChoose={jest.fn()} onModule={jest.fn()} onOriginal={jest.fn()} />);
  await fireEvent.press(view.getAllByText('Sync')[view.getAllByText('Sync').length - 1]);
  expect(onSync).toHaveBeenCalledTimes(1);
});

it('p3a8 the workspace keeps one scroller and no self-made deadline height', () => {
  const root = path.resolve(__dirname, '..', 'features', 'tools', 'moodle');
  const host = fs.readFileSync(path.join(root, 'WorkspaceHost.tsx'), 'utf8');
  const screen = fs.readFileSync(path.join(root, 'WorkspaceScreen.tsx'), 'utf8');
  expect(host).not.toMatch(/space_6'\) \* 8/);
  expect(host).not.toContain('<ScrollView testID="moodle-deadlines"');
  expect(screen).toContain('{footer}');
});

it('p3a8 empty detail offers the original page action', async () => {
  const onOriginal = jest.fn();
  const url = 'https://l.xmu.edu.my/mod/forum/view.php?id=101';
  const view = await renderApp(<MoodleDetailScreen detail={{ kind: 'forum', courseId: 1, moduleId: 101,
    url, description: '', announcements: [] }} labels={{ back: 'Back', original: 'Open page', empty: 'Empty',
    locked: 'Locked', fileUnknown: 'Unknown', submissionStatus: (value) => value,
    gradingStatus: (value) => value, formatTime: (value) => String(value), fileMetadata: () => '' }}
  onBack={jest.fn()} onOriginal={onOriginal} onDiscussion={jest.fn()} />);
  expect(view.getByTestId('moodle-empty-original')).toBeTruthy();
  await fireEvent.press(view.getAllByText('Open page')[0]);
  expect(onOriginal).toHaveBeenCalledWith(url);
});
