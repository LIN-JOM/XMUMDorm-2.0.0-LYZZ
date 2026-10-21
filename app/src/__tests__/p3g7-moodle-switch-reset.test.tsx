/**
 * P3G7 · 切课后筛选归零（Phase G / R-3 课程切换一个控件）
 *
 * 现状：切课保留上一门课的类型筛选，用户会以为新课程没有内容。
 * 期望：切课后筛选回到「全部类型」，内容段换成新课程的章节。
 *
 * 滚动回内容段开头只在真机可见（测试环境没有真实滚动），见 G10。
 */
import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const courses = [{ id: 1, name: 'Course one', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null },
{ id: 2, name: 'Course two', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null }];
const snapshot: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: courses, selectedIds: [1, 2],
  data: { generation: 1, courses, events: [], states: [
    { courseId: 1, sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101], url: null,
      visible: true, current: false }], modules: [{ id: 101, sectionId: 11, type: 'assign', name: 'Homework one',
      url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] },
    { courseId: 2, sections: [{ id: 21, number: 1, title: 'Week two', moduleIds: [201], url: null,
      visible: true, current: false }], modules: [{ id: 201, sectionId: 21, type: 'forum', name: 'Announcements two',
      url: 'https://l.xmu.edu.my/mod/forum/view.php?id=201', visible: true, userVisible: true,
      accessVisible: true, restrictions: false, completion: null }] },
  ] } };

it('p3g7 returns the type filter to all types after a course switch', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={snapshot} entry="current-native"
    onLogin={jest.fn()} onSync={jest.fn()} onCancel={jest.fn()} onChoose={jest.fn()}
    onModule={jest.fn()} onOriginal={jest.fn()} />);
  await fireEvent.press(view.getByTestId('moodle-type-assign'));
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  await fireEvent.press(view.getByTestId('moodle-course-2'));
  expect(view.getByTestId('moodle-type-all').props.accessibilityState.selected).toBe(true);
  // 第二门课只有公告模块，作业芯片随之消失：筛选确实归零，而不是继承了上一门课的类型
  expect(view.queryByTestId('moodle-type-assign')).toBeNull();
});

it('p3g7 shows only the switched course chapter and module', async () => {
  const onModule = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={snapshot} entry="current-native"
    onLogin={jest.fn()} onSync={jest.fn()} onCancel={jest.fn()} onChoose={jest.fn()}
    onModule={onModule} onOriginal={jest.fn()} />);
  await fireEvent.press(view.getByTestId('moodle-switch-course'));
  await fireEvent.press(view.getByTestId('moodle-course-2'));
  expect(view.getByText('Week two')).toBeTruthy();
  expect(view.getByText('Announcements two')).toBeTruthy();
  expect(view.queryByText('Week one')).toBeNull();
  expect(onModule).not.toHaveBeenCalled();
});
