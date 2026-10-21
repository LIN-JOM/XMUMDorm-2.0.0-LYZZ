/**
 * P3G16 · 详情页页头一行（Phase G / R-8 详情页同层级）
 *
 * 现状：返回与原页各占一整行，正文从第三行才开始，页头没有标题。
 * 期望：一行页头 —— 返回图标、标题、原页图标。
 */
import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { renderApp } from './helpers/renderApp';
import { MoodleDetailScreen, type MoodleDetailLabels } from '@/features/tools/moodle/DetailScreen';
import type { MoodleDetail } from '@/features/tools/moodle/detail';

export const detailLabels: MoodleDetailLabels = { back: 'Back', original: 'Open original', empty: 'Empty',
  locked: 'Locked', fileUnknown: 'File details unavailable',
  submissionStatus: (value) => `submission ${value}`, gradingStatus: (value) => `grading ${value}`,
  formatTime: (value) => `time ${value}`, fileMetadata: (file) => `meta ${file.name}` };
const assign: MoodleDetail = { kind: 'assign', courseId: 1, moduleId: 101,
  url: 'https://l.xmu.edu.my/mod/assign/view.php?id=101', description: 'Read chapter one',
  submission: 'submitted', grading: 'not-graded', locked: false, rows: [], activityDates: null, attachments: [] };

it('p3g16 renders one header row holding back and original', async () => {
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={detailLabels} title="Homework"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  const header = within(view.getByTestId('moodle-detail-header'));
  expect(header.getByTestId('moodle-detail-back')).toBeTruthy();
  expect(header.getByTestId('moodle-detail-original')).toBeTruthy();
});

it('p3g16 shows the module name as the header title', async () => {
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={detailLabels} title="Homework"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  expect(within(view.getByTestId('moodle-detail-header')).getByText('Homework')).toBeTruthy();
});

it('p3g16 keeps the description below the header', async () => {
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={detailLabels} title="Homework"
    onBack={jest.fn()} onOriginal={jest.fn()} onDiscussion={jest.fn()} />);
  expect(view.getByText('Read chapter one')).toBeTruthy();
});

it('p3g16 calls back exactly once from the header action', async () => {
  const onBack = jest.fn();
  const onOriginal = jest.fn();
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={detailLabels} title="Homework"
    onBack={onBack} onOriginal={onOriginal} onDiscussion={jest.fn()} />);
  await fireEvent.press(view.getByTestId('moodle-detail-back'));
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onOriginal).not.toHaveBeenCalled();
});

it('p3g16 opens the original page from the header action', async () => {
  const onOriginal = jest.fn();
  const view = await renderApp(<MoodleDetailScreen detail={assign} labels={detailLabels} title="Homework"
    onBack={jest.fn()} onOriginal={onOriginal} onDiscussion={jest.fn()} />);
  await fireEvent.press(view.getByTestId('moodle-detail-original'));
  expect(onOriginal).toHaveBeenCalledWith(assign.url);
});
