import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native', nativeWorkspace: 'Native workspace',
  login: 'Login', sync: 'Sync', cancel: 'Cancel', confirmSelection: 'Confirm selection',
  chooseCourses: 'Choose courses', courses: 'Courses', allTypes: 'All types', empty: 'Empty',
  original: 'Original', details: 'Details', unknownSection: 'Other section',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const courses = [1, 2].map((id) => ({ id, name: `Course ${id}`, shortName: null,
  url: null, startDate: null, endDate: null, visible: true }));
const state: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: courses, selectedIds: [1, 2],
  data: { generation: 1, courses, events: [], states: [
    { courseId: 1, sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101, 102] }],
      modules: [{ id: 101, sectionId: 11, type: 'forum', name: 'Announcements',
        url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101', visible: true, userVisible: true, accessVisible: true },
      { id: 102, sectionId: 11, type: 'assign', name: 'Homework',
        url: 'https://l.xmu.edu.my/mod/assign/view.php?id=102', visible: true, userVisible: true, accessVisible: true }] },
    { courseId: 2, sections: [], modules: [] },
  ] } };

it('p3y3 browses course, type and section natively and opens a selected module', async () => {
  const onModule = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels} snapshot={state}
    entry="restored-native" onModule={onModule} onChoose={jest.fn()} onLogin={jest.fn()}
    onSync={jest.fn()} onCancel={jest.fn()} onOriginal={jest.fn()} />);
  expect(view.getByText('Restored native')).toBeTruthy();
  expect(view.getByText('Week one')).toBeTruthy();
  await fireEvent.press(view.getByTestId('moodle-type-assign'));
  expect(view.queryByText('Announcements')).toBeNull();
  await fireEvent.press(view.getByTestId('moodle-module-102'));
  expect(onModule).toHaveBeenCalledWith(1, expect.objectContaining({ id: 102, type: 'assign' }));
  await fireEvent.press(view.getByTestId('moodle-course-2'));
  expect(view.getByText('Empty')).toBeTruthy();
});

it('p3y3 gives first login and full candidate selection distinct actions', async () => {
  const onChoose = jest.fn();
  const onLogin = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen labels={labels}
    snapshot={{ ...state, phase: 'choosing', selectedIds: [], data: { generation: 1, courses: [], states: [], events: [] } }}
    entry="first-login" onModule={jest.fn()} onChoose={onChoose} onLogin={onLogin}
    onSync={jest.fn()} onCancel={jest.fn()} onOriginal={jest.fn()} />);
  expect(view.getByText('First login')).toBeTruthy();
  await fireEvent.press(view.getByTestId('moodle-login'));
  expect(onLogin).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByTestId('moodle-select-2'));
  await fireEvent.press(view.getByTestId('moodle-confirm-selection'));
  expect(onChoose).toHaveBeenCalledWith([2]);
});

