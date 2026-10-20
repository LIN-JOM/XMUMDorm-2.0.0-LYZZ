/**
 * P3G8 · 章节卡（Phase G / R-5 章节成卡）
 *
 * 现状：章节是「卡外的分区标题 + 一张空壳卡」，标题与卡像两件东西。
 * 期望：一章节一张卡，卡头是章节名，卡内是模块行。
 */
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { fireEvent, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleWorkspaceScreen, type MoodleWorkspaceLabels } from '@/features/tools/moodle/WorkspaceScreen';
import type { MoodleSyncSnapshot } from '@/features/tools/moodle/sync';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'features', 'tools', 'moodle', 'WorkspaceScreen.tsx'), 'utf8');
const labels: MoodleWorkspaceLabels = { firstLogin: 'First login', restoredNative: 'Restored native',
  nativeWorkspace: 'Native workspace', login: 'Login', sync: 'Sync', cancel: 'Cancel',
  confirmSelection: 'Confirm', chooseCourses: 'Choose courses', courses: 'Courses',
  switchCourse: 'Switch course', allTypes: 'All types',
  empty: 'Empty', original: 'Original', details: 'Details', unknownSection: 'Other section',
  maintenance: 'Maintenance', offline: 'Offline',
  phase: (value) => `phase ${value}`, failure: (value) => `failure ${value}`, moduleType: (value) => `type ${value}` };
const course = { id: 1, name: 'Course one', shortName: null, url: null, startDate: null, endDate: null,
  visible: true, favourite: false, progress: null };
const module = (id: number, sectionId: number, name: string) => ({ id, sectionId, type: 'forum', name,
  url: `https://l.xmu.edu.my/mod/forum/view.php?id=${id}`, visible: true, userVisible: true,
  accessVisible: true, restrictions: false, completion: null });
const twoChapters: MoodleSyncSnapshot = { phase: 'ready', failure: null, candidates: [course], selectedIds: [1],
  data: { generation: 1, courses: [course], events: [], states: [{ courseId: 1, sections: [
    { id: 11, number: 1, title: 'Week one', moduleIds: [101, 102], url: null, visible: true, current: false },
    { id: 12, number: 2, title: 'Week two', moduleIds: [201], url: null, visible: true, current: false }],
    modules: [module(101, 11, 'Announcements'), module(102, 11, 'Slides'), module(201, 12, 'Reading')] }] } };
const oneChapter: MoodleSyncSnapshot = { ...twoChapters, data: { ...twoChapters.data, states: [{
  courseId: 1, sections: [{ id: 11, number: 1, title: 'Week one', moduleIds: [101, 102], url: null,
    visible: true, current: false }], modules: [module(101, 11, 'Announcements'), module(102, 11, 'Slides')] }] } };
const props = { labels, entry: 'current-native' as const, onLogin: jest.fn(), onSync: jest.fn(),
  onCancel: jest.fn(), onChoose: jest.fn(), onOriginal: jest.fn() };

it('p3g8 gives each chapter its own card', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={oneChapter} onModule={jest.fn()} />);
  expect(view.getByTestId('moodle-chapter-11')).toBeTruthy();
  expect(view.getAllByTestId(/^moodle-chapter-/)).toHaveLength(1);
});

it('p3g8 gives two chapters two cards', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={twoChapters} onModule={jest.fn()} />);
  expect(view.getAllByTestId(/^moodle-chapter-/)).toHaveLength(2);
  expect(view.getByTestId('moodle-chapter-12')).toBeTruthy();
});

it('p3g8 keeps the chapter name and its module rows inside the card', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={oneChapter} onModule={jest.fn()} />);
  const card = within(view.getByTestId('moodle-chapter-11'));
  expect(card.getByText('Week one')).toBeTruthy();
  expect(card.getByTestId('moodle-module-101')).toBeTruthy();
  expect(card.getByTestId('moodle-module-102')).toBeTruthy();
});

it('p3g8 still opens a module from inside the card', async () => {
  const onModule = jest.fn();
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={oneChapter} onModule={onModule} />);
  await fireEvent.press(view.getByTestId('moodle-module-102'));
  expect(onModule).toHaveBeenCalledWith(1, expect.objectContaining({ id: 102 }));
});

it('p3g8 renders the chapter name as the card header through the section header', () => {
  expect(source).toMatch(/<Card[\s\S]{0,240}<SectionHeader title=\{section\.title\}/);
});

it('p3g8 lets a long chapter name wrap instead of truncating', async () => {
  const view = await renderApp(<MoodleWorkspaceScreen {...props} snapshot={oneChapter} onModule={jest.fn()} />);
  expect(view.getByText('Week one').props.numberOfLines).toBe(2);
});
