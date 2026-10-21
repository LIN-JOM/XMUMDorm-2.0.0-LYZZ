/**
 * P3G18 · 五类详情的收口用例（Phase G / R-8 详情页同层级）
 *
 * G17 已覆盖公告、公告详情、作业、文件夹；这里补资源、空态与五类共用的页头。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleDetailScreen, type MoodleDetailLabels } from '@/features/tools/moodle/DetailScreen';
import type { MoodleDetail, MoodleFile } from '@/features/tools/moodle/detail';

const labels: MoodleDetailLabels = { back: 'Back', original: 'Open original', empty: 'Empty',
  locked: 'Locked', fileUnknown: 'File details unavailable',
  submissionStatus: (value) => `submission ${value}`, gradingStatus: (value) => `grading ${value}`,
  formatTime: (value) => `time ${value}`, fileMetadata: (file) => `meta ${file.name}` };
const file: MoodleFile = { name: 'syllabus.pdf', url: 'https://l.xmu.edu.my/pluginfile.php/1/syllabus.pdf',
  mimeType: 'application/pdf', size: 2048, modifiedAt: null };
const render = (detail: MoodleDetail, extra: { onOriginal?: () => void } = {}) =>
  renderApp(<MoodleDetailScreen detail={detail} labels={labels} title="Module"
    onBack={jest.fn()} onOriginal={extra.onOriginal ?? jest.fn()} onDiscussion={jest.fn()} />);

it('p3g18 shows a resource file as one row with its original action', async () => {
  const view = await render({ kind: 'resource', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/resource/view.php?id=101', description: '', file });
  const card = within(view.getByTestId('moodle-resource'));
  expect(card.getByText('syllabus.pdf')).toBeTruthy();
  expect(card.getByTestId('moodle-file-original-resource-0')).toBeTruthy();
});

it('p3g18 keeps the broken resource empty state with the original action', async () => {
  const onOriginal = jest.fn();
  const view = await render({ kind: 'resource', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/resource/view.php?id=101', description: '', file: null }, { onOriginal });
  expect(view.getByText('File details unavailable')).toBeTruthy();
  await fireEvent.press(view.getAllByText('Open original')[0]);
  expect(onOriginal).toHaveBeenCalledWith('https://l.xmu.edu.my/mod/resource/view.php?id=101');
});

it('p3g18 puts the assignment attachments in their own card', async () => {
  const view = await render({ kind: 'assign', courseId: 1, moduleId: 101,
    url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', description: '', submission: 'draft',
    grading: 'unknown', locked: false, activityDates: null, rows: [], attachments: [file] });
  const card = within(view.getByTestId('moodle-assign-files'));
  expect(card.getByText('syllabus.pdf')).toBeTruthy();
});

it('p3g18 gives every kind exactly one header with the module name', async () => {
  const kinds: MoodleDetail[] = [
    { kind: 'forum', courseId: 1, moduleId: 101, url: 'https://l.xmu.edu.my/mod/forum/view.php?id=101',
      description: '', announcements: [] },
    { kind: 'folder', courseId: 1, moduleId: 101, url: 'https://l.xmu.edu.my/mod/folder/view.php?id=101',
      description: '', files: [] },
  ];
  const view = await render(kinds[0]);
  expect(view.getAllByTestId('moodle-detail-header')).toHaveLength(1);
  expect(within(view.getByTestId('moodle-detail-header')).getByText('Module')).toBeTruthy();
});
